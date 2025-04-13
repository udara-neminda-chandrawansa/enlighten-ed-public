import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import Cookies from "js-cookie";
import {
  Send,
  FileUpIcon,
  FileIcon,
  Activity,
  ActivitySquare,
  Download,
  Upload,
} from "lucide-react";
import db_con from "./dbconfig";

const socket = io("https://enlighten-ed.onrender.com", {
  path: "/socket.io", // Explicitly set the socket.io path
  // path: '/',
  transports: ["websocket"],
  withCredentials: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

const getRecieverName = async (receiver, receiverType) => {
  try {
    if (receiverType === "individual") {
      const { data, error } = await db_con
        .from("users")
        .select("username")
        .eq("user_id", receiver)
        .single();

      if (error) {
        console.log("User loading error:", error.message);
        return { success: false, message: "Load Failed!" };
      }

      return { success: true, data };
    } else {
      const { data, error } = await db_con
        .from("classrooms")
        .select("classname")
        .eq("class_id", receiver)
        .single();

      if (error) {
        console.log("Group loading error:", error.message);
        return { success: false, message: "Load Failed!" };
      }

      return { success: true, data };
    }
  } catch (error) {
    console.error("Error:", error);
    return { success: false, message: "Something went wrong!" };
  }
};

const saveMsg = async (msg_from, msg_from_name, msg_to, msg_content) => {
  try {
    // Use socket for individual messages
    return new Promise((resolve, reject) => {
      socket.emit("sendMessage", {
        type: "individual",
        from: msg_from,
        from_name: msg_from_name,
        to: msg_to,
        content: msg_content,
      });

      // Listen for confirmation
      socket.once("messageSaved", (response) => {
        if (response.success) {
          resolve({ success: true, user: response.message });
        } else {
          console.log("Save error:", response.error);
          reject({ success: false, message: "Save Failed!" });
        }
      });

      // Add timeout for error handling
      setTimeout(() => {
        reject({ success: false, message: "Server response timeout" });
      }, 5000);
    });
  } catch (error) {
    console.error("Error:", error);
    return { success: false, message: "Something went wrong!" };
  }
};

const saveGrpMsg = async (msg_from, group_id, msg_content) => {
  try {
    // Use socket for group messages
    return new Promise((resolve, reject) => {
      socket.emit("sendMessage", {
        type: "group",
        from: msg_from,
        group_id: group_id,
        content: msg_content,
      });

      // Listen for confirmation
      socket.once("messageSaved", (response) => {
        if (response.success) {
          resolve({ success: true, user: response.message });
          console.log("Success!");
        } else {
          console.log("Save error:", response.error);
          reject({ success: false, message: "Save Failed!" });
        }
      });

      // Add timeout for error handling
      setTimeout(() => {
        reject({ success: false, message: "Server response timeout" });
      }, 5000);
    });
  } catch (error) {
    console.error("Error:", error);
    return { success: false, message: "Something went wrong!" };
  }
};

const getMsgsFromInd = async (receiver) => {
  try {
    const { data, error } = await db_con
      .from("messages")
      .select("msg_from, msg_from_name, msg_to, msg_content, created_at")
      .or(
        `msg_from.eq.${JSON.parse(Cookies.get("auth"))["user_id"]},msg_to.eq.${
          JSON.parse(Cookies.get("auth"))["user_id"]
        }`
      )
      .or(`msg_from.eq.${receiver},msg_to.eq.${receiver}`)
      .order("created_at", { ascending: true });

    if (error) {
      console.log("Messages Loading error:", error.message);
      return { success: false, message: "Load Failed!" };
    }
    return { success: true, msgs: data };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, message: "Something went wrong!" };
  }
};

const getMsgsFromGrp = async (group_id) => {
  try {
    const { data, error } = await db_con
      .from("group_messages")
      .select(
        "msg_from, group_id, msg_content, created_at, users:msg_from(username)"
      )
      .eq("group_id", group_id)
      .order("created_at", { ascending: true });

    if (error) {
      console.log("Messages Loading error:", error.message);
      return { success: false, message: "Load Failed!" };
    }

    // Transform the data to flatten the structure
    const flattenedData = data.map((message) => ({
      msg_from: message.msg_from,
      group_id: message.group_id,
      msg_content: message.msg_content,
      created_at: message.created_at,
      msg_from_name: message.users.username,
    }));

    return { success: true, msgs: flattenedData };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, message: "Something went wrong!" };
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
    const { data: uploadData, error: uploadError } = await db_con
      .from("user_files")
      .insert({
        user_id: user_id,
        file_url: urlData.publicUrl,
      })
      .select();

    if (uploadError) throw uploadError;

    return {
      success: true,
      filePath,
      publicUrl: urlData.publicUrl,
      uploadRecord: uploadData[0],
    };
  } catch (error) {
    console.error("Error uploading file:", error);
    return { success: false, error: error.message };
  }
};

const saveActivity = async (groupId, actTitle, actDesc, actDue, actFile) => {
  try {
    // Insert new activity
    const { data, error } = await db_con
      .from("group_activities")
      .insert([
        {
          group_id: groupId,
          activity_title: actTitle,
          activity_file: actFile,
          activity_desc: actDesc,
          activity_due: actDue,
        },
      ])
      .select()
      .single();

    if (error) {
      console.log("Save error:", error.message);
      return { success: false, message: "Save Failed!" };
    }

    return { success: true, user: data };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, message: "Something went wrong!" };
  }
};

const submitActivity = async (activity_id, file_id) => {
  try {
    // update activity
    const { data, error } = await db_con
      .from("group_activities")
      .update([{ submitted_file: file_id, submitted_at: new Date() }])
      .eq("activity_id", activity_id)
      .select()
      .single();

    if (error) {
      console.log("Save error:", error.message);
      return { success: false, message: "Save Failed!" };
    }

    return { success: true, user: data };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, message: "Something went wrong!" };
  }
};

const getActivities = async (group_id) => {
  try {
    const { data, error } = await db_con
      .from("group_activities")
      .select(
        `
        activity_id,
        group_id,
        activity_title,
        activity_desc,
        activity_file,
        created_at,
        activity_due,
        submitted_at,
        act_files:user_files!group_activities_activity_file_fkey(
          file_url
        ),
        sub_files:user_files!group_activities_submitted_file_fkey(
          file_url
        )
        `
      )
      .order("activity_id", { ascending: true })
      .eq("group_id", group_id);

    if (error) {
      console.log("Activities loading error:", error.message);
      return { success: false, message: "Load Failed!" };
    }

    const transformedData = data.map((activity) => ({
      ...activity,
      activity_file_url: activity.act_files?.file_url || null,
      submission_file_url: activity.sub_files?.file_url || null,
    }));

    return { success: true, data: transformedData };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, message: "Something went wrong!" };
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

const getAdvancedStatus = async () => {
  try {
    const { data, error } = await db_con
      .from("classrooms")
      .select("adv_student")
      .eq("adv_student", JSON.parse(Cookies.get("auth"))["user_id"]);

    if (error) {
      console.log("Status Loading error:", error.message);
      return { success: false, message: "Load Failed!" };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, message: "Something went wrong!" };
  }
};

function ChatApp({ receiver, recieverType }) {
  const userID = JSON.parse(Cookies.get("auth"))["user_id"];
  const username = JSON.parse(Cookies.get("auth"))["username"];
  const userType = JSON.parse(Cookies.get("auth"))["user_type"];
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [messagesFromDB, setMessagesFromDB] = useState([]);
  const messagesEndRef = useRef(null);

  const [receiverName, setReceiverName] = useState("");

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [activityTitle, setActivityTitle] = useState("");
  const [activityDesc, setActivityDesc] = useState("");
  const [activityDue, setActivityDue] = useState("");
  const [activityFile, setActivityFile] = useState(null);

  const [activities, setActivities] = useState([]);

  const [activitySubmissionFile, setActivitySubmissionFile] = useState(null);

  const [fileSendingAllowed, allowFileSending] = useState(false);

  {
    /*
  useEffect(()=>{
    console.log(recieverObj);
  }, [recieverObj])
  */
  }

  const getFilePublicUrl = (filePath, bucket) => {
    const { data } = db_con.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    const result = await uploadFile(selectedFile, "personal-files");
    setUploading(false);

    if (result.success) {
      setSelectedFile(null);
      // Reset file input
      document.getElementById("file-upload").value = "";

      // Save private messages to DB
      if (receiver !== "0") {
        // Send file info via msgs & Refresh msgs (via node for real-time feel)
        const messageData = {
          sender: userID,
          senderName: username,
          receiver: receiver,
          content: result.filePath,
          type: "message",
          timestamp: new Date().toISOString(),
        };

        socket.emit("send message", messageData);

        // send msg to db
        if (recieverType === "individual") {
          const saveResult = await saveMsg(
            userID,
            username,
            receiver,
            JSON.stringify({
              type: "file",
              fileName: selectedFile.name,
              filePath: result.filePath,
              publicUrl: getFilePublicUrl(result.filePath, "personal-files"),
            })
          );
          if (!saveResult.success) {
            throw new Error("Failed to save message to database");
          }
        } else {
          const saveResult = await saveGrpMsg(
            userID,
            receiver,
            JSON.stringify({
              type: "file",
              fileName: selectedFile.name,
              filePath: result.filePath,
              publicUrl: getFilePublicUrl(result.filePath, "personal-files"),
            })
          );
          if (!saveResult.success) {
            throw new Error("Failed to save message to database");
          }
        }
      } else {
        alert("You cannot upload files to the Public Channel!");
      }
      return { success: true, filePath: result.filePath };
    } else {
      alert(`Upload failed: ${result.error}`);
    }
  };

  const fetchReceiverName = async () => {
    const result = await getRecieverName(receiver, recieverType);

    if (result.success) {
      setReceiverName(
        result.data.username
          ? result.data.username
          : result.data.classname
          ? result.data.classname
          : "No Reciever Name"
      );
    } else {
      alert("Failed fetching reciever name!");
    }
  };

  const fetchActivities = async () => {
    const result = await getActivities(receiver);

    if (result.success) {
      setActivities(result.data);
    } else {
      alert("Failed fetching activities!");
    }
  };

  useEffect(() => {
    const fetchMessages = async () => {
      if (recieverType === "individual") {
        const result = await getMsgsFromInd(receiver);
        if (result.success) {
          setMessagesFromDB(result.msgs);
        } else {
          console.log("Message:", result.message);
        }
      } else {
        const result2 = await getMsgsFromGrp(receiver);
        if (result2.success) {
          setMessagesFromDB(result2.msgs);
        } else {
          console.log("Message:", result2.message);
        }
      }
    };
    fetchMessages();

    // Set up socket listener for new messages
    const handleNewMessage = () => {
      fetchMessages();
    };

    socket.on("newMessage", handleNewMessage);

    // Clean up socket listener
    return () => {
      socket.off("newMessage", handleNewMessage);
    };
  }, [receiver]);

  useEffect(() => {
    socket.on("send message", (data) => {
      if (
        data.sender === userID ||
        data.receiver === userID ||
        receiver === "0"
      ) {
        setMessages((prevMessages) => [...prevMessages, data]);
      }
    });

    return () => {
      socket.off("send message");
    };
  }, []);

  useEffect(() => {
    if (receiver !== "0") {
      fetchReceiverName();
      if (recieverType !== "individual") {
        fetchActivities();
      }
    }
  }, []);

  useEffect(() => {
    const messageContainer = document.getElementById("message-container");
    messageContainer.scrollTop = messageContainer.scrollHeight;
  }, [messages, messagesFromDB]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!userID) return; // Early return if no user ID

    try {
      // Text message only
      if (message) {
        const messageData = {
          sender: userID,
          senderName: username,
          receiver: receiver,
          content: message,
          type: "message",
          timestamp: new Date().toISOString(),
        };

        socket.emit("send message", messageData);

        // Save private messages to DB
        if (receiver !== "0") {
          if (recieverType === "individual") {
            const saveResult = await saveMsg(
              userID,
              username,
              receiver,
              message
            );
            if (!saveResult.success) {
              throw new Error("Failed to save message to database");
            }
          } else {
            const saveResult = await saveGrpMsg(userID, receiver, message);
            if (!saveResult.success) {
              throw new Error("Failed to save message to database");
            }
          }
        }
      } else {
        // No message or file selected
        return;
      }

      // Clear message input regardless of path taken
      setMessage("");
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      alert(error.message || "An error occurred");
    }
  };

  const formatDatesForDueDate = (dateString) => {
    const date = new Date(dateString);

    // Use toLocaleString with options to control the format
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZone: "UTC",
    });
  };

  const handleCreatingActivity = async () => {
    // upload file first
    const fileUpResult = await uploadFile(activityFile, "personal-files");

    // then save record
    if (fileUpResult.success) {
      // save
      const saveResult = await saveActivity(
        receiver,
        activityTitle,
        activityDesc,
        activityDue,
        fileUpResult.uploadRecord.user_files_id
      );

      if (saveResult.success) {
        alert("Activity Saved Successfully! Page will be reloaded now.");
        window.location.reload();
      } else {
        alert("Activity Saving Failed!");
      }
    } else {
      alert("File Upload Error: " + fileUpResult.error);
    }
  };

  const handleDownload = async (filePath) => {
    await downloadFile(filePath, "personal-files");
  };

  const extractFileName = (url) => {
    return url.split("personal-files/")[1];
  };

  const handleActivitySubmission = async (activity_id) => {
    // first upload file
    const fileUpResult = await uploadFile(
      activitySubmissionFile,
      "personal-files"
    );

    if (fileUpResult.success) {
      // then create record
      const submissionResult = await submitActivity(
        activity_id,
        fileUpResult.uploadRecord.user_files_id
      );

      if (submissionResult.success) {
        alert("Activity Submission Successfull! Page will be reloaded now.");
        window.location.reload();
      } else {
        alert("Activity Submission Failed!");
      }
    } else {
      alert("File Upload Error: " + fileUpResult.error);
    }
  };

  const fetchAdvancedStatus = async () => {
    const result = await getAdvancedStatus();

    if (result.success) {
      if (result.data.length > 0) {
        allowFileSending(true);
      }
    } else {
      alert("Status Loading Error!");
    }
  };

  useEffect(() => {
    if (JSON.parse(Cookies.get("auth"))["user_type"] === "student") {
      // fetch advanced status for the logged in student
      fetchAdvancedStatus();
    } else {
      // lecturers are allowed to send files
      allowFileSending(true);
    }
  }, []);

  return (
    <div className="flex flex-col w-full">
      <div className="flex items-center justify-between w-full p-2 text-sm font-semibold rounded bg-base-200">
        <p>{receiverName ? receiverName : "Public Channel"}</p>
        {recieverType !== "individual" && receiverName && (
          <button
            className="px-1 btn btn-ghost btn-xs"
            onClick={() =>
              document.getElementById("grpActivitiesDisplayModal").showModal()
            }
          >
            <ActivitySquare />
          </button>
        )}
      </div>
      <div
        id="message-container"
        className="flex-grow h-[68dvh] lg:h-[65dvh] overflow-y-scroll scroll-smooth no-scrollbar"
      >
        {receiver === "0"
          ? messages.map((msg, index) => (
              <div
                key={index}
                className={`chat ${
                  msg.sender === userID ? "chat-end" : "chat-start"
                }`}
              >
                <div className="chat-header">
                  {msg.senderName}
                  <time className="ml-2 text-xs opacity-50">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </time>
                </div>
                <div className="chat-bubble">{msg.content}</div>
                <div className="opacity-50 chat-footer">Sent</div>
              </div>
            ))
          : messagesFromDB.length > 0
          ? messagesFromDB.map((msg, index) => (
              <div
                key={index}
                className={`chat ${
                  msg["msg_from"] === userID ? "chat-end" : "chat-start"
                }`}
              >
                <div className="chat-header">
                  {msg["msg_from_name"]}
                  <time className="ml-2 text-xs opacity-50">
                    {new Date(msg["created_at"]).toLocaleTimeString()}
                  </time>
                </div>
                <div className="chat-bubble">
                  {(() => {
                    // For messages that might be JSON (file attachments)
                    if (
                      typeof msg["msg_content"] === "string" &&
                      msg["msg_content"].startsWith("{")
                    ) {
                      try {
                        const fileData = JSON.parse(msg["msg_content"]);
                        if (fileData.type === "file") {
                          return (
                            <a
                              href={fileData.publicUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center text-blue-500 underline"
                            >
                              <FileIcon className="mr-2" size={16} />
                              Download {fileData.fileName}
                            </a>
                          );
                        }
                        // JSON parsed successfully but not a file
                        return <p>{msg["msg_content"]}</p>;
                      } catch (e) {
                        // Not valid JSON, treat as regular message
                        return <p>{msg["msg_content"]}</p>;
                      }
                    }
                    // For regular text messages
                    else {
                      return <p>{msg["msg_content"]}</p>;
                    }
                  })()}
                </div>
                <div className="opacity-50 chat-footer">Sent</div>
              </div>
            ))
          : ""}
        <div ref={messagesEndRef} />
      </div>
      <div className="flex items-center justify-between w-full gap-3 pt-3">
        <form
          onSubmit={handleSubmit}
          className="flex items-center w-full gap-3"
        >
          <input
            type="text"
            placeholder="Message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full input input-bordered"
            required
          />
          <button
            type="submit"
            className="p-2 text-white bg-blue-500 rounded-md hover:bg-blue-600"
          >
            <Send />
          </button>
        </form>
        {receiver !== "0" && fileSendingAllowed && (
          <div className="flex items-center gap-3">
            <label
              htmlFor="file-upload"
              className="p-2 text-white rounded-md cursor-pointer bg-success hover:bg-success/90"
            >
              <input
                type="file"
                id="file-upload"
                onChange={(e) => {
                  setSelectedFile(e.target.files[0]),
                    document.getElementById("uploadModal").showModal();
                }}
                className="hidden"
                accept=".doc,.docx,.xml,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              />
              <FileUpIcon />
            </label>
          </div>
        )}
        {userType === "lecturer" &&
          receiver !== "0" &&
          recieverType !== "individual" && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  document.getElementById("grpActivityModal").showModal();
                }}
                className="p-2 text-white rounded-md cursor-pointer bg-lime-600 hover:bg-lime-400"
              >
                <Activity />
              </button>
            </div>
          )}
      </div>

      {/*file upload modal*/}
      <dialog id="uploadModal" className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-bold">Upload File</h3>
          <div className="flex flex-col gap-3 pt-4">
            <div className="flex items-center justify-between gap-3">
              <p>
                {selectedFile
                  ? selectedFile.name
                  : receiver !== "0"
                  ? "Uploading Finished!"
                  : "Upload failed!"}
              </p>
              {selectedFile && (
                <button
                  className={`text-white btn btn-success`}
                  disabled={uploading}
                  onClick={handleUpload}
                >
                  Upload
                </button>
              )}
            </div>
            <div className="flex justify-center">
              {uploading && (
                <span className="loading loading-dots loading-lg"></span>
              )}
            </div>
          </div>
          <form method="dialog">
            <button className="absolute btn btn-sm btn-circle btn-ghost right-2 top-2">
              ✕
            </button>
          </form>
        </div>
      </dialog>

      {/*group activities display modal*/}
      <dialog id="grpActivitiesDisplayModal" className="modal">
        <div className="max-w-3xl modal-box">
          <h3 className="text-lg font-bold">Group Activities</h3>
          <div className="">
            <div className="mt-4 overflow-x-auto border">
              <table className="table table-zebra">
                {/* Table Head */}
                <thead>
                  <tr>
                    <th>Activity Name</th>
                    <th>Description</th>
                    <th>Activity File</th>
                    <th>Due</th>
                    <th>Created At</th>
                    <th>Submission</th>
                  </tr>
                </thead>
                {/* Table Body */}
                <tbody>
                  {activities.map((activity, index) => (
                    <tr key={index}>
                      <td>{activity.activity_title}</td>
                      <td>{activity.activity_desc}</td>
                      <td>
                        {activity.activity_file_url ? (
                          <button
                            onClick={() =>
                              handleDownload(
                                extractFileName(activity.activity_file_url)
                              )
                            }
                            className="text-white btn btn-success btn-sm w-fit"
                          >
                            <Download />
                          </button>
                        ) : (
                          "No file"
                        )}
                      </td>
                      <td>{formatDatesForDueDate(activity.activity_due)}</td>
                      <td>{new Date(activity.created_at).toLocaleString()}</td>

                      <td>
                        {userType === "lecturer" ? (
                          <div className="flex items-center gap-2">
                            <p>
                              {activity.submitted_at
                                ? new Date(
                                    activity.submitted_at
                                  ).toLocaleString()
                                : "--:--"}
                            </p>
                            {activity.submitted_at && (
                              <button
                                className="text-white btn btn-success btn-sm w-fit"
                                onClick={() =>
                                  handleDownload(
                                    extractFileName(
                                      activity.submission_file_url
                                    )
                                  )
                                }
                              >
                                <Download />
                              </button>
                            )}
                          </div>
                        ) : userType === "student" ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="file"
                              className="file-input file-input-bordered file-input-sm"
                              onChange={(e) => {
                                setActivitySubmissionFile(e.target.files[0]);
                              }}
                            />
                            <button
                              className="text-white btn btn-secondary btn-sm w-fit"
                              onClick={() =>
                                handleActivitySubmission(activity.activity_id)
                              }
                            >
                              <Upload />
                            </button>
                          </div>
                        ) : (
                          <p>No access!</p>
                        )}
                      </td>
                    </tr>
                  ))}
                  {activities.length === 0 && (
                    <tr>
                      <td colSpan="5" className="py-4 text-center">
                        No data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <form method="dialog">
            <button className="absolute btn btn-sm btn-circle btn-ghost right-2 top-2">
              ✕
            </button>
          </form>
        </div>
      </dialog>

      {/*grp activity creation modal*/}
      <dialog id="grpActivityModal" className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-bold">Create Group Activity</h3>
          <div className="flex flex-col gap-3 pt-4">
            <p>Activity Title</p>
            <input
              type="text"
              className="input input-bordered"
              placeholder="Sample Activity"
              value={activityTitle}
              onChange={(e) => setActivityTitle(e.target.value)}
            />
            <p>Activity Description</p>
            <textarea
              className="input input-bordered"
              placeholder="Explain activity scope"
              value={activityDesc}
              onChange={(e) => setActivityDesc(e.target.value)}
            ></textarea>
            <p>Select File</p>
            <input
              type="file"
              className="file-input file-input-bordered"
              onChange={(e) => {
                setActivityFile(e.target.files[0]);
              }}
              accept=".doc,.docx,.xml,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            />
            <p>Due Date</p>
            <input
              type="datetime-local"
              className="input input-bordered"
              value={activityDue}
              onChange={(e) => setActivityDue(e.target.value)}
            />
            <button
              className="btn btn-sm btn-primary"
              onClick={() => handleCreatingActivity()}
            >
              Create Activity
            </button>
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

export default ChatApp;
