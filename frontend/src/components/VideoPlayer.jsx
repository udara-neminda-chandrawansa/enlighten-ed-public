import { SocketContext } from "../Context";
import { useContext, useEffect, useState } from "react";
import Cookies from "js-cookie";
import Options from "./Options";
import Notifications from "./Notifications";
import db_con from "./dbconfig";

const getMyLecturers = async () => {
  try {
    const { data, error } = await db_con
      .from("classrooms_students")
      .select("class_id, classrooms!classrooms_students_class_id_fkey(lecturer_id, users!classrooms_lecturer_id_fkey(username))") // Select lecturer_id from classrooms
      .eq("student_id", JSON.parse(Cookies.get("auth"))["user_id"]);

    if (error) {
      console.log("Lecturers Loading error:", error.message);
      return { success: false, message: "Load Failed!" };
    }

    // Extract unique lecturers
    const uniqueLecturers = [];
    const lecturerIds = new Set();

    data.forEach((item) => {
      const lecturerId = item.classrooms.lecturer_id;
      if (!lecturerIds.has(lecturerId)) {
        lecturerIds.add(lecturerId);
        uniqueLecturers.push({
          lecturer_id: lecturerId,
          username: item.classrooms.users.username,
        });
      }
    });

    return { success: true, lecturers: uniqueLecturers };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, message: "Something went wrong!" };
  }
};

const VideoPlayer = () => {
  const [meetingMode, setMeetingMode] = useState("peer-peer");
  const [classroomName, setClassroomName] = useState("Test Class");
  const { myVideo, userVideo } = useContext(SocketContext);
  const { startClassroom, joinClassroom } = useContext(SocketContext);
  const [myLecturers, setMyLecturers] = useState([]);
  const [selectedLecturer, setSelectedLecturer] = useState(0);

  const fetchLectuerers = async () => {
    const response = await getMyLecturers();

    if (response.success) {
      setMyLecturers(response.lecturers);
    } else {
      alert("Lecturer loading failed!");
    }
  };

  useEffect(() => {
    fetchLectuerers();
  }, []);

  return (
    <div className="flex flex-col gap-6 max-md:flex-col">
      <div className="w-full">
        <button
          className={`m-2 btn ${
            meetingMode === "virt-class" ? "btn-active text-white" : ""
          }`}
          onClick={() => {
            setMeetingMode("virt-class");
            document.getElementById("virtClassModal").showModal();
          }}
        >
          Virtual Classroom Mode
        </button>
        <button
          className={`m-2 btn ${
            meetingMode === "peer-peer" ? "btn-active text-white" : ""
          }`}
          onClick={() => {
            setMeetingMode("peer-peer");
          }}
        >
          Peer to Peer Mode
        </button>
        {meetingMode === "virt-class" && (
          <div
            id="jitsi-container"
            className="border-y"
            style={{ width: "100%", height: "500px" }}
          ></div>
        )}
        {meetingMode === "peer-peer" && (
          <div className="relative">
            <video
              playsInline
              ref={userVideo}
              autoPlay
              className="w-full aspect-video bg-black/20"
            />
            <div className="w-[100px] max-md:w-[50px] max-sm:w-8 absolute right-0 top-0 bg-black/50">
              <video
                playsInline
                muted
                ref={myVideo}
                autoPlay
                className="w-full aspect-video"
              />
            </div>
            <div className="flex gap-6 max-lg:flex-col lg:py-6 lg:border-y">
              <Options />
              <Notifications />
            </div>
          </div>
        )}
      </div>
      {/*modal*/}
      <dialog id="virtClassModal" className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-bold">
            Start or Join a Virtual Classroom
          </h3>
          <p className="py-4">Provide Class Name</p>
          <div className="flex flex-col gap-4">
            <input
              type="text"
              className="input input-bordered"
              value={classroomName}
              onChange={(e) => setClassroomName(e.target.value)}
            />
            {JSON.parse(Cookies.get("auth"))["user_type"] === "student" && (
              <>
                <p>Select the lecturer</p>
                <select
                  className="select select-bordered"
                  value={selectedLecturer}
                  onChange={(e) => setSelectedLecturer(e.target.value)}
                >
                  <option value="0" disabled>Select a lecturer</option>
                  {myLecturers.map((data, index) => (
                    <option value={data.lecturer_id} key={index}>
                      {data.username}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>
          <div className="modal-action">
            <form method="dialog">
              {/* if there is a button in form, it will close the modal */}
              <button className="absolute btn btn-sm btn-circle btn-ghost right-2 top-2">
                ✕
              </button>
              <button
                className="btn"
                onClick={() =>
                  JSON.parse(Cookies.get("auth"))["user_type"] === "lecturer"
                    ? startClassroom(classroomName)
                    : selectedLecturer !== 0
                    ? joinClassroom(classroomName, selectedLecturer)
                    : alert("Select a valid lecturer!")
                }
              >
                {JSON.parse(Cookies.get("auth"))["user_type"] === "lecturer"
                  ? "Start Classroom"
                  : "Join Classroom"}
              </button>
            </form>
          </div>
        </div>
      </dialog>
    </div>
  );
};
export default VideoPlayer;
