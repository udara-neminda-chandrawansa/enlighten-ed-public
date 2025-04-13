import { useState, useEffect } from "react";
import db_con from "./dbconfig";
import Cookies from "js-cookie";
import AIChat from "./AIChat";

const getMyClasses = async () => {
  try {
    const { data, error } = await db_con
      .from("classrooms")
      .select("class_id, classname")
      .eq("lecturer_id", JSON.parse(Cookies.get("auth"))["user_id"]);

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

const getMyExams = async () => {
  try {
    const { data, error } = await db_con
      .from("exams")
      .select(
        "exam_id, class_id, lecturer_id, exam_name, exam_type, exam_qs, created_at, exam_deadline, classrooms!inner(class_id, classname)"
      )
      .eq("lecturer_id", JSON.parse(Cookies.get("auth"))["user_id"])
      .order("exam_id", { ascending: true });

    if (error) {
      console.log("Exams Loading error:", error.message);
      return { success: false, message: "Load Failed!" };
    }
    return { success: true, exams: data };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, message: "Something went wrong!" };
  }
};

const getExamMarkings = async (exam_id) => {
  try {
    // Get the exam type first to determine which table to query from
    const { data: examData, error: examError } = await db_con
      .from("exams")
      .select("exam_type")
      .eq("exam_id", exam_id)
      .single();

    if (examError) {
      console.log("Exam type fetch error:", examError.message);
      return { success: false, message: "Failed to determine exam type!" };
    }

    let data = [];
    let error = null;

    // Based on exam type, query the appropriate table with joins
    if (examData.exam_type === "essay") {
      const { data: essayData, error: essayError } = await db_con
        .from("essay_exams_students")
        .select(
          `
          analysis,
          created_at,
          student_id,
          exam_id,
          users(user_id, username, email),
          exams(exam_id, exam_name)
        `
        )
        .eq("exam_id", exam_id);

      data = essayData;
      error = essayError;
    } else if (examData.exam_type === "mcq") {
      const { data: mcqData, error: mcqError } = await db_con
        .from("mcq_exams_students")
        .select(
          `
          marks,
          created_at,
          student_id,
          exam_id,
          users(user_id, username, email),
          exams(exam_id, exam_name)
        `
        )
        .eq("exam_id", exam_id);

      data = mcqData;
      error = mcqError;
    } else {
      return {
        success: false,
        message: "Unknown exam type: " + examData.exam_type,
      };
    }

    if (error) {
      console.log("Exam markings fetch error:", error.message);
      return { success: false, message: "Failed to load exam markings!" };
    }

    // Format the results for consistent structure regardless of exam type
    const formattedData = data.map((item) => {
      return {
        student: {
          id: item.users?.user_id,
          name: item.users?.username,
          email: item.users?.email,
        },
        exam: {
          id: item.exams?.exam_id,
          name: item.exams?.exam_name,
        },
        result: examData.exam_type === "essay" ? item.analysis : item.marks,
        submitted_at: item.created_at,
      };
    });

    return {
      success: true,
      markings: formattedData,
      exam_type: examData.exam_type,
    };
  } catch (error) {
    console.error("Error fetching exam markings:", error);
    return { success: false, message: "Something went wrong!" };
  }
};

const saveExam = async (
  class_id,
  lecturer_id,
  exam_name,
  exam_type,
  exam_qs,
  exam_deadline
) => {
  try {
    // save exam
    const { data, error } = await db_con
      .from("exams")
      .insert([
        { class_id, lecturer_id, exam_name, exam_type, exam_qs, exam_deadline },
      ])
      .select()
      .single();

    if (error) {
      console.log("Save error:", error.message);
      return { success: false, message: "Save Failed!" };
    }

    return { success: true, exam: data };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, message: "Something went wrong!" };
  }
};

function ExamCreator() {
  const [myClasses, setMyClasses] = useState([]); // list of classes
  const [myExams, setMyExams] = useState([]); // list of exams
  const [selectedMCQQuestions, setSelectedMCQQuestions] = useState([]); // for displaying questions of a specific exam using a modal
  const [selectedEssayQuestions, setSelectedEssayQuestions] = useState([]); // for displaying questions of a specific exam using a modal
  // below data for creating and saving exams (used in form elements)
  const [examName, setExamName] = useState("");
  const [examType, setExamType] = useState("mcq");
  const [selectedClass, setSelectedClass] = useState(0);
  const [mcqQuestions, setMcqQuestions] = useState([]);
  const [qsCount, setQsCount] = useState(0);
  const [currentMCQQuestion, setCurrentMCQQuestion] = useState({
    question: "",
    answers: ["", "", "", ""],
    correctAnswer: 0,
  });
  const [currentEssayQuestion, setCurrentEssayQuestion] = useState("");
  const [essayQuestions, setEssayQuestions] = useState([]);
  const [currentQsIndex, setCurrentQsIndex] = useState(0);
  const [selectedDeadline, setSelectedDeadline] = useState("");

  const [selectedTab, setSelectedTab] = useState(0);

  const [selectedMarkingsData, setSelectedMarkingsData] = useState([]);

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

    const fetchMyExams = async () => {
      const result = await getMyExams();
      if (result.success) {
        setMyExams(result.exams);
      } else {
        console.log("Message:", result.message);
      }
    };

    fetchMyExams();
  }, [currentMCQQuestion]);

  const fetchGradesForOne = async (exam_id) => {
    const result = await getExamMarkings(exam_id);
    if (result.success) {
      setSelectedMarkingsData(result.markings);
      // console.log(result.markings);
    } else {
      console.log("Message:", result.message);
    }
  };

  const handleAddMcqQuestion = () => {
    setMcqQuestions((prevQuestions) => {
      const updatedQuestions = [...prevQuestions, currentMCQQuestion];
      // console.log("Updated Questions:", updatedQuestions); // Correctly logs updated list
      return updatedQuestions;
    });

    setCurrentMCQQuestion({
      question: "",
      answers: ["", "", "", ""],
      correctAnswer: 0,
    });

    if (currentQsIndex < qsCount - 1) {
      setCurrentQsIndex((prevIndex) => prevIndex + 1);

      setTimeout(() => {
        document.getElementById("qsModal").showModal();
      }, 100);
    } else {
      setTimeout(() => {
        document.getElementById("qsModal").close();
      }, 100);
    }
  };

  const handleAddEssayQuestion = () => {
    setEssayQuestions((prevQuestions) => {
      const updatedQuestions = [...prevQuestions, currentEssayQuestion];
      return updatedQuestions;
    });

    if (currentQsIndex < qsCount - 1) {
      setCurrentQsIndex((prevIndex) => prevIndex + 1);

      setTimeout(() => {
        document.getElementById("qsModal").showModal();
      }, 100);
    } else {
      setTimeout(() => {
        document.getElementById("qsModal").close();
      }, 100);
    }
  };

  const handleExamSave = async (event) => {
    event.preventDefault();
    const result = await saveExam(
      selectedClass,
      JSON.parse(Cookies.get("auth"))["user_id"],
      examName,
      examType,
      `${
        examType === "mcq"
          ? JSON.stringify(mcqQuestions)
          : JSON.stringify(essayQuestions)
      }`,
      selectedDeadline
    );

    if (result.success) {
      alert(`Save successful! The page will be reloaded now.`);
      window.location.reload();
    } else {
      alert(result.message);
    }
  };

  const SimpleFormattedResult = ({ resultText }) => {
    // Handle if resultText is an object
    if (typeof resultText === 'object') {
      resultText = JSON.stringify(resultText);
    }
    
    // Function to format the text
    const formatText = (text) => {
      // Replace markdown-style bold with HTML bold
      const boldFormatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      
      // Add breaks for better readability
      const withLineBreaks = boldFormatted
        // Add break after each score section
        .replace(/(\/100)/g, '$1<br/>')
        // Add break before "Total:"
        .replace(/(Total:)/g, '<br/>$1')
        // Add break before "Feedback:"
        .replace(/(---)/g, '<br/>$1')
        // Add break before each feedback point
        .replace(/(-\s\*\*Q\d+)/g, '<br/>$1');
      
      return withLineBreaks;
    };
    
    return (
      <span 
        className="whitespace-pre-line"
        dangerouslySetInnerHTML={{ __html: formatText(resultText) }}
      />
    );
  };

  return (
    <div>
      <div role="tablist" className="tabs tabs-boxed">
        <p
          role="tab"
          className={`max-sm:text-xs tab ${
            selectedTab === 0 ? "tab-active font-semibold" : ""
          }`}
          onClick={() => setSelectedTab(0)}
        >
          Create Exam
        </p>
        <p
          role="tab"
          className={`max-sm:text-xs tab ${
            selectedTab === 1 ? "tab-active font-semibold" : ""
          }`}
          onClick={() => setSelectedTab(1)}
        >
          View Exams
        </p>
        <p
          role="tab"
          className={`max-sm:text-xs tab ${
            selectedTab === 2 ? "tab-active font-semibold" : ""
          }`}
          onClick={() => setSelectedTab(2)}
        >
          AI Assistant
        </p>
      </div>

      {selectedTab === 0 && (
        <>
          <button
            className="mt-4 btn"
            onClick={() => {
              myClasses.length > 0
                ? document.getElementById("examDetailsModal").showModal()
                : alert(
                    "You don't have any classes yet! Add a class to create an exam"
                  );
            }}
          >
            {examType === "essay" &&
              (essayQuestions.length > 0 ? "Update Exam" : "Create Exam")}
            {examType === "mcq" &&
              (mcqQuestions.length > 0 ? "Update Exam" : "Create Exam")}
          </button>
          {/*save btn for mcq exams*/}
          {mcqQuestions.length > 0 && examType === "mcq" && (
            <button className="mt-4 ml-4 btn" onClick={handleExamSave}>
              Save MCQ Exam
            </button>
          )}
          {/*save btn for essay exams*/}
          {essayQuestions.length > 0 && examType === "essay" && (
            <button className="mt-4 ml-4 btn" onClick={handleExamSave}>
              Save Essay Exam
            </button>
          )}
          {/*clear btn for mcq exams*/}
          {mcqQuestions.length > 0 && examType === "mcq" && (
            <button
              className="mt-4 ml-4 btn"
              onClick={() => {
                setMcqQuestions([]);
                setExamName("");
              }}
            >
              Clear MCQ Exam
            </button>
          )}
          {/*clear btn for essay exams*/}
          {essayQuestions.length > 0 && examType === "essay" && (
            <button
              className="mt-4 ml-4 btn"
              onClick={() => {
                setEssayQuestions([]), setExamName("");
              }}
            >
              Clear Essay Exam
            </button>
          )}
          {/*display exam name*/}
          {examName !== "" && (
            <p className="mt-4">
              {" "}
              <strong>Exam Name:</strong> {examName}
            </p>
          )}
          {/*table for mcq exams*/}
          {mcqQuestions.length > 0 && examType === "mcq" && (
            <div className="mt-4 overflow-x-auto border">
              <table className="table table-zebra">
                {/* Table Head */}
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Question</th>
                    <th>Answer 1</th>
                    <th>Answer 2</th>
                    <th>Answer 3</th>
                    <th>Answer 4</th>
                    <th>Correct Answer</th>
                  </tr>
                </thead>
                {/* Table Body */}
                <tbody>
                  {mcqQuestions.map((question, index) => (
                    <tr key={index}>
                      <th>{index + 1}</th>
                      <td>{question.question}</td>
                      <td>{question.answers[0]}</td>
                      <td>{question.answers[1]}</td>
                      <td>{question.answers[2]}</td>
                      <td>{question.answers[3]}</td>
                      <td className="font-bold">
                        {question.answers[question.correctAnswer]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {/*list for essay exams*/}
          {essayQuestions.length > 0 && examType === "essay" && (
            <div className="mt-4">
              <h2 className="pb-2 font-semibold">Current Exam Questions</h2>
              <ol className="flex flex-col gap-2 list-decimal list-inside">
                {essayQuestions.map((question, index) => (
                  <li key={index}>{question}</li>
                ))}
              </ol>
            </div>
          )}
        </>
      )}

      {selectedTab === 1 && (
        <div className="mt-4 overflow-x-auto border">
          <table className="table table-zebra">
            {/* Table Head */}
            <thead>
              <tr>
                <th>#</th>
                <th>Exam Name</th>
                <th>Exam Type</th>
                <th>For Class</th>
                <th>Exam Questions</th>
                <th>Result Markings</th>
                <th>Created At</th>
                <th>Deadline</th>
              </tr>
            </thead>
            {/* Table Body */}
            <tbody>
              {myExams.map((exam, index) => (
                <tr key={index}>
                  <th>{index + 1}</th>
                  <td>{exam.exam_name}</td>
                  <td className="uppercase">{exam.exam_type}</td>
                  <td>{exam.classrooms.classname}</td>
                  <td>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => {
                        if (exam.exam_type === "mcq") {
                          setSelectedMCQQuestions(JSON.parse(exam.exam_qs));
                          document
                            .getElementById("examQsDisplayModal")
                            .showModal();
                        } else {
                          setSelectedEssayQuestions(JSON.parse(exam.exam_qs));
                          document
                            .getElementById("examQsDisplayModal2")
                            .showModal();
                        }
                      }}
                    >
                      View Questions
                    </button>
                  </td>
                  <td>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => {
                        fetchGradesForOne(exam.exam_id),
                          document
                            .getElementById("examResultsDisplayModal")
                            .showModal();
                      }}
                    >
                      View Markings
                    </button>
                  </td>
                  <td>{new Date(exam.created_at).toLocaleString()}</td>
                  <td>
                    {new Date(exam.exam_deadline).toLocaleString("en-US", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                      timeZone: "UTC", // Explicitly set to UTC to prevent local timezone conversion
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedTab === 2 && (
        <div className="mt-4 overflow-x-auto">
          <AIChat />
        </div>
      )}

      {/*qs modal*/}
      <dialog id="qsModal" className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-bold">New Question</h3>
          {examType === "mcq" && (
            <p className="flex flex-col gap-3 pt-4">
              <input
                type="text"
                className="w-full input input-bordered"
                placeholder="Question?"
                value={currentMCQQuestion.question}
                onChange={(e) =>
                  setCurrentMCQQuestion({
                    ...currentMCQQuestion,
                    question: e.target.value,
                  })
                }
              />
              {[0, 1, 2, 3].map((index) => (
                <span key={index} className="flex items-center gap-2">
                  <input
                    type="radio"
                    className="radio radio-success"
                    name="ans"
                    checked={currentMCQQuestion.correctAnswer === index}
                    onChange={() =>
                      setCurrentMCQQuestion({
                        ...currentMCQQuestion,
                        correctAnswer: index,
                      })
                    }
                  />
                  <input
                    type="text"
                    className="w-full input input-bordered"
                    placeholder={`Answer ${index + 1}`}
                    value={currentMCQQuestion.answers[index]}
                    onChange={(e) => {
                      const newAnswers = [...currentMCQQuestion.answers];
                      newAnswers[index] = e.target.value;
                      setCurrentMCQQuestion({
                        ...currentMCQQuestion,
                        answers: newAnswers,
                      });
                    }}
                  />
                </span>
              ))}
            </p>
          )}
          {examType === "essay" && (
            <div className="pt-4">
              <textarea
                className="w-full textarea textarea-bordered"
                placeholder="Question?"
                value={currentEssayQuestion}
                onChange={(e) => setCurrentEssayQuestion(e.target.value)}
              />
            </div>
          )}
          <div className="modal-action">
            <form method="dialog">
              <button
                className="btn"
                onClick={
                  examType === "mcq"
                    ? handleAddMcqQuestion
                    : handleAddEssayQuestion
                }
              >
                Add Question
              </button>
            </form>
          </div>
        </div>
      </dialog>
      {/*exam details modal*/}
      <dialog id="examDetailsModal" className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-bold">New Exam</h3>
          <div className="flex flex-col gap-6 py-4">
            <input
              type="text"
              className="w-full input input-bordered"
              placeholder="Exam Name"
              value={examName}
              onChange={(e) => setExamName(e.target.value)}
            />

            <span className="flex items-center gap-3">
              <p>Exam Type</p>
              <input
                type="radio"
                name="exa_type"
                onClick={() => setExamType("mcq")}
                defaultChecked
                className="radio"
              />
              MCQ
              <input
                type="radio"
                name="exa_type"
                onClick={() => setExamType("essay")}
                className="radio"
              />
              Essay
            </span>
            <select
              name="vclass"
              className="select select-bordered"
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                console.log(e.target.value);
              }}
            >
              <option value="0" defaultValue>
                Select a class
              </option>
              {myClasses.length > 0 ? (
                myClasses.map((vclass) => (
                  <option key={vclass.class_id} value={vclass.class_id}>
                    {vclass.class_id} - {vclass.classname}
                  </option>
                ))
              ) : (
                <option value="0">You have no classes!</option>
              )}
            </select>
            <span className="flex items-center gap-3">
              <p className="text-nowrap">No of Qs</p>

              <input
                type="number"
                name="qsCount"
                className="w-full input input-bordered"
                min={1}
                max={30}
                value={qsCount}
                onChange={(e) => setQsCount(parseInt(e.target.value) || 1)}
                placeholder="Number of Questions"
              />
            </span>
            <span className="flex items-center gap-3">
              <p className="text-nowrap">Deadline</p>
              <input
                type="datetime-local"
                className="w-full input input-bordered"
                value={selectedDeadline}
                onChange={(e) => setSelectedDeadline(e.target.value)}
                required
              />
            </span>
          </div>
          <div className="modal-action">
            <form method="dialog">
              <button className="absolute btn btn-sm btn-circle btn-ghost right-2 top-2">
                ✕
              </button>
              <button
                className="btn"
                onClick={() => {
                  document.getElementById("qsModal").showModal();
                  setCurrentQsIndex(0); // Reset the question index
                }}
              >
                {examType === "essay" &&
                  (essayQuestions.length > 0
                    ? "Add More Questions"
                    : "Create Exam")}
                {examType === "mcq" &&
                  (mcqQuestions.length > 0
                    ? "Add More Questions"
                    : "Create Exam")}
              </button>
            </form>
          </div>
        </div>
      </dialog>
      {/*exam questions display modal*/}
      <dialog id="examQsDisplayModal" className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-bold">Questions</h3>
          {selectedMCQQuestions.map((q, index) => (
            <div key={index} className="mt-4">
              <p>
                <strong>Q{index + 1}:</strong> {q.question}
              </p>
              <ul>
                {q.answers.map((answer, i) => (
                  <li
                    key={i}
                    className={`${
                      q.correctAnswer === i
                        ? "font-semibold text-green-800 underline"
                        : ""
                    }`}
                  >
                    {answer}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
      {/*exam questions display modal 2 (for essay qs)*/}
      <dialog id="examQsDisplayModal2" className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-bold">Questions</h3>
          {selectedEssayQuestions.map((q, index) => (
            <div key={index} className="mt-4">
              <p>
                <strong>Q{index + 1}:</strong> {q}
              </p>
            </div>
          ))}
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
      {/*exam results display modal*/}
      <dialog id="examResultsDisplayModal" className="modal">
        <div className="w-11/12 max-w-4xl modal-box">
          <h3 className="text-lg font-bold">Exam Results</h3>
          <div className="mt-4 overflow-x-auto border">
            <table className="table table-zebra">
              {/* Table Head */}
              <thead>
                <tr>
                  <th>#</th>
                  <th>Exam Name</th>
                  <th>Student</th>
                  <th>Marks / Analysis</th>
                  <th>Created At</th>
                </tr>
              </thead>
              {/* Table Body */}
              <tbody>
                {selectedMarkingsData.map((marking, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>{marking.exam.name}</td>
                    <td>{marking.student.name}</td>
                    <td className="p-0">
                      <p className="max-h-[200px] overflow-y-auto text-justify p-2">
                       <SimpleFormattedResult resultText={marking.result}/>
                      </p>
                    </td>
                    <td>{new Date(marking.submitted_at).toLocaleString()}</td>
                  </tr>
                ))}
                {selectedMarkingsData.length === 0 && (
                  <tr>
                    <td colSpan="6" className="py-4 text-center">
                      No data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </div>
  );
}

export default ExamCreator;
