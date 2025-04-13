import { useEffect, useState } from "react";
import crown from "../assets/crown.png";
import db_con from "./dbconfig";
import Cookies from "js-cookie";
import Leaderboards from "./Leaderboards";

const getMyClasses = async () => {
  try {
    const { data, error } = await db_con
      .from("classrooms_students")
      .select("class_id")
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

const getMyQuizzes = async (classIDs) => {
  try {
    // First, get the student's ID from the authentication cookie
    const studentId = JSON.parse(Cookies.get("auth"))["user_id"];

    // First, fetch the quizzes the student has already submitted
    const { data: submittedQuizzes, error: submissionError } = await db_con
      .from("quiz_submissions")
      .select("quiz_id")
      .eq("student_id", studentId);

    if (submissionError) {
      console.log("Submission Loading error:", submissionError.message);
      return { success: false, message: "Load Failed!" };
    }

    // Extract the IDs of submitted quizzes
    const submittedQuizIds = submittedQuizzes.map(
      (submission) => submission.quiz_id
    );

    // Now fetch all quizzes in the student's classes
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
            classrooms!inner(class_id, classname),
            challenges(challenge_id, quiz_id, challenge_type, challenge_goal, challenge_reward, created_at)
          `
      )
      .in("class_id", classIDs)
      .order("quiz_id", { ascending: true });

    if (error) {
      console.log("Quizzes Loading error:", error.message);
      return { success: false, message: "Load Failed!" };
    }

    // Filter out submitted quizzes client-side
    const unsubmittedQuizzes = data.filter(
      (quiz) => !submittedQuizIds.includes(quiz.quiz_id)
    );

    return { success: true, quizzes: unsubmittedQuizzes };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, message: "Something went wrong!" };
  }
};

const getQuizzResults = async () => {
  try {
    const { data, error } = await db_con
      .from("quiz_submissions")
      .select(
        `
          submission_id,
          quiz_id, 
          student_id, 
          marks, 
          created_at, 
          users!inner(user_id, username, email, xp_points),
          quizzes!inner(quiz_id, quiz_name)
        `
      )
      .order("quiz_id", { ascending: true });

    if (error) {
      console.log("Quizz Results Loading error:", error.message);
      return { success: false, message: "Load Failed!" };
    }
    return { success: true, qresults: data };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, message: "Something went wrong!" };
  }
};

const saveQuizResults = async (quizId, studentId, marks) => {
  try {
    const { data, error } = await db_con.from("quiz_submissions").insert([
      {
        quiz_id: quizId,
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

const saveChallengePoints = async (points) => {
  try {
    // First, get the current XP points
    const { data: userData, error: fetchError } = await db_con
      .from("users")
      .select("xp_points")
      .eq("user_id", JSON.parse(Cookies.get("auth"))["user_id"])
      .single();

    if (fetchError) {
      console.log("Error fetching current points:", fetchError.message);
      return false;
    }

    // Calculate the new total
    const currentPoints = userData.xp_points || 0;
    const newTotal = currentPoints + points;

    // Update with the incremented value
    const { data, error } = await db_con
      .from("users")
      .update([
        {
          xp_points: newTotal,
        },
      ])
      .eq("user_id", JSON.parse(Cookies.get("auth"))["user_id"])
      .select()
      .single();

    if (error) {
      console.log("Error saving points:", error.message);
      return false;
    }
    return { success: true, user: data };
  } catch (error) {
    console.error("Error saving points:", error);
    return { success: false };
  }
};

function QuizSpace() {
  const [myQuizzes, setMyQuizzes] = useState([]); // list of quizzes
  const [currentQuizQuestion, setCurrentQuizQuestion] = useState({
    question: "",
    answers: ["", "", "", ""],
    correctAnswer: 0,
    exam_id: 0,
  });
  const [selectedAnswersQuiz, setSelectedAnswersQuiz] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [currentQuizID, setCurrentQuizID] = useState(0);
  const [selectedTab, setSelectedTab] = useState(0);
  const [quizResults, setQuizResults] = useState([]);

  const [challengeGoal, setChallengeGoal] = useState(0);
  const [challengeReward, setChallengeReward] = useState(0);

  const [timeRemaining, setTimeRemaining] = useState(0); // in seconds
  const [timerActive, setTimerActive] = useState(false);
  const [timerIntervalId, setTimerIntervalId] = useState(null);

  const fetchMyClasses = async () => {
    const result = await getMyClasses();
    if (result.success) {
      // Extract class IDs and ensure they are integers
      const classIDs = result.classes.map((cls) => parseInt(cls.class_id, 10));
      if (classIDs.length > 0) {
        const quizzesResult = await getMyQuizzes(classIDs);
        if (quizzesResult.success) {
          setMyQuizzes(quizzesResult.quizzes);
        }
      }
    } else {
      console.log("Message:", result.message);
    }
  };

  // Handle selecting an answer
  const handleSelectAnswer = (index) => {
    const updatedAnswers = [...selectedAnswersQuiz];
    updatedAnswers[currentQuestionIndex] = index;
    setSelectedAnswersQuiz(updatedAnswers);
  };

  // Load next mcq question
  const loadNextQuizQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      setCurrentQuizQuestion(questions[nextIndex]);
    } else {
      setQuizCompleted(true); // Mark exam as completed
      calculateAndSaveResults();
      document.getElementById("quizModal").close(); // Close modal if no more questions
    }
  };

  // Calculate and save results (mcq)
  const calculateAndSaveResults = async () => {
    let correctAnswersCount = 0;

    // Count correct answers
    selectedAnswersQuiz.forEach((selectedAnswer, index) => {
      if (selectedAnswer === questions[index].correctAnswer) {
        correctAnswersCount += 1;
      }
    });

    const percentage = (correctAnswersCount / questions.length) * 100;
    const studentId = JSON.parse(Cookies.get("auth"))["user_id"];
    const quizId = currentQuizID;
    const resultSaved = await saveQuizResults(quizId, studentId, percentage);
    if (resultSaved) {
      alert(
        `Your score: ${correctAnswersCount} / ${
          questions.length
        } (${percentage.toFixed(2)}%)`
      );
      // !!!
      // reset vars manually [done]
      // reload quizzes manually [done]
      setCurrentQuizQuestion({
        question: "",
        answers: ["", "", "", ""],
        correctAnswer: 0,
        exam_id: 0,
      });
      setSelectedAnswersQuiz([]);
      setCurrentQuestionIndex(0);
      setQuizCompleted(false);
      setQuestions([]);
      setCurrentQuizID(0);
      setQuizResults([]);
      setChallengeGoal(0);
      setChallengeReward(0);
      setTimeRemaining(0);
      setTimerActive(false);
      setTimerIntervalId(null);
      fetchMyClasses();
      fetchQuizResults();
      //window.location.reload();
    } else {
      alert("There was an error saving your results.");
    }
  };

  // Load quiz questions and open modal
  const loadQuizQuestions = (quiz) => {
    const parsedQuestions = JSON.parse(quiz.quiz_qs);

    if (quiz.challenges && quiz.challenges.length > 0) {
      quiz.challenges.map((challenge) =>
        challenge.challenge_type === "time-based"
          ? startTimeChallenge(
              challenge.challenge_goal,
              challenge.challenge_reward
            )
          : startPointsChallenge(
              challenge.challenge_goal,
              challenge.challenge_reward
            )
      );
    }

    if (parsedQuestions.length > 0) {
      setQuestions(parsedQuestions);
      setCurrentQuizID(quiz.quiz_id);
      setCurrentQuestionIndex(0);
      setCurrentQuizQuestion(parsedQuestions[0]);
      setSelectedAnswersQuiz([]); // Reset selected answers
      setQuizCompleted(false); // Reset quiz completion state
      document.getElementById("quizModal").showModal();
    }
  };

  const fetchQuizResults = async () => {
    const result = await getQuizzResults();

    if (result.success) {
      setQuizResults(result.qresults);
    } else {
      console.log("Error loading quiz results!");
    }
  };

  const startTimeChallenge = (goal, reward) => {
    setChallengeGoal(goal);
    setChallengeReward(reward);

    // Convert minutes to seconds
    const durationInSeconds = goal * 60;
    setTimeRemaining(durationInSeconds);

    // Start the timer
    setTimerActive(true);

    const intervalId = setInterval(() => {
      // Check if quiz is completed first
      if (quizCompleted) {
        clearInterval(intervalId);
        setTimerActive(false);
        alert(
          `Congratulations! You've completed the quiz in time and earned ${reward} XP!`
        );
        return;
      }

      setTimeRemaining((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(intervalId);
          setTimerActive(false);
          // Only show this if quiz isn't completed
          if (!quizCompleted) {
            alert(`Time's up! You didn't complete the quiz in time.`);
          }
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    // Store the interval ID
    setTimerIntervalId(intervalId);

    alert(`Challenge started! Complete in ${goal} mins to earn ${reward} XP`);
  };

  const handleSavingPoints = async () => {
    const result = await saveChallengePoints(challengeReward);

    if (!result.success) {
      alert("XP Points Saving Failed!");
    }
  };

  // Clean up the interval when component unmounts
  useEffect(() => {
    return () => {
      if (timerIntervalId) {
        clearInterval(timerIntervalId);
      }
    };
  }, [timerIntervalId]);

  const startPointsChallenge = (goal, reward) => {
    alert(`${reward} XP for - ${goal} points per quiz`);
  };

  useEffect(() => {
    fetchMyClasses();
    fetchQuizResults();
  }, []);

  useEffect(() => {
    // This will trigger when quizCompleted changes to true
    if (quizCompleted && timerActive) {
      // Clear the timer
      clearInterval(timerIntervalId);
      setTimerActive(false);

      // Calculate time taken
      const timeTaken = challengeGoal * 60 - timeRemaining;
      const minutesTaken = Math.floor(timeTaken / 60);
      const secondsTaken = timeTaken % 60;

      // Show completion message
      alert(
        `Congratulations! You've completed the quiz in ${minutesTaken}m ${secondsTaken}s and earned ${challengeReward} XP!`
      );
      handleSavingPoints();
    }
  }, [quizCompleted]);

  return (
    <div className="space-y-4">
      <div role="tablist" className="tabs tabs-boxed">
        <p
          role="tab"
          className={`max-sm:text-xs tab ${
            selectedTab === 0 ? "tab-active font-semibold" : ""
          }`}
          onClick={() => setSelectedTab(0)}
        >
          Your Quizzes
        </p>
        <p
          role="tab"
          className={`max-sm:text-xs tab ${
            selectedTab === 1 ? "tab-active font-semibold" : ""
          }`}
          onClick={() => setSelectedTab(1)}
        >
          Leaderbords
        </p>
      </div>

      {selectedTab === 0 && (
        <div className="space-y-4">
          {timerActive && (
            <div>
              Time remaining: {Math.floor(timeRemaining / 60)}:
              {(timeRemaining % 60).toString().padStart(2, "0")}
            </div>
          )}
          <h3 className="text-xl font-semibold">Quizzes for you</h3>
          {/*card grid*/}
          {myQuizzes.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {myQuizzes.map((quiz, index) => (
                <div
                  key={index}
                  className="block p-4 transition-all border border-gray-300 rounded-md shadow-sm cursor-pointer sm:p-6 hover:shadow-xl"
                  onClick={() => loadQuizQuestions(quiz)}
                >
                  <div className="sm:flex sm:justify-between sm:gap-4 lg:gap-6">
                    <div className="sm:order-last sm:shrink-0">
                      <img
                        alt="crown"
                        src={crown}
                        className="size-16 object-cover sm:size-[72px]"
                      />
                    </div>
                    <div className="mt-4 sm:mt-0">
                      <h3 className="text-lg font-medium text-transparent text-pretty bg-gradient-to-r from-green-500 to-blue-600 bg-clip-text">
                        {quiz.quiz_name}
                      </h3>
                      <p className="mt-1 text-sm">By {quiz.users.username}</p>
                      <p className="mt-4 text-sm line-clamp-2 text-pretty">
                        For {quiz.classrooms.classname}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-1 mt-6 lg:grid-cols-2 lg:gap-3">
                    <div>
                      <dt className="text-sm font-medium">Published on</dt>
                      <dd className="text-xs">
                        {new Date(quiz.created_at).toDateString()}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium">Question Count</dt>
                      <dd className="text-xs">
                        {JSON.parse(quiz.quiz_qs).length}
                      </dd>
                    </div>
                    {quiz.challenges && quiz.challenges.length > 0 ? (
                      <div className="col-span-2">
                        <dt className="text-sm font-medium text-transparent bg-gradient-to-r from-yellow-500 to-red-600 bg-clip-text">
                          Challenge Available!
                        </dt>
                        <dd className="font-mono text-xs font-semibold text-transparent capitalize bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text">
                          {quiz.challenges && quiz.challenges.length > 0
                            ? quiz.challenges
                                .map(
                                  (challenge) =>
                                    challenge.challenge_type +
                                    " - " +
                                    (challenge.challenge_type === "time-based"
                                      ? challenge.challenge_goal +
                                        " mins per quiz for " +
                                        challenge.challenge_reward +
                                        " XP points"
                                      : challenge.challenge_goal +
                                        " points per quiz")
                                )
                                .join(", ")
                            : "No challenges"}
                        </dd>
                      </div>
                    ) : (
                      ""
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (<p>No Quizzes yet...</p>)}
        </div>
      )}

      {selectedTab === 1 && (
        <Leaderboards quizResults={quizResults} myQuizzes={myQuizzes} />
      )}

      {/*quiz modal*/}
      <dialog id="quizModal" className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-bold">New Question</h3>
          <div className="flex flex-col gap-3 pt-4">
            <p>{currentQuizQuestion.question}</p>
            {currentQuizQuestion.answers.map((answer, index) => (
              <span key={index} className="flex items-center gap-2">
                <input
                  type="radio"
                  className="radio radio-success"
                  name="ans"
                  onChange={() => handleSelectAnswer(index)}
                  checked={selectedAnswersQuiz[currentQuestionIndex] === index}
                />
                <p>{answer}</p>
              </span>
            ))}
          </div>
          <div className="modal-action">
            {quizCompleted ? (
              <button className="btn" onClick={() => window.location.reload()}>
                Finish
              </button>
            ) : (
              <button className="btn" onClick={loadNextQuizQuestion}>
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

export default QuizSpace;
