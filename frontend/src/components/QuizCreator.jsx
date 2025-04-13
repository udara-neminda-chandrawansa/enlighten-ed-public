import { useState, useEffect } from "react";
import db_con from "./dbconfig";
import Cookies from "js-cookie";

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

const getMyQuizzes = async () => {
  try {
    const { data, error } = await db_con
      .from("quizzes")
      .select(
        `
          quiz_id, 
          class_id, 
          lecturer_id, 
          quiz_name, 
          quiz_qs, 
          created_at, 
          users!inner(user_id, username, email),
          classrooms!inner(class_id, classname)
        `
      )
      .eq("lecturer_id", JSON.parse(Cookies.get("auth"))["user_id"])
      .order("quiz_id", { ascending: true });

    if (error) {
      console.log("Quizzes Loading error:", error.message);
      return { success: false, message: "Load Failed!" };
    }
    return { success: true, quizzes: data };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, message: "Something went wrong!" };
  }
};

const saveQuiz = async (class_id, lecturer_id, quiz_name, quiz_qs) => {
  try {
    // save quiz
    const { data, error } = await db_con
      .from("quizzes")
      .insert([{ class_id, lecturer_id, quiz_name, quiz_qs }])
      .select()
      .single();

    if (error) {
      console.log("Save error:", error.message);
      return { success: false, message: "Save Failed!" };
    }

    return { success: true, quiz: data };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, message: "Something went wrong!" };
  }
};

const saveChallenge = async (
  quiz_id,
  challenge_type,
  challenge_goal,
  challenge_reward
) => {
  try {
    // save challenge
    const { data, error } = await db_con
      .from("challenges")
      .insert([
        {
          quiz_id,
          challenge_type,
          challenge_goal,
          challenge_reward,
        },
      ])
      .select()
      .single();

    if (error) {
      console.log("Save error:", error.message);
      return { success: false, message: "Save Failed!" };
    }

    return { success: true, challenge: data };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, message: "Something went wrong!" };
  }
};

function QuizCreator() {
  const [myClasses, setMyClasses] = useState([]); // list of classes
  const [myQuizzes, setMyQuizzes] = useState([]);
  const [quizName, setQuizName] = useState("");
  const [selectedClass, setSelectedClass] = useState(0);
  const [qsCount, setQsCount] = useState(1);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentQsIndex, setCurrentQsIndex] = useState(0);
  const [currentQuizQuestion, setCurrentQuizQuestion] = useState({
    question: "",
    answers: ["", "", "", ""],
    correctAnswer: 0,
  });

  const [createBtnDisabled, disableCreateBtn] = useState(false);
  const [challengeType, setChallengeType] = useState("time-based");
  const [challengeGoal, setChallengeGoal] = useState(1);
  const [challengeReward, setChallengeReward] = useState(1);
  const [challengeAvailable, setChallengeAvailable] = useState(false);

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

    const fetchMyQuizzes = async () => {
      const result = await getMyQuizzes();
      if (result.success) {
        setMyQuizzes(result.quizzes);
      } else {
        console.log("Message:", result.message);
      }
    };

    fetchMyQuizzes();
  }, []);

  const handleAddQuizQuestion = () => {
    setQuizQuestions((prevQuestions) => {
      const updatedQuestions = [...prevQuestions, currentQuizQuestion];
      // console.log("Updated Questions:", updatedQuestions); // Correctly logs updated list
      return updatedQuestions;
    });

    setCurrentQuizQuestion({
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
        disableCreateBtn(true);
      }, 100);
    }
  };

  const handleQuizSaving = async () => {
    const response = await saveQuiz(
      selectedClass,
      JSON.parse(Cookies.get("auth"))["user_id"],
      quizName,
      JSON.stringify(quizQuestions)
    );

    if (response.success) {
      if (challengeAvailable) {
        const response2 = await saveChallenge(
          response.quiz.quiz_id,
          challengeType,
          challengeGoal,
          challengeReward
        );

        if (!response2.success) {
          alert("Challenge Saving Failed!");
        }
      }

      alert("Quiz Creation Success! Page will be reloaded now.");
      window.location.reload();
    } else {
      alert("Quiz Creation Failed!");
      // window.location.reload();
    }
  };

  return (
    <div className="">
      <h3 className="mb-4 text-xl font-semibold">Create New Quiz</h3>
      <div className="flex flex-col gap-4">
        <p>Quiz Name</p>
        <input
          type="text"
          className="w-full input input-bordered"
          placeholder="Enter Quiz Name"
          value={quizName}
          onChange={(e) => setQuizName(e.target.value)}
        />
        <p>Quiz Question Count</p>
        <input
          type="number"
          name="qsCount"
          className="w-full input input-bordered"
          value={qsCount}
          onChange={(e) => setQsCount(parseInt(e.target.value) || 1)}
          placeholder="Question Count"
          min={1}
          max={10}
        />
        <p>Quiz for</p>
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
        <span className="flex flex-wrap gap-4">
          <button
            className="btn btn-primary w-fit"
            onClick={() => document.getElementById("qsModal").showModal()}
            disabled={createBtnDisabled}
          >
            Create Quiz Questionnaire
          </button>
          {quizQuestions.length > 0 && (
            <span className="flex flex-wrap items-center gap-4">
              <button
                className="btn btn-info w-fit"
                onClick={() =>
                  document.getElementById("challengeModal").showModal()
                }
              >
                Create a Challenge
              </button>
              <button
                className="btn btn-secondary w-fit"
                onClick={() => handleQuizSaving()}
              >
                Save Quiz
              </button>
            </span>
          )}
        </span>
        {/*table for quiz exams (current quiz)*/}
        {quizQuestions.length > 0 && (
          <div className="overflow-x-auto border">
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
                {quizQuestions.map((question, index) => (
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
        {/*table for quiz exams (prev saved ones)*/}
        {myQuizzes.length > 0 && (
          <>
            <h3 className="text-xl font-semibold">Your Saved Quizzes</h3>
            <div className="overflow-x-auto border">
              <table className="table table-zebra">
                {/* Table Head */}
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Quiz Name</th>
                    <th>For Class</th>
                  </tr>
                </thead>
                {/* Table Body */}
                <tbody>
                  {myQuizzes.map((quiz, index) => (
                    <tr key={index}>
                      <th>{index + 1}</th>
                      <td>{quiz.quiz_name}</td>
                      <td>{quiz.classrooms.classname}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/*qs modal*/}
      <dialog id="qsModal" className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-bold">New Question</h3>

          <p className="flex flex-col gap-3 pt-4">
            <input
              type="text"
              className="w-full input input-bordered"
              placeholder="Question?"
              value={currentQuizQuestion.question}
              onChange={(e) =>
                setCurrentQuizQuestion({
                  ...currentQuizQuestion,
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
                  checked={currentQuizQuestion.correctAnswer === index}
                  onChange={() =>
                    setCurrentQuizQuestion({
                      ...currentQuizQuestion,
                      correctAnswer: index,
                    })
                  }
                />
                <input
                  type="text"
                  className="w-full input input-bordered"
                  placeholder={`Answer ${index + 1}`}
                  value={currentQuizQuestion.answers[index]}
                  onChange={(e) => {
                    const newAnswers = [...currentQuizQuestion.answers];
                    newAnswers[index] = e.target.value;
                    setCurrentQuizQuestion({
                      ...currentQuizQuestion,
                      answers: newAnswers,
                    });
                  }}
                />
              </span>
            ))}
          </p>

          <div className="modal-action">
            <form method="dialog">
              <button className="btn" onClick={handleAddQuizQuestion}>
                Add Question
              </button>
            </form>
          </div>
        </div>
      </dialog>

      {/*challenge modal*/}
      <dialog id="challengeModal" className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-bold">New Challenge</h3>

          <div className="pt-4 space-y-4">
            <div className="form-control">
              <label className="p-0 cursor-pointer label">
                <span className="">Time Based Challenge</span>
                <input
                  type="checkbox"
                  className="toggle"
                  value={challengeType === "time-based"}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setChallengeType("points-based");
                    } else {
                      setChallengeType("time-based");
                      
                    }
                  }}
                />
                <span className="">Points Based Challenge</span>
              </label>
            </div>

            <span className="flex items-center gap-2">
              <p className="text-nowrap">
                {challengeType === "time-based" ? "Time Based" : "Points Based"}
              </p>
              <input
                type="number"
                className="w-20 input input-bordered input-sm"
                placeholder="Challenge Goal"
                min={1}
                max={challengeType === "time-based" ? 5 : 100}
                value={challengeGoal}
                onChange={(e) => setChallengeGoal(e.target.value)}
              />
              <p className="">
                {challengeType === "time-based"
                  ? "minutes per quiz challenge"
                  : "points per quiz challenge"}
              </p>
            </span>
            <span className="flex items-center gap-2">
              <p className="text-nowrap">Reward (XP Points) </p>
              <input
                type="number"
                className="w-fit input input-bordered input-sm"
                min={1}
                max={1000}
                value={challengeReward}
                onChange={(e) => setChallengeReward(e.target.value)}
              />
            </span>
          </div>

          <div className="modal-action">
            <form method="dialog">
              <button
                className="btn"
                onClick={() => setChallengeAvailable(true)}
              >
                Add Challenge
              </button>
            </form>
          </div>
        </div>
      </dialog>
    </div>
  );
}

export default QuizCreator;
