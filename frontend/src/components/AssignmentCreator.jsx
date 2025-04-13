import { useEffect, useState } from "react";
import AssignmentFileManager from "./AssignmentFileManager";
import Cookies from "js-cookie";
import db_con from "./dbconfig";
import { Download } from "lucide-react";

function AssignmentCreator() {
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [selectedGrades, setSelectedGrades] = useState({});

  const getClassAssignments = async () => {
    try {
      // Get user_id from auth cookies
      const user_id = JSON.parse(Cookies.get("auth"))["user_id"];

      // Fetch assignments with a more precise join and filter
      const { data, error } = await db_con
        .from("class_assignments")
        .select(
          `
          assignment_name, 
          deadline,
          class_id,
          file_id,
          classrooms!inner (
            classname, 
            lecturer_id
          ),
          user_files (file_url)
        `
        )
        // Use inner join to ensure only classes with matching lecturer_id are returned
        .eq("classrooms.lecturer_id", user_id);

      if (error) throw error;

      // Robust mapping with null checks
      const assignments = data.map((assignment) => ({
        assignmentName: assignment.assignment_name,
        className: assignment.classrooms.classname,
        fileUrl: assignment.user_files.file_url,
        deadline: assignment.deadline,
      }));

      return {
        success: true,
        assignments: assignments,
      };
    } catch (error) {
      console.error("Error fetching class assignments:", error);
      return {
        success: false,
        error: error.message,
        assignments: [], // Return an empty array instead of undefined
      };
    }
  };

  const getSubmissions = async () => {
    try {
      const { data, error } = await db_con
        .from("student_assignment_submissions")
        .select(
          `
            submission_id, 
            assignment_id, 
            created_at,
            class_assignments!inner(assignment_name, classrooms!inner(classname)),
            users!inner(username),
            user_files!inner(file_url)
          `
        )
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Transform the data to flatten the nested structure
      const submissions = data.map((submission) => ({
        submission_id: submission.submission_id,
        assignment_id: submission.assignment_id,
        assignment_name: submission.class_assignments.assignment_name,
        class_name: submission.class_assignments.classrooms.classname,
        student_name: submission.users.username,
        file_url: submission.user_files.file_url,
        submitted_at: new Date(submission.created_at).toLocaleString(),
      }));

      return {
        success: true,
        submissions,
      };
    } catch (err) {
      console.log(err.message);
    }
  };

  const submitGrade = async (assignment_id, submission_id, grade) => {
    try {
      // Insert record into student_assignment_submissions table
      const { data, error } = await db_con
        .from("student_assignment_submissions")
        .update({
          grade: grade,
        })
        .eq("submission_id", submission_id)
        .select(); // Return the inserted record

      if (error) throw error;

      return {
        success: true,
        submission: data[0],
        message: "Grading submitted successfully",
      };
    } catch (error) {
      console.error("Error submitting grading:", error);
      return {
        success: false,
        error: error.message,
        message: "Failed to grade assignment",
      };
    }
  };

  useEffect(() => {
    fetchAssignments();
    fetchSubmissions();
  }, []);

  const fetchAssignments = async () => {
    const result = await getClassAssignments();
    if (result.success) {
      setAssignments(result.assignments);
    }
  };

  const fetchSubmissions = async () => {
    const result = await getSubmissions();
    if (result.success) {
      setSubmissions(result.submissions);
    } else {
      console.log("Error fetching submissions!");
    }
  };

  const formatDeadline = (deadlineString) => {
    // Create a Date object from the UTC timestamp
    const date = new Date(deadlineString);

    // Use toLocaleString with options to control the format
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "UTC", // Explicitly set to UTC to prevent local timezone conversion
    });
  };

  const extractFileName = (url) => {
    return url.split("assignments/")[1];
  };

  const downloadFile = async (filePath, bucket) => {
    try {
      const { data, error } = await db_con.storage
        .from(bucket)
        .download(filePath);

      if (error) throw error;

      // Create a download link and trigger it
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = filePath.split("/").pop(); // Get filename from path
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);

      return { success: true };
    } catch (error) {
      console.error("Error downloading file:", error);
      return { success: false, error: error.message };
    }
  };

  const handleDownload = async (filePath) => {
    await downloadFile(filePath, "assignments");
  };
  const handleGradeChange = (submissionId, grade) => {
    //alert(submissionId + " - " + grade);
    setSelectedGrades((prev) => ({
      ...prev,
      [submissionId]: grade,
    }));
  };

  const handleGrading = async (assignmentId, submissionId) => {
    const grade = selectedGrades[submissionId] || "P";

    //alert(`Assignment ID: ${assignmentId} | Submission ID: ${submissionId} | Grade: ${grade}`);

    const response = await submitGrade(assignmentId, submissionId, grade);

    if (response.success) {
      //console.log(response.submission["grade"]);
      alert("Grading submitted successfully!");
    } else {
      alert("Grading submission failed!");
    }
  };

  return (
    <div>
      <h3 className="mb-4 text-xl font-semibold">Upload Assignment Files</h3>
      <AssignmentFileManager bucketName={"assignments"} />

      {/* All Assignments */}
      <h3 className="my-2 font-medium">Your Assignments</h3>
      <div className="overflow-x-auto border rounded-md">
        <table className="table table-zebra">
          <thead>
            <tr>
              <th>Assignment Name</th>
              <th>Class Name</th>
              <th>File</th>
              <th>Deadline</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((assignment, index) => (
              <tr key={index}>
                <td>{assignment.assignmentName}</td>
                <td>{assignment.className}</td>
                <td>
                  <p>{extractFileName(assignment.fileUrl)}</p>
                </td>
                <td>{formatDeadline(assignment.deadline)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Student Submissions */}
      <h3 className="my-2 font-medium">Student Submissions</h3>
      <div className="overflow-x-auto border rounded-md">
        <table className="table table-zebra">
          <thead>
            <tr>
              <th>Assignment Name</th>
              <th>Class Name</th>
              <th>Student Name</th>
              <th>File</th>
              <th>Submitted At</th>
              <th>Grade</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((submission, index) => (
              <tr key={index}>
                <td>{submission.assignment_name}</td>
                <td>{submission.class_name}</td>
                <td>
                  <p>{submission.student_name}</p>
                </td>
                <td>
                  {submission.file_url ? (
                    <button
                      onClick={() =>
                        handleDownload(extractFileName(submission.file_url))
                      }
                      className="w-full text-white btn btn-success btn-sm sm:w-fit"
                    >
                      <Download />
                    </button>
                  ) : (
                    "No File"
                  )}
                </td>
                <td>{submission.submitted_at}</td>
                <td className="flex gap-2">
                  <select
                    className="select select-bordered select-sm"
                    value={selectedGrades[submission.submission_id] || "P"}
                    onChange={(e) =>
                      handleGradeChange(
                        submission.submission_id,
                        e.target.value
                      )
                    }
                  >
                    <option value="D">Distinction</option>
                    <option value="M">Merit</option>
                    <option value="P">Pass</option>
                    <option value="R">Resubmission</option>
                  </select>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() =>
                      handleGrading(
                        submission.assignment_id,
                        submission.submission_id
                      )
                    }
                  >
                    Grade
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AssignmentCreator;
