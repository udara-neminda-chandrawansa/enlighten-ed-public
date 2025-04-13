import { useState, useEffect } from "react";
import db_con from "./dbconfig";
import Cookies from "js-cookie";

const getMyClasses = async () => {
  try {
    const { data, error } = await db_con
      .from("classrooms_students")
      .select("class_id, classrooms(classname)") // Select classname from classrooms
      .eq("student_id", JSON.parse(Cookies.get("auth"))["user_id"]);

    if (error) {
      console.log("Classes Loading error:", error.message);
      return { success: false, message: "Load Failed!" };
    }
    return { success: true, classes: data };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, message: "Something went wrong!" };
  }
};

const getMyExams = async (class_id, student_id) => {
  try {
    // First, get all exams for the class
    const { data: allExams, error } = await db_con
      .from("exams")
      .select(
        "exam_id, class_id, lecturer_id, exam_name, exam_type, exam_qs, created_at"
      )
      .eq("class_id", class_id)
      .order("exam_id", { ascending: true });

    if (error) {
      console.log("Exams Loading error:", error.message);
      return { success: false, message: "Load Failed!" };
    }

    // Get exams the student has already submitted (essay type)
    const { data: submittedEssayExams } = await db_con
      .from("essay_exams_students")
      .select("exam_id")
      .eq("student_id", student_id);

    // Get exams the student has already submitted (MCQ type)
    const { data: submittedMcqExams } = await db_con
      .from("mcq_exams_students")
      .select("exam_id")
      .eq("student_id", student_id);

    // Create a set of submitted exam IDs for efficient lookup
    const submittedExamIds = new Set([
      ...submittedEssayExams.map(exam => exam.exam_id),
      ...submittedMcqExams.map(exam => exam.exam_id)
    ]);

    // Filter out exams that have been submitted
    const availableExams = allExams.filter(
      exam => !submittedExamIds.has(exam.exam_id)
    );

    return { success: true, exams: availableExams };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, message: "Something went wrong!" };
  }
};

const saveMCQExamResults = async (examId, studentId, marks) => {
  try {
    const { data, error } = await db_con.from("mcq_exams_students").insert([
      {
        exam_id: examId,
        student_id: studentId,
        marks: marks,
      },
    ]);

    if (error) {
      console.log("Error saving results:", error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error saving results:", error);
    return false;
  }
};

const saveEssayExamResults = async (examId, studentId, analysis) => {
  try {
    const { data, error } = await db_con.from("essay_exams_students").insert([
      {
        exam_id: examId,
        student_id: studentId,
        analysis: analysis,
      },
    ]);

    if (error) {
      console.log("Error saving results:", error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error saving results:", error);
    return false;
  }
};

function ExamPortal() {
  const [myClasses, setMyClasses] = useState([]); // registered classes list
  const [myExams, setMyExams] = useState([]);
  const [selectedClass, setSelectedClass] = useState(0);
  const [currentMCQQuestion, setCurrentMCQQuestion] = useState({
    question: "",
    answers: ["", "", "", ""],
    correctAnswer: 0,
    exam_id: 0,
  });
  const [currentEssayQuestion, setCurrentEssayQuestion] = useState("");
  const [questions, setQuestions] = useState([]); // Store all questions
  const [currentExamID, setCurrentExamID] = useState(0); // Store current exam id
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0); // Track current question index
  const [selectedAnswersMCQ, setSelectedAnswersMCQ] = useState([]); // Track selected answers (mcq)
  const [currentEssayAnswer, setCurrentEssayAnswer] = useState(""); // answer to the current essay qs
  const [submittedEssayAnswers, setSubmittedEssayAnswers] = useState([]); // Track submitted answers (essay)
  const [examCompleted, setExamCompleted] = useState(false); // Track if exam is completed

  const [analysingSpaceVisible, setAnalysingSpaceVisible] = useState(false);

  const [response, setResponse] = useState(""); // AI response to essay exams

  useEffect(() => {
    const fetchMyClasses = async () => {
      const result = await getMyClasses();
      if (result.success) {
        setMyClasses(result.classes);
      } else {
        console.log("Message:", result.message);
      }
    };

    fetchMyClasses();
  }, []);

  useEffect(() => {
    const fetchMyExams = async () => {
      const result = await getMyExams(selectedClass, JSON.parse(Cookies.get("auth"))["user_id"]);
      if (result.success) {
        setMyExams(result.exams);
      } else {
        console.log("Message:", result.message);
      }
    };

    fetchMyExams();
  }, [selectedClass]);

  // Load exam questions and open modal
  const loadExamQuestions = (exam) => {
    const parsedQuestions = JSON.parse(exam.exam_qs);
    const examType = exam.exam_type;
    if (parsedQuestions.length > 0) {
      setQuestions(parsedQuestions);
      setCurrentExamID(exam.exam_id);
      setCurrentQuestionIndex(0);
      if (examType === "mcq") {
        setCurrentMCQQuestion(parsedQuestions[0]);
        setSelectedAnswersMCQ([]); // Reset selected answers
        setExamCompleted(false); // Reset exam completion state
        document.getElementById("mcqModal").showModal();
      } else if (examType === "essay") {
        setCurrentEssayQuestion(parsedQuestions[0]);
        setSubmittedEssayAnswers([]); // Reset submitted answers
        setExamCompleted(false); // Reset exam completion state
        document.getElementById("essayModal").showModal();
      }
    }
  };

  // Handle selecting an answer
  const handleSelectAnswer = (index) => {
    const updatedAnswers = [...selectedAnswersMCQ];
    updatedAnswers[currentQuestionIndex] = index;
    setSelectedAnswersMCQ(updatedAnswers);
  };

  // Load next mcq question
  const loadNextMCQQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      setCurrentMCQQuestion(questions[nextIndex]);
    } else {
      setExamCompleted(true); // Mark exam as completed
      calculateAndSaveResults();
      document.getElementById("mcqModal").close(); // Close modal if no more questions
    }
  };

  useEffect(() => {
    if (examCompleted) {
      markAndSaveResults();
    }
  }, [submittedEssayAnswers]);

  // Load next essay question
  const loadNextEssayQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;

      setSubmittedEssayAnswers((prevAnswers) => [
        ...prevAnswers,
        currentEssayAnswer,
      ]);

      setCurrentQuestionIndex(nextIndex);
      setCurrentEssayQuestion(questions[nextIndex]);
      setCurrentEssayAnswer(""); // Clear input field
    } else {
      setSubmittedEssayAnswers((prevAnswers) => [
        ...prevAnswers,
        currentEssayAnswer,
      ]);

      setExamCompleted(true); // Trigger useEffect to call markAndSaveResults
      document.getElementById("essayModal").close();
    }
  };

  // Calculate and save results (mcq)
  const calculateAndSaveResults = async () => {
    let correctAnswersCount = 0;

    // Count correct answers
    selectedAnswersMCQ.forEach((selectedAnswer, index) => {
      if (selectedAnswer === questions[index].correctAnswer) {
        correctAnswersCount += 1;
      }
    });

    const percentage = (correctAnswersCount / questions.length) * 100;
    const studentId = JSON.parse(Cookies.get("auth"))["user_id"];
    const examId = currentExamID; // Assuming exam_id is the same for all questions
    const resultSaved = await saveMCQExamResults(examId, studentId, percentage);
    if (resultSaved) {
      alert(
        `Your score: ${correctAnswersCount} / ${
          questions.length
        } (${percentage.toFixed(2)}%)`
      );
    } else {
      alert("There was an error saving your results.");
    }
  };

  // mark and save results (essay)
  const markAndSaveResults = async () => {
    setAnalysingSpaceVisible(true);
    if (!Array.isArray(questions) || !Array.isArray(submittedEssayAnswers)) {
      setResponse("Error: Invalid data format.");
      return;
    }

    if (questions.length !== submittedEssayAnswers.length) {
      setResponse("Error: Invalid data length.");
      return;
    }

    const payload = {
      message: `Analyse and mark these answers out of 100%. (Full marks % = Marks % for each questions added together) ${questions
        .map(
          (q, i) =>
            `Q${i + 1}: ${q} A${i + 1}: ${
              submittedEssayAnswers[i] || "No answer"
            }`
        )
        .join(" | ")}`,
    };

    console.log("Sending to API:", payload); // Debugging

    handleMarking(payload);
  };

  const handleMarking = async (payload) => {
    setResponse("");
    console.log("Payload in handleMarking method: ", payload);

    try {
      const res = await fetch("https://enlighten-ed.onrender.com/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      console.log(JSON.stringify(payload));

      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const data = await res.json();

      setResponse(data.reply);
    } catch (error) {
      console.error("Error fetching response:", error);
      setResponse("Error fetching response.");
    }
  };

  const handleSavingEssayMarks = async () => {
    const studentId = JSON.parse(Cookies.get("auth"))["user_id"];

    // save marking
    const resultSaved = await saveEssayExamResults(
      currentExamID,
      studentId,
      response
    );

    if (resultSaved) {
      alert("Marking Saved Successfully!");
    }
  };

  return (
    <div>
      <div>
        {!analysingSpaceVisible && (
          <>
            <h1 className="font-semibold">My Classes</h1>
            <ul className="flex flex-col gap-2 mt-4">
              {myClasses.map((class_item, index) => (
                <li
                  key={index}
                  className="flex gap-2 pt-2 border-t sm:items-center max-sm:flex-col"
                >
                  <p className="font-semibold">{class_item.class_id}.</p>
                  {class_item.classrooms.classname}
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => setSelectedClass(class_item.class_id)}
                  >
                    Show Exams
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {!analysingSpaceVisible && (
          <div className="mt-2">
            <p className="font-semibold">Exam Space</p>
            {selectedClass !== 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {myExams.length > 0 ? (
                  myExams.map((exam, index) => (
                    <button
                      className="btn btn-sm"
                      key={index}
                      onClick={() => loadExamQuestions(exam)}
                    >
                      Answer {exam.exam_name}
                    </button>
                  ))
                ) : (
                  <p>No Exams yet...</p>
                )}
              </div>
            )}
          </div>
        )}

        {analysingSpaceVisible && (
          <div className="">
            <p className="font-semibold">Exam Marking Space</p>
            {questions.length > 0 && (
              <ol className="flex flex-col gap-3 mt-2">
                {questions.map((qs, index) => (
                  <li className="text-justify" key={index}>
                    <strong>Q{index + 1}:</strong> {qs}
                    <br />
                    <strong>A{index + 1}:</strong>{" "}
                    {submittedEssayAnswers[index] || "No answer yet"}
                  </li>
                ))}
              </ol>
            )}
            <p className="mt-4 text-justify">
              {response ? (
                <div>
                  <p>{response}</p>
                  <button className="mt-2 btn" onClick={handleSavingEssayMarks}>
                    Save Results
                  </button>
                </div>
              ) : (
                <span className="loading loading-dots loading-lg"></span>
              )}
            </p>
          </div>
        )}
      </div>

      {/*mcq modal*/}
      <dialog id="mcqModal" className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-bold">New Question</h3>
          <div className="flex flex-col gap-3 pt-4">
            <p>{currentMCQQuestion.question}</p>
            {currentMCQQuestion.answers.map((answer, index) => (
              <span key={index} className="flex items-center gap-2">
                <input
                  type="radio"
                  className="radio radio-success"
                  name="ans"
                  onChange={() => handleSelectAnswer(index)}
                  checked={selectedAnswersMCQ[currentQuestionIndex] === index}
                />
                <p>{answer}</p>
              </span>
            ))}
          </div>
          <div className="modal-action">
            {examCompleted ? (
              <button className="btn" onClick={() => window.location.reload()}>
                Finish
              </button>
            ) : (
              <button className="btn" onClick={loadNextMCQQuestion}>
                Next Question
              </button>
            )}
          </div>
          <form method="dialog">
            <button className="absolute btn btn-sm btn-circle btn-ghost right-2 top-2">
              ✕
            </button>
          </form>
        </div>
      </dialog>
      {/*essay modal*/}
      <dialog id="essayModal" className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-bold">New Question</h3>
          <div className="flex flex-col gap-3 pt-4">
            <p>{currentEssayQuestion}</p>
            <textarea
              className="textarea textarea-bordered"
              value={currentEssayAnswer}
              onChange={(e) => setCurrentEssayAnswer(e.target.value)}
              placeholder="Type your answer here..."
            ></textarea>
          </div>
          <div className="modal-action">
            {examCompleted ? (
              <button className="btn" onClick={() => window.location.reload()}>
                Finish
              </button>
            ) : (
              <button className="btn" onClick={loadNextEssayQuestion}>
                Next Question
              </button>
            )}
          </div>
          <form method="dialog">
            <button className="absolute btn btn-sm btn-circle btn-ghost right-2 top-2">
              ✕
            </button>
          </form>
        </div>
      </dialog>
    </div>
  );
}

export default ExamPortal;
