import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import db_con from "./dbconfig";
import { Download, Upload } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";

import audio_1 from "../assets/audio/alert.mp3";

function AssignmentPortal() {
  const audio1 = new Audio(audio_1);
  const [assignments, setAssignments] = useState([]);
  const [uploadStates, setUploadStates] = useState({});
  const [selectedFiles, setSelectedFiles] = useState({});

  const getClassAssignments = async () => {
    try {
      const user_id = JSON.parse(Cookies.get("auth"))["user_id"];

      // First, fetch the class IDs for the student
      const { data: classIds, error: classError } = await db_con
        .from("classrooms_students")
        .select("class_id")
        .eq("student_id", user_id);

      if (classError) throw classError;

      // If no classes found, return empty assignments
      if (!classIds || classIds.length === 0) {
        return {
          success: true,
          assignments: [],
        };
      }

      // Extract just the class_id values
      const studentClassIds = classIds.map((item) => item.class_id);

      // Fetch assignments for these classes with submission status
      const { data, error } = await db_con
        .from("class_assignments")
        .select(
          `
          class_assignment_id, 
          assignment_name, 
          deadline,
          class_id,
          file_id,
          classrooms!inner (
            classname
          ),
          user_files (file_url)
        `
        )
        .in("class_id", studentClassIds);

      if (error) throw error;

      // Fetch submissions separately
      const { data: submissions, error: submissionError } = await db_con
        .from("student_assignment_submissions")
        .select("assignment_id, grade, created_at")
        .eq("student_id", user_id)
        .order("created_at", { ascending: true });

      if (submissionError) throw submissionError;

      // Fixed: Properly create a map of submissions
      const submissionMap = new Map(
        submissions.map((submission) => [
          submission.assignment_id, // Key
          {
            // Value object
            grade: submission.grade,
            created_at: submission.created_at,
          },
        ])
      );

      // Robust mapping with null checks
      const assignments =
        data?.map((assignment) => {
          const submission = submissionMap.get(assignment.class_assignment_id);

          return {
            assignmentId: assignment.class_assignment_id || "No id",
            assignmentName: assignment.assignment_name || "Unnamed Assignment",
            className: assignment.classrooms?.classname || "Unknown Class",
            fileUrl: assignment.user_files?.file_url || null,
            deadline: assignment.deadline || null,
            assignmentStatus: submission ? "Submitted" : "Not Submitted",
            studentGrade: submission?.grade || null,
            submissionDate: submission?.created_at || null,
          };
        }) || [];

      return {
        success: true,
        assignments: assignments,
      };
    } catch (error) {
      console.error("Error fetching class assignments:", error);
      return {
        success: false,
        error: error.message,
        assignments: [],
      };
    }
  };

  const fetchAssignments = async () => {
    const result = await getClassAssignments();
    if (result.success) {
      setAssignments(result.assignments);
      // Initialize upload states and selected files for each assignment
      const initialUploadStates = result.assignments.reduce(
        (acc, assignment) => {
          acc[assignment.assignmentId] = false;
          return acc;
        },
        {}
      );
      const initialSelectedFiles = result.assignments.reduce(
        (acc, assignment) => {
          acc[assignment.assignmentId] = null;
          return acc;
        },
        {}
      );
      setUploadStates(initialUploadStates);
      setSelectedFiles(initialSelectedFiles);
    }
  };

  const submitAssignment = async (assignment_id, file_id) => {
    try {
      // Get user_id from auth cookies
      const user_id = JSON.parse(Cookies.get("auth"))["user_id"];

      // Insert record into student_assignment_submissions table
      const { data, error } = await db_con
        .from("student_assignment_submissions")
        .insert({
          assignment_id: assignment_id,
          student_id: user_id,
          file_id: file_id,
        })
        .select(); // Return the inserted record

      if (error) throw error;

      return {
        success: true,
        submission: data[0],
        message: "Assignment submitted successfully",
      };
    } catch (error) {
      console.error("Error submitting assignment:", error);
      return {
        success: false,
        error: error.message,
        message: "Failed to submit assignment",
      };
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const formatDates = (dateString) => {
    // Create a Date object from the UTC timestamp
    const date = new Date(dateString);

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

  const formatDatesForSubmissionDate = (dateString) => {
    // Create a Date object from the local timestamp (the `created_at` attrib in `student_assignment_submissions` has a type - timestampz)
    // supabase has defalut UTC time - therefore necessary to convert to local time
    // this was different when the lecturer provided the assignment deadline - local time with local tz was passed
    const date = new Date(dateString);

    // Use toLocaleString with options to control the format
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
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

  const uploadFile = async (file, bucket, folder = "") => {
    try {
      // Get user_id from auth cookies
      const user_id = JSON.parse(Cookies.get("auth"))["user_id"];
      const email = JSON.parse(Cookies.get("auth"))["email"];

      // Create a unique file name
      const fileName = `${email}_${file.name}`;
      const filePath = folder ? `${folder}/${fileName}` : fileName;

      // Upload the file
      const { data, error } = await db_con.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      // Get the public URL
      const { data: urlData } = db_con.storage
        .from(bucket)
        .getPublicUrl(filePath);

      // Insert record into user_files table
      const { data: submissionData, error: submissionError } = await db_con
        .from("user_files")
        .insert({
          user_id: user_id,
          file_url: urlData.publicUrl,
        })
        .select();

      if (submissionError) throw submissionError;

      return {
        success: true,
        filePath,
        publicUrl: urlData.publicUrl,
        assignmentRecord: submissionData[0],
      };
    } catch (error) {
      console.error("Error uploading file:", error);
      return { success: false, error: error.message };
    }
  };

  const handleDownload = async (filePath) => {
    await downloadFile(filePath, "assignments");
  };

  const handleUpload = async (assignment_id) => {
    const file = selectedFiles[assignment_id];
    if (!file) return;

    // Update uploading state for this specific assignment
    setUploadStates((prev) => ({
      ...prev,
      [assignment_id]: true,
    }));

    const result = await uploadFile(file, "assignments");

    // Reset uploading state for this specific assignment
    setUploadStates((prev) => ({
      ...prev,
      [assignment_id]: false,
    }));

    if (result.success) {
      const fileId = result.assignmentRecord.user_files_id;

      // Clear the file input for this specific assignment
      setSelectedFiles((prev) => ({
        ...prev,
        [assignment_id]: null,
      }));

      // Reset file input
      const fileInput = document.getElementById(`file-upload-${assignment_id}`);
      if (fileInput) fileInput.value = "";

      // Submit assignment
      handleAssignmentSubmission(assignment_id, fileId);
    } else {
      alert(`Upload failed: ${result.error}`);
    }
  };

  const handleFileChange = (assignment_id, e) => {
    setSelectedFiles((prev) => ({
      ...prev,
      [assignment_id]: e.target.files[0],
    }));
  };

  const handleAssignmentSubmission = async (assignment_id, file_id) => {
    const result = await submitAssignment(assignment_id, file_id);
    if (result.success) {
      notify();
      // Refresh assignments to update submission status
      fetchAssignments();
    } else {
      alert(`Submission failed: ${result.error}`);
    }
  };

  // Notify assignment submission
  const notify = () => {
    let message = `Assignment Submitted Successfully!`;
    toast(message);

    audio1.play();
  };

  return (
    <div>
      <h3 className="mb-4 text-xl font-semibold">Your Assignments</h3>
      <div className="overflow-x-auto border rounded-md">
        <table className="table table-zebra">
          <thead>
            <tr>
              <th>Assignment Name</th>
              <th>Class Name</th>
              <th>File</th>
              <th>Submit</th>
              <th>Deadline</th>
              <th>Status</th>
              <th>Grade</th>
              <th>Submission Date</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((assignment) => (
              <tr key={assignment.assignmentId}>
                <td>{assignment.assignmentName}</td>
                <td>{assignment.className}</td>
                <td>
                  {assignment.fileUrl ? (
                    <button
                      onClick={() =>
                        handleDownload(extractFileName(assignment.fileUrl))
                      }
                      className="w-full text-white btn btn-success btn-sm sm:w-fit"
                    >
                      <Download />
                    </button>
                  ) : (
                    "No file"
                  )}
                </td>
                <td>
                  <div className="flex flex-col items-center gap-3 sm:flex-row">
                    <input
                      id={`file-upload-${assignment.assignmentId}`}
                      type="file"
                      onChange={(e) =>
                        handleFileChange(assignment.assignmentId, e)
                      }
                      className="w-full file-input file-input-bordered file-input-sm"
                    />
                    <button
                      onClick={() => handleUpload(assignment.assignmentId)}
                      disabled={
                        !selectedFiles[assignment.assignmentId] ||
                        uploadStates[assignment.assignmentId]
                      }
                      className="text-white w-fit btn btn-success btn-sm"
                    >
                      {uploadStates[assignment.assignmentId] ? (
                        <span className="loading loading-dots loading-lg"></span>
                      ) : (
                        <Upload />
                      )}
                    </button>
                  </div>
                </td>

                <td>{formatDates(assignment.deadline)}</td>
                <td>
                  {assignment.assignmentStatus === "Submitted" ? (
                    <span className="p-1 font-mono text-xs font-semibold text-white rounded text-nowrap bg-success">
                      Submitted
                    </span>
                  ) : (
                    <span className="p-1 font-mono text-xs font-semibold text-white rounded bg-error text-nowrap">
                      Not Submitted
                    </span>
                  )}
                </td>
                <td className="font-semibold">
                  {assignment.studentGrade
                    ? assignment.studentGrade
                    : "Not Graded"}
                </td>
                <td>
                  {assignment.assignmentStatus === "Submitted"
                    ? formatDatesForSubmissionDate(assignment.submissionDate)
                    : "--:--"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ToastContainer />
    </div>
  );
}

export default AssignmentPortal;
