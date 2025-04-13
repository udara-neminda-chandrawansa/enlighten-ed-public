import Cookies from "js-cookie";
import db_con from "../components/dbconfig";
import { useEffect, useState } from "react";

// Get assigned student for the logged in parent
const getStudentForParent = async (parentId) => {
  try {
    const { data: studentData, error: studentError } = await db_con
      .from("students_parents")
      .select(`student_id`)
      .eq("parent_id", parentId)
      .single();

    if (studentError) {
      console.log("Students loading error:", studentError.message);
      return { success: false, message: "Load Failed!" };
    }

    // Fetch username for student - use eq instead of in since we have a single value
    const { data: userData, error: usersError } = await db_con
      .from("users")
      .select(`user_id, username`)
      .eq("user_id", studentData.student_id)
      .single();

    if (usersError) {
      console.log("Users loading error:", usersError.message);
      return { success: false, message: "Load Failed!" };
    }

    // Combine the data
    const studentWithName = {
      student_id: studentData.student_id,
      username: userData.username,
    };

    return { success: true, student: studentWithName };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, message: "Something went wrong!" };
  }
};

const getAttendanceData = async (student_id) => {
  try {
    const { data, error } = await db_con
      .from("meeting_attendance")
      .select(
        `
        attendance_id,
        meeting_name,
        lecturer_id,
        status,
        created_at
      `
      )
      .eq("student_id", student_id)
      .order("attendance_id", { ascending: true });

    if (error) {
      console.log("Attendance Data Loading error:", error.message);
      return { success: false, message: "Load Failed!" };
    }
    return { success: true, attendanceData: data };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, message: "Something went wrong!" };
  }
};

const getExamSubmissions = async (student_id) => {
  try {
    const { data: mcqData, error: mcqError } = await db_con
      .from("mcq_exams_students")
      .select(
        `
        exam_id,
        exams!inner(exam_name),
        marks,
        created_at
      `
      )
      .eq("student_id", student_id)
      .order("exam_id", { ascending: true });

    if (mcqError) {
      console.log("MCQ Exam Submissions Loading error:", mcqError.message);
      return { success: false, message: "Load Failed!" };
    }

    const { data: essayData, error: essayError } = await db_con
      .from("essay_exams_students")
      .select(
        `
        exam_id,
        exams!inner(exam_name),
        analysis,
        created_at
      `
      )
      .eq("student_id", student_id)
      .order("exam_id", { ascending: true });

    if (essayError) {
      console.log("Essay Exam Submissions Loading error:", essayError.message);
      return { success: false, message: "Load Failed!" };
    }

    return {
      success: true,
      mcqExamSubmissions: mcqData,
      essayExamSubmissions: essayData,
    };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, message: "Something went wrong!" };
  }
};

const getQuizzResults = async (student_id) => {
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
      .eq("student_id", student_id)
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

function StudentPerformance() {
  const parentId = JSON.parse(Cookies.get("auth"))["user_id"];
  const [student, setStudent] = useState({});
  const [attendance, setAttendance] = useState([]);
  const [mcqExams, setMcqExams] = useState([]);
  const [essayExams, setEssayExams] = useState([]);
  const [quizResults, setQuizResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnalysis, setSelectedAnalysis] = useState("");

  const fetchStudentData = async () => {
    setLoading(true);
    try {
      // Fetch student info
      const studentResult = await getStudentForParent(parentId);
      if (!studentResult.success) return;

      setStudent(studentResult.student);

      // Fetch all data in parallel
      const [attendanceResult, examsResult, quizReult] = await Promise.all([
        getAttendanceData(studentResult.student.student_id),
        getExamSubmissions(studentResult.student.student_id),
        getQuizzResults(studentResult.student.student_id),
      ]);

      if (attendanceResult.success) {
        setAttendance(attendanceResult.attendanceData);
      }

      if (examsResult.success) {
        setMcqExams(examsResult.mcqExamSubmissions);
        setEssayExams(examsResult.essayExamSubmissions);
      }

      if (quizReult.success) {
        setQuizResults(quizReult.qresults);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, []);

  if (loading) {
    return <div>Loading student data...</div>;
  }

  const SimpleFormattedResult = ({ resultText }) => {
    // Handle if resultText is an object
    if (typeof resultText === "object") {
      resultText = JSON.stringify(resultText);
    }

    // Function to format the text
    const formatText = (text) => {
      // Replace markdown-style bold with HTML bold
      const boldFormatted = text.replace(
        /\*\*(.*?)\*\*/g,
        "<strong>$1</strong>"
      );

      // Add breaks for better readability
      const withLineBreaks = boldFormatted
        // Add break after each score section
        .replace(/(\/100)/g, "$1<br/>")
        // Add break before "Total:"
        .replace(/(Total:)/g, "<br/>$1")
        // Add break before "Feedback:"
        .replace(/(---)/g, "<br/>$1")
        // Add break before each feedback point
        .replace(/(-\s\*\*Q\d+)/g, "<br/>$1");

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
    <div className="space-y-4">
      <h3 className="text-xl font-bold">Student Performance</h3>
      <div className="rounded-lg bg-base-100">
        <h4 className="mb-2 text-lg font-semibold">
          Student: {student.username || "Unknown"}
        </h4>
      </div>

      {/* Attendance Table */}
      <div className="rounded-lg bg-base-100">
        <h4 className="mb-4 text-lg font-semibold">Attendance Records</h4>
        {attendance.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table w-full border table-zebra">
              <thead>
                <tr>
                  <th>Meeting</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((record) => (
                  <tr key={record.attendance_id}>
                    <td>{record.meeting_name}</td>
                    <td>
                      <span className={"badge capitalize"}>
                        {record.status}
                      </span>
                    </td>
                    <td className="max-w-xs">{new Date(record.created_at).toString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No attendance records found</p>
        )}
      </div>

      {/* MCQ Exams Table */}
      <div className="rounded-lg bg-base-100">
        <h4 className="mb-4 text-lg font-semibold">MCQ Exam Results</h4>
        {mcqExams.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table w-full border table-zebra">
              <thead>
                <tr>
                  <th>Exam Name</th>
                  <th>Marks</th>
                  <th>Submission Date</th>
                </tr>
              </thead>
              <tbody>
                {mcqExams.map((exam) => (
                  <tr key={exam.exam_id}>
                    <td>{exam.exams.exam_name}</td>
                    <td>{exam.marks}</td>
                    <td className="max-w-xs">{new Date(exam.created_at).toString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No MCQ exam submissions found</p>
        )}
      </div>

      {/* Essay Exams Table */}
      <div className="rounded-lg bg-base-100">
        <h4 className="mb-4 text-lg font-semibold">Essay Exam Results</h4>
        {essayExams.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table w-full border table-zebra">
              <thead>
                <tr>
                  <th>Exam Name</th>
                  <th>Analysis</th>
                  <th>Submission Date</th>
                </tr>
              </thead>
              <tbody>
                {essayExams.map((exam) => (
                  <tr key={exam.exam_id}>
                    <td>{exam.exams.exam_name}</td>
                    <td
                      onClick={() => {
                        setSelectedAnalysis(exam.analysis);
                        document.getElementById("analysisModal").showModal();
                      }}
                    >
                      <button className="btn btn-outline btn-sm">View Analysis</button>
                    </td>
                    <td className="max-w-xs">{new Date(exam.created_at).toString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No essay exam submissions found</p>
        )}
      </div>

      {/* Quiz Results Table */}
      <div className="rounded-lg bg-base-100">
        <h4 className="mb-4 text-lg font-semibold">
          Quiz Results (Total XP Points: {quizResults[0].users.xp_points})
        </h4>
        {quizResults.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table w-full border table-zebra">
              <thead>
                <tr>
                  <th>Quiz Name</th>
                  <th>Marks</th>
                  <th>Submission Date</th>
                </tr>
              </thead>
              <tbody>
                {quizResults.map((quiz) => (
                  <tr key={quiz.quiz_id}>
                    <td>{quiz.quizzes.quiz_name}</td>
                    <td className="max-w-xs truncate">{quiz.marks}</td>
                    <td className="max-w-xs">{new Date(quiz.created_at).toString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No quiz submissions found</p>
        )}
      </div>

      {/*analysis modal*/}
      <dialog id="analysisModal" className="modal">
        <div className="max-w-xl space-y-4 modal-box">
          <h3 className="text-lg font-bold">Analysis</h3>
          <p>
            <SimpleFormattedResult resultText={selectedAnalysis} />
          </p>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </div>
  );
}

export default StudentPerformance;
