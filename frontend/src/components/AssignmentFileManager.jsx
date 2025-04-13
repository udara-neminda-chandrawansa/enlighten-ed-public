import React, { useState, useEffect } from "react";
import db_con from "./dbconfig";
import { Download, Upload, Trash, Link } from "lucide-react";
import Cookies from "js-cookie";

function AssignmentFileManager({ bucketName }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [selectedAssignmentName, setSelectedAssignmentName] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFileID, setSelectedFileID] = useState(0);
  const [selectedClass, setSelectedClass] = useState(0);
  const [selectedDeadline, setSelectedDeadline] = useState("");
  const userType = JSON.parse(Cookies.get("auth"))["user_type"];
  const [myClasses, setMyClasses] = useState([]);

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

  const createClassAssignment = async (assignmentName, classId, fileId) => {
    try {
      // Insert record into class_assignments table
      const { data, error } = await db_con
        .from("class_assignments")
        .insert({
          assignment_name: assignmentName,
          class_id: classId,
          file_id: fileId,
          deadline: selectedDeadline,
        })
        .select();

      if (error) throw error;

      return {
        success: true,
        assignment: data[0],
      };
    } catch (error) {
      console.error("Error creating class assignment:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  };

  const uploadFile = async (file, bucket, folder = "") => {
    try {
      // Get user_id, email from auth cookies
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
      const { data: assignmentData, error: assignmentError } = await db_con
        .from("user_files")
        .insert({
          user_id: user_id,
          file_url: urlData.publicUrl,
        })
        .select();

      if (assignmentError) throw assignmentError;

      return {
        success: true,
        filePath,
        publicUrl: urlData.publicUrl,
        assignmentRecord: assignmentData[0],
      };
    } catch (error) {
      console.error("Error uploading file:", error);
      return { success: false, error: error.message };
    }
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

  const listUsersFiles = async (bucket, folder = "") => {
    try {
      // Get user_id from auth cookies
      const user_id = JSON.parse(Cookies.get("auth"))["user_id"];

      // First, get the file URLs and IDs uploaded by this user
      const { data: assignmentData, error: assignmentError } = await db_con
        .from("user_files")
        .select("user_files_id, file_url")
        .eq("user_id", user_id);

      if (assignmentError) throw assignmentError;

      // List all files in the bucket
      const { data, error } = await db_con.storage.from(bucket).list(folder);

      if (error) throw error;

      // Filter to include only .docx files uploaded by the user
      const docxFiles = data
        .filter((file) => {
          const fullFileUrl = db_con.storage
            .from(bucket)
            .getPublicUrl(folder ? `${folder}/${file.name}` : file.name)
            .data.publicUrl;

          // Find the matching assignment data
          const matchingAssignment = assignmentData.find(
            (assignment) => assignment.file_url === fullFileUrl
          );

          return (
            file.name.toLowerCase().endsWith(".docx") && matchingAssignment
          );
        })
        .map((file) => {
          // Find the corresponding user_files_id
          const fullFileUrl = db_con.storage
            .from(bucket)
            .getPublicUrl(folder ? `${folder}/${file.name}` : file.name)
            .data.publicUrl;

          const matchingAssignment = assignmentData.find(
            (assignment) => assignment.file_url === fullFileUrl
          );

          return {
            ...file,
            user_files_id: matchingAssignment
              ? matchingAssignment.user_files_id
              : null,
          };
        });

      return {
        success: true,
        files: docxFiles,
      };
    } catch (error) {
      console.error("Error listing files:", error);
      return { success: false, error: error.message };
    }
  };

  const deleteFile = async (filePath, bucket) => {
    try {
      const { error } = await db_con.storage.from(bucket).remove([filePath]);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error("Error deleting file:", error);
      return { success: false, error: error.message };
    }
  };

  useEffect(() => {
    fetchFiles();
    if (userType === "lecturer") {
      fetchMyClasses();
    }
  }, []);

  const fetchMyClasses = async () => {
    const result = await getMyClasses();
    if (result.success) {
      setMyClasses(result.classes);
    } else {
      console.log("Message:", result.message);
    }
  };

  const fetchFiles = async () => {
    const result = await listUsersFiles(bucketName);
    if (result.success) {
      setFiles(result.files);
    }
  };

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    const result = await uploadFile(selectedFile, bucketName);
    setUploading(false);

    if (result.success) {
      setSelectedFile(null);
      // Reset file input
      document.getElementById("file-upload").value = "";
      // Refresh file list
      fetchFiles();
    } else {
      alert(`Upload failed: ${result.error}`);
    }
  };

  const handleDownload = async (filePath) => {
    await downloadFile(filePath, bucketName);
  };

  const handleDelete = async (filePath) => {
    if (window.confirm("Are you sure you want to delete this file?")) {
      const result = await deleteFile(filePath, bucketName);
      if (result.success) {
        fetchFiles();
      } else {
        alert(`Delete failed: ${result.error}`);
      }
    }
  };

  const handleAssignmentCreation = async () => {
    if (
      selectedClass !== 0 &&
      selectedAssignmentName !== "" &&
      selectedDeadline !== ""
    ) {
      const result = await createClassAssignment(
        selectedAssignmentName,
        selectedClass,
        selectedFileID
      );

      if (result.success) {
        alert(`Assignment Creation successful! The page will be reloaded now.`);
        window.location.reload();
      } else {
        alert(`Assignment Creation failed: ${result.error}`);
      }
    } else {
      alert("Invalid input! Check again.");
    }
  };

  return (
    <div className="mt-2">
      {/* Upload section */}
      <div className="p-4 mb-2 border rounded">
        <h3 className="mb-4 font-medium">Upload New File</h3>
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <input
            id="file-upload"
            type="file"
            onChange={handleFileChange}
            className="w-full sm:max-w-xs file-input file-input-bordered file-input-sm"
          />
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="w-full text-white btn btn-success btn-sm sm:w-fit"
          >
            <Upload />
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>

      {/* File list section */}
      <div>
        <h3 className="mb-2 font-medium">Your Files</h3>
        {files.length === 0 ? (
          <p className="text-gray-500">No files found</p>
        ) : (
          <ul className="border divide-y rounded">
            {files.map((file) => (
              <li
                key={file.id}
                className="flex flex-col items-center justify-between gap-3 p-3 sm:flex-row"
              >
                <span className="max-w-md truncate">{file.name}</span>
                <div className="flex flex-col items-center gap-3 sm:flex-row">
                  {bucketName === "assignments" && userType === "lecturer" ? (
                    <button
                      onClick={() => {
                        setSelectedFileID(file.user_files_id);
                        document.getElementById("linkToClassModal").showModal();
                      }}
                      className="w-full btn btn-sm sm:w-fit"
                    >
                      <Link />
                      Link to Class
                    </button>
                  ) : (
                    ""
                  )}
                  <button
                    onClick={() => handleDownload(file.name)}
                    className="w-full text-white btn btn-success btn-sm sm:w-fit"
                  >
                    <Download />
                    Download
                  </button>
                  <button
                    onClick={() => handleDelete(file.name)}
                    className="w-full text-white btn btn-error btn-sm sm:w-fit"
                  >
                    <Trash />
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/*Link to Class modal*/}
      <dialog id="linkToClassModal" className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-bold">Link to Class</h3>
          <div className="flex flex-col gap-3 mt-3">
            <p>Assignment Name</p>
            <input
              type="text"
              className="input input-bordered"
              value={selectedAssignmentName}
              onChange={(e) => setSelectedAssignmentName(e.target.value)}
              required
            />
            <p>Select Class</p>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
              }}
              className="select select-bordered"
              required
            >
              <option value="0">Select a class</option>
              {myClasses.length > 0 &&
                myClasses.map((vclass, index) => (
                  <option key={index} value={vclass.class_id}>
                    {vclass.classname}
                  </option>
                ))}
              {myClasses.length === 0 && <option value="0">No Classes!</option>}
            </select>
            <p>Select Deadline</p>
            <input
              type="datetime-local"
              className="input input-bordered"
              value={selectedDeadline}
              onChange={(e) => setSelectedDeadline(e.target.value)}
              required
            />
            <div className="flex justify-end">
              <button
                className="btn"
                onClick={() => handleAssignmentCreation()}
              >
                <Link />
                Link
              </button>
            </div>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </div>
  );
}

export default AssignmentFileManager;
