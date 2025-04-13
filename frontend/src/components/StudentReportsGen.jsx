import { useEffect, useState } from "react";
import db_con from "./dbconfig";
import Cookies from "js-cookie";
import {
  generatePerformanceReport,
  generateAttendanceReport,
} from "./pdfGenerator"; // Import the helper functions

const getMyStudents = async () => {
  try {
    const { data, error } = await db_con
      .from("classrooms")
      .select(
        `
        class_id,
        classname,
        students:classrooms_students(
          student_id,
          user:users(
            user_id,
            username,
            email
          )
        )
      `
      )
      .eq("lecturer_id", JSON.parse(Cookies.get("auth"))["user_id"])
      .order("class_id", { ascending: true });

    if (error) {
      console.log("Students Loading error:", error.message);
      return { success: false, message: "Load Failed!" };
    }
    const classesData = data.map((classroom) => ({
      class_id: classroom.class_id,
      classname: classroom.classname,
      students: classroom.students.map((student) => ({
        user_id: student.user.user_id,
        username: student.user.username,
        email: student.user.email,
      })),
    }));
    return { success: true, vclasses: classesData };
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
        marks,
        created_at,
        exams!exams_students_exam_id_fkey(exam_qs)
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
        analysis,
        created_at,
        exams!essay_exams_students_exam_id_fkey(exam_qs)
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

function StudentReportGen() {
  const [uniqueStudents, setUniqueStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState({
    student_id: 0,
    student_name: "",
    student_email: "",
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState("");

  const [aiResponse, setAIResponse] = useState("");

  const fetchStudents = async () => {
    const result = await getMyStudents();

    if (result.success) {
      // Create a map to track unique students and their classes
      const studentMap = new Map();

      result.vclasses.forEach((classInfo) => {
        classInfo.students.forEach((student) => {
          if (studentMap.has(student.user_id)) {
            // If student already exists, add this class to their classes array
            const existingStudent = studentMap.get(student.user_id);
            existingStudent.classes.push({
              class_id: classInfo.class_id,
              classname: classInfo.classname,
            });
          } else {
            // Otherwise, create a new student entry with this class
            studentMap.set(student.user_id, {
              ...student,
              classes: [
                {
                  class_id: classInfo.class_id,
                  classname: classInfo.classname,
                },
              ],
            });
          }
        });
      });

      // Convert the map to an array
      setUniqueStudents(Array.from(studentMap.values()));
    } else {
      alert("Error fetching students!");
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const formatForAIAnalysis = (mcqData, essayData) => {
    const combined = {};
    // Process MCQ results mcqData.
    mcqData.forEach((exam) => {
      combined[exam.exam_id] = {
        ...combined[exam.exam_id],
        exam_id: exam.exam_id,
        exam_questions: exam.exams.exam_qs,
        mcq_marks: exam.marks,
        date: exam.created_at,
      };
    }); // Process Essay results
    essayData.forEach((exam) => {
      combined[exam.exam_id] = {
        ...combined[exam.exam_id],
        exam_id: exam.exam_id,
        exam_questions: exam.exams.exam_qs,
        essay_analysis: exam.analysis,
        date: exam.created_at,
      };
    });
    return { analysisType: "exam_performance", exams: Object.values(combined) };
  };

  const handleAIAnalysing = async (student_id) => {
    try {
      // Get raw data
      const submissions = await getExamSubmissions(student_id);
      // Format for AI
      const formattedResult = formatForAIAnalysis(
        submissions.mcqExamSubmissions,
        submissions.essayExamSubmissions
      );
      // Add instructions
      const payload = {instructions:
        "Analyze both MCQ scores and essay text analysis. Identify patterns, strengths, weaknesses, and suggest study strategies. Provide a summarized analysis on all the exams answered by the student.",
        exam_data: formattedResult.exams,
      };

      // test content
      // console.log(JSON.stringify(payload));

      // Send to AI
      const res = await fetch("https://enlighten-ed.onrender.com/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: JSON.stringify(payload),
        }),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const data = await res.json();

      return { success: true, data: data };
    } catch (error) {
      console.error("Error fetching response:", error);
      return { success: false, message: "Error fetching AI response!" };
    }
  };

  const handleGeneratePerformanceReport = async () => {
    setIsGenerating(true);
    setGenerationStatus("Fetching exam data...");

    try {
      const student_id = selectedStudent.student_id;
      const examSubmissions = await getExamSubmissions(student_id);

      const aiResult = await handleAIAnalysing(student_id);

      if (!examSubmissions.success) {
        setGenerationStatus("Failed to fetch exam data");
        setTimeout(() => setGenerationStatus(""), 3000);
        setIsGenerating(false);
        return;
      }

      if(!aiResult.success){
        setGenerationStatus("Failed to fetch exam AI analysis");
        setTimeout(() => setGenerationStatus(""), 3000);
        setIsGenerating(false);
        return;
      }

      setGenerationStatus("Generating PDF...");

      // console.log(aiResult.data);

      await generatePerformanceReport(
        selectedStudent,
        examSubmissions.mcqExamSubmissions || [],
        examSubmissions.essayExamSubmissions || [],
        aiResult.data || []
      );

      setGenerationStatus("Report generated successfully!");
      setTimeout(() => setGenerationStatus(""), 3000);
    } catch (error) {
      console.error("Error generating performance report:", error);
      setGenerationStatus("Failed to generate report");
      setTimeout(() => setGenerationStatus(""), 3000);
    }

    setIsGenerating(false);
  };

  const handleGenerateAttendanceReport = async () => {
    setIsGenerating(true);
    setGenerationStatus("Fetching attendance data...");

    try {
      const student_id = selectedStudent.student_id;
      const attendanceResult = await getAttendanceData(student_id);

      if (!attendanceResult.success) {
        setGenerationStatus("Failed to fetch attendance data");
        setTimeout(() => setGenerationStatus(""), 3000);
        setIsGenerating(false);
        return;
      }

      setGenerationStatus("Generating PDF...");

      await generateAttendanceReport(
        selectedStudent,
        attendanceResult.attendanceData || []
      );

      setGenerationStatus("Report generated successfully!");
      setTimeout(() => setGenerationStatus(""), 3000);
    } catch (error) {
      console.error("Error generating attendance report:", error);
      setGenerationStatus("Failed to generate report");
      setTimeout(() => setGenerationStatus(""), 3000);
    }

    setIsGenerating(false);
  };

  return (
    <div className="space-y-4">
      <h3 className="font-medium">Generate Reports for a Student</h3>
      <div className="mt-4 overflow-x-auto border">
        <table className="table table-zebra">
          {/* Table Head */}
          <thead>
            <tr>
              <th>#</th>
              <th>Student Name</th>
              <th>Email</th>
              <th>Enrolled Classes</th>
              <th>Reports</th>
            </tr>
          </thead>
          {/* Table Body */}
          <tbody>
            {uniqueStudents.length > 0 ? (
              uniqueStudents.map((student, index) => (
                <tr key={student.user_id}>
                  <th>{index + 1}</th>
                  <td>{student.username}</td>
                  <td>{student.email}</td>
                  <td>
                    <ul className="list-disc list-inside">
                      {student.classes.map((vclass, index) => (
                        <li key={index}>{vclass.classname}</li>
                      ))}
                    </ul>
                  </td>
                  <td>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => {
                        setSelectedStudent({
                          student_id: student.user_id,
                          student_name: student.username,
                          student_email: student.email,
                        });
                        document.getElementById("reportsModal").showModal();
                      }}
                    >
                      Generate
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-4 text-center">
                  No students found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/*reports modal*/}
      <dialog id="reportsModal" className="modal">
        <div className="space-y-4 modal-box">
          <h3 className="text-lg font-bold">Generate Reports</h3>
          <p>
            <strong>Name: </strong>
            {selectedStudent.student_name}
          </p>
          <p>
            <strong>Email: </strong>
            {selectedStudent.student_email}
          </p>

          {generationStatus && (
            <div className="py-2 text-center">
              <p className={isGenerating ? "text-blue-500" : "text-green-500"}>
                {isGenerating && (
                  <span className="mr-2 loading loading-spinner loading-sm"></span>
                )}
                {generationStatus}
              </p>
            </div>
          )}

          <ul className="space-y-4">
            <li>
              <button
                onClick={handleGeneratePerformanceReport}
                className="btn btn-outline btn-sm"
                disabled={isGenerating}
              >
                Generate Performance Report
              </button>
            </li>
            <li>
              <button
                onClick={handleGenerateAttendanceReport}
                className="btn btn-outline btn-sm"
                disabled={isGenerating}
              >
                Generate Attendance Report
              </button>
            </li>
          </ul>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </div>
  );
}

export default StudentReportGen;
