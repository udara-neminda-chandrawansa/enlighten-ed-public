import React, { useState, useMemo } from "react";

function Leaderboards({ quizResults, myQuizzes }) {
  const [leaderboardType, setLeaderboardType] = useState("global");
  const [selectedQuiz, setSelectedQuiz] = useState(null);

  // Process global leaderboard data
  const globalLeaderboard = useMemo(() => {
    const studentScores = {};

    quizResults.forEach((result) => {
      const { username } = result.users;
      const { xp_points } = result.users;
      const { quiz_name } = result.quizzes;

      if (!studentScores[username]) {
        studentScores[username] = {
          totalScore: result.marks,
          quizzesTaken: 1,
          averageScore: result.marks,
          quizzes: [{ name: quiz_name, score: result.marks }],
          xp: xp_points,
        };
      } else {
        studentScores[username].totalScore += result.marks;
        studentScores[username].quizzesTaken += 1;
        studentScores[username].averageScore =
          studentScores[username].totalScore /
          studentScores[username].quizzesTaken;
        studentScores[username].quizzes.push({
          name: quiz_name,
          score: result.marks,
          xp: xp_points,
        });
      }
    });

    return Object.entries(studentScores)
      .map(([username, data]) => ({
        username,
        ...data,
      }))
      .sort((a, b) => b.averageScore - a.averageScore);
  }, [quizResults]);

  // Process individual quiz leaderboards
  const quizLeaderboards = useMemo(() => {
    const leaderboards = {};

    quizResults.forEach((result) => {
      const { quiz_id, quiz_name } = result.quizzes;
      const { username, xp_points } = result.users;

      if (!leaderboards[quiz_id]) {
        leaderboards[quiz_id] = {
          quizName: quiz_name,
          scores: [],
          xp: xp_points,
        };
      }

      leaderboards[quiz_id].scores.push({
        username,
        score: result.marks,
        xp: xp_points,
      });
    });

    // Sort scores for each quiz
    Object.values(leaderboards).forEach((board) => {
      board.scores.sort((a, b) => b.score - a.score);
    });

    return leaderboards;
  }, [quizResults]);

  const renderLeaderboard = (leaderboard) => {
    return (
      <div className="overflow-x-auto">
        <table className="table table-zebra">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Student</th>
              <th>Score</th>
              <th>XP Points</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((entry, index) => (
              <tr key={entry.username}>
                <td>{index + 1}</td>
                <td>{entry.username}</td>
                <td>
                  {typeof entry.averageScore === "number"
                    ? entry.averageScore.toFixed(2)
                    : typeof entry.score === "number"
                    ? entry.score.toFixed(2)
                    : "N/A"}
                  %
                </td>
                <td>{entry.xp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="mt-4 space-y-4">
      <div role="tablist" className="tabs tabs-boxed">
        <p
          role="tab"
          className={`max-sm:text-xs tab ${
            leaderboardType === "global" ? "tab-active font-semibold" : ""
          }`}
          onClick={() => setLeaderboardType("global")}
        >
          Global Leaderboard
        </p>
        <p
          role="tab"
          className={`max-sm:text-xs tab ${
            leaderboardType === "quiz" ? "tab-active font-semibold" : ""
          }`}
          onClick={() => setLeaderboardType("quiz")}
        >
          Quiz Leaderboards
        </p>
      </div>

      {leaderboardType === "global" && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">
            Global Performance Leaderboard
          </h3>
          {globalLeaderboard.length > 0 ? (
            renderLeaderboard(globalLeaderboard)
          ) : (
            <p className="text-center text-gray-500">
              No quiz results available
            </p>
          )}
        </div>
      )}

      {leaderboardType === "quiz" && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Quiz-specific Leaderboards</h3>
          <div className="">
            <select
              className="w-full select select-bordered"
              value={selectedQuiz || ""}
              onChange={(e) => setSelectedQuiz(e.target.value)}
            >
              <option value="">Select a Quiz</option>
              {Object.values(quizLeaderboards).map((quiz) => (
                <option key={quiz.quizName} value={quiz.quizName}>
                  {quiz.quizName}
                </option>
              ))}
            </select>
          </div>

          {selectedQuiz &&
            quizLeaderboards[
              Object.keys(quizLeaderboards).find(
                (key) => quizLeaderboards[key].quizName === selectedQuiz
              )
            ] && (
              <div>
                <h4 className="text-lg font-medium">
                  {selectedQuiz} Leaderboard
                </h4>
                {renderLeaderboard(
                  quizLeaderboards[
                    Object.keys(quizLeaderboards).find(
                      (key) => quizLeaderboards[key].quizName === selectedQuiz
                    )
                  ].scores
                )}
              </div>
            )}
        </div>
      )}
    </div>
  );
}

export default Leaderboards;
