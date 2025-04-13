import { useLocation } from "wouter";
import React, { useState, useEffect, useCallback } from "react";
import Cookies from "js-cookie";
import {
  Menu,
  X,
  Video,
  Paperclip,
  Users2Icon,
  Flag,
  User2Icon,
  File,
  Users,
  School,
  Bookmark,
  LogOut,
  Calendar,
} from "lucide-react";
import VideoPlayer from "../components/VideoPlayer";
import UpdateAccount from "../components/UpdateAccount";
import VirtualClassMgmt from "../components/VirtualClassMgmt";
import ChatApp from "../components/ChatApp";
import db_con from "../components/dbconfig";
import ExamCreator from "../components/ExamCreator";
import ExamPortal from "../components/ExamPortal";
import TaskManagement from "../components/TaskManagement";
import InsMgmt from "../components/InsMgmt";
import AssignmentCreator from "../components/AssignmentCreator";
import AssignmentPortal from "../components/AssignmentPortal";
import QuizCreator from "../components/QuizCreator";
import QuizSpace from "../components/QuizSpace";
import StudentReportGen from "../components/StudentReportsGen";
import MessageContacts from "../components/MessageContacts";
import StudentPerformance from "../components/StudentPerformance";
//import Forum from "../components/Forum";

// this is to reset peer_id before user closes the browser/tab
const resetPeerID = async () => {
  try {
    // Update the user data
    const { data, error } = await db_con
      .from("users")
      .update({ peer_id: null }) // Set peer_id to null
      .eq("user_id", JSON.parse(Cookies.get("auth"))["user_id"]) // Identify the user by ID
      .select()
      .single();

    if (error) {
      console.log("Update error:", error.message);
      return { success: false, message: "Update Failed!" };
    }

    return { success: true, user: data };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, message: "Something went wrong!" };
  }
};

function Dashboard() {
  const [activeSpace, setActiveSpace] = useState("");
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [location, navigate] = useLocation();
  const [receiver, setReceiver] = useState("0"); // for messaging
  const [receiverType, setReceiverType] = useState("individual");

  // Use useCallback to prevent unnecessary re-renders
  const handleSetReceiver = useCallback((id) => {
    setReceiver(id);
  }, []);

  // auth cookie data & related methods
  const isAuthenticated = !!Cookies.get("auth");

  {
    /*
  useEffect(()=>{
    console.log(reciever);
  }, [reciever]);
    */
  }

  // logout method
  const handleLogout = () => {
    resetPeerID();
    Cookies.remove("auth");
    navigate("/sign-in");
  };
  // if auth cookie is absent, go back to login
  if (!isAuthenticated) {
    navigate("/sign-in");
    return null; // Return null to prevent rendering anything else
  }

  // this is to reset peer_id before user closes the browser/tab
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      resetPeerID();
      event.preventDefault();
      event.returnValue = ""; // Some browsers require this for the confirmation dialog
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const menuItemsForStudents = [
    [<Video />, "Video Conference"],
    [<Paperclip />, "Exam Mode"],
    [<File />, "Assignment Mode"],
    [<Users2Icon />, "Commune Space"],
    [<Flag />, "Quiz / Challenge Space"],
    [<Calendar />, "Calendar"],
    [<User2Icon />, "Account Management"],
  ];

  const menuItemsForLecturers = [
    [<School />, "Virtual Classrooms"],
    [<Video />, "Video Conference"],
    [<Users2Icon />, "Commune Space"],
    [<Paperclip />, "Exam Creation Space"],
    [<File />, "Assignment Creation Space"],
    [<Flag />, "Quiz / Challenge Creation Space"],
    [<Bookmark />, "Student Report Generation"],
    [<User2Icon />, "Account Management"],
  ];

  const menuItemsForAdmin = [
    [<School />, "Institute Management"],
    [<Users2Icon />, "Commune Space"],
    [<User2Icon />, "Account Management"],
  ];

  const menuItemsForParent = [
    [<Users2Icon />, "Commune Space"],
    [<Bookmark />, "Student Performance Details"],
    [<User2Icon />, "Account Management"],
  ];

  const renderContent = () => {
    switch (activeSpace) {
      case "Video Conference":
        return (
          <div className="p-6">
            <h2 className="mb-4 text-2xl font-bold">Video Conference Space</h2>
            <div className="flex flex-col gap-6 p-4 rounded-lg bg-base-100">
              <VideoPlayer />
              <ChatApp receiver={"0"} />
            </div>
          </div>
        );
      case "Exam Mode":
        return (
          <div className="p-6">
            <h2 className="mb-4 text-2xl font-bold">Exam Mode Space</h2>
            <div className="p-4 rounded-lg bg-base-100">
              <ExamPortal />
            </div>
          </div>
        );
      case "Quiz / Challenge Creation Space":
        return (
          <div className="p-6">
            <h2 className="mb-4 text-2xl font-bold">
              Quiz / Challenge Creation Space
            </h2>
            <div className="p-4 rounded-lg bg-base-100">
              <QuizCreator />
            </div>
          </div>
        );
      case "Assignment Mode":
        return (
          <div className="p-6">
            <h2 className="mb-4 text-2xl font-bold">Assignment Mode Space</h2>
            <div className="p-4 rounded-lg bg-base-100">
              <AssignmentPortal />
            </div>
          </div>
        );
      case "Assignment Creation Space":
        return (
          <div className="p-6">
            <h2 className="mb-4 text-2xl font-bold">
              Assignment Creation Space
            </h2>

            <div className="p-4 rounded-lg bg-base-100">
              <AssignmentCreator />
            </div>
          </div>
        );
      case "Exam Creation Space":
        return (
          <div className="p-6">
            <h2 className="mb-4 text-2xl font-bold">Exam Creation Space</h2>
            <div className="p-4 rounded-lg bg-base-100">
              <ExamCreator />
            </div>
          </div>
        );
      case "Virtual Classrooms":
        return (
          <div className="p-6">
            <h2 className="mb-4 text-2xl font-bold">
              Virtual Classrooms Space
            </h2>
            <div className="p-4 rounded-lg bg-base-100">
              <VirtualClassMgmt />
            </div>
          </div>
        );
      case "Student Report Generation":
        return (
          <div className="p-6">
            <h2 className="mb-4 text-2xl font-bold">
              Student Report Generation Space
            </h2>
            <div className="p-4 rounded-lg bg-base-100">
              <StudentReportGen />
            </div>
          </div>
        );
      case "Commune Space":
        return (
          <div className="p-6">
            <h2 className="mb-4 text-2xl font-bold">Commune Space</h2>
            <div className="p-4 rounded-lg bg-base-100">
              <div className="flex max-md:flex-col">
                <div className="flex flex-col gap-2 md:border-r md:pr-2 md:mr-2 md:w-1/2">
                  <div
                    className={`px-2 py-3 cursor-pointer rounded-md bg-base-200 ${
                      receiver === "0" ? "border shadow-md font-semibold" : ""
                    }`}
                    onClick={() => handleSetReceiver("0")}
                  >
                    <span className="mr-2">🌍</span>
                    Public Channel
                  </div>

                  <MessageContacts
                    receiver={receiver}
                    setReceiver={handleSetReceiver}
                    setReceiverType={setReceiverType}
                  />
                </div>
                <ChatApp receiver={receiver} recieverType={receiverType} />
              </div>
            </div>
          </div>
        );
      case "Quiz / Challenge Space":
        return (
          <div className="p-6">
            <h2 className="mb-4 text-2xl font-bold">Quiz / Challenge Space</h2>
            <div className="p-4 rounded-lg bg-base-100">
              <QuizSpace />
            </div>
          </div>
        );
      case "Calendar":
        return (
          <div className="p-6">
            <h2 className="mb-4 text-2xl font-bold">Calendar</h2>
            <div className="p-4 rounded-lg bg-base-100">
              <TaskManagement />
            </div>
          </div>
        );
      case "Institute Management":
        return (
          <div className="p-6">
            <h2 className="mb-4 text-2xl font-bold">Institute Management</h2>
            <div className="p-4 rounded-lg bg-base-100">
              <InsMgmt />
            </div>
          </div>
        );
      case "Account Management":
        return (
          <div className="p-6">
            <h2 className="mb-4 text-2xl font-bold">Account Management</h2>
            <UpdateAccount />
            <div className="mt-6">
              <button
                className="text-white btn btn-error btn-sm"
                onClick={() => handleLogout()}
              >
                <LogOut />
                Logout
              </button>
            </div>
          </div>
        );
      case "Student Performance Details":
        return (
          <div className="p-6">
            <h2 className="mb-4 text-2xl font-bold">
              Student Performance Details
            </h2>
            <div className="p-4 rounded-lg bg-base-100">
              <StudentPerformance />
            </div>
          </div>
        );
      default:
        return (
          <div className="p-6">
            <h2 className="mb-4 text-2xl font-bold">
              Welcome to EnlightenEd Dashboard 👋
            </h2>
            <div className="p-4 rounded-lg bg-base-100">
              <p>Select something from the menu</p>
            </div>
          </div>
        );
    }
  };

  // this is the dash that is ultimatelt returned. modify this according to the user type encountered in each login instance
  const SampleDash = ({ userType }) => {
    return (
      <div className="flex h-[92dvh] bg-base-200">
        {/* Sidebar */}
        <div
          className={`relative bg-base-100 shadow-lg h-full
          ${isSidebarOpen ? "w-64" : "w-16"} overflow-hidden`}
        >
          <div className="flex items-center justify-between p-4 border-b">
            <h1
              className={`text-xl line-clamp-1 font-bold transition-opacity duration-300 ${
                isSidebarOpen ? "opacity-100" : "opacity-0 lg:opacity-0"
              }`}
            >
              Welcome {JSON.parse(Cookies.get("auth"))["username"]}!
            </h1>
          </div>
          <nav className="mt-4">
            {userType === "student"
              ? menuItemsForStudents.map((item) => (
                  <button
                    key={item[1]}
                    onClick={() => setActiveSpace(item[1])}
                    className={`w-full text-left px-4 py-3 transition-colors duration-200 whitespace-nowrap
                ${
                  activeSpace === item[1]
                    ? "bg-blue-500 text-white"
                    : "hover:bg-base-100"
                }`}
                  >
                    {isSidebarOpen ? item[1] : item[0]}
                  </button>
                ))
              : userType === "lecturer"
              ? menuItemsForLecturers.map((item) => (
                  <button
                    key={item[1]}
                    onClick={() => setActiveSpace(item[1])}
                    className={`w-full text-left px-4 py-3 transition-colors duration-200 whitespace-nowrap
                ${
                  activeSpace === item[1]
                    ? "bg-blue-500 text-white"
                    : "hover:bg-base-100"
                }`}
                  >
                    {isSidebarOpen ? item[1] : item[0]}
                  </button>
                ))
              : userType === "admin"
              ? menuItemsForAdmin.map((item) => (
                  <button
                    key={item[1]}
                    onClick={() => setActiveSpace(item[1])}
                    className={`w-full text-left px-4 py-3 transition-colors duration-200 whitespace-nowrap
                ${
                  activeSpace === item[1]
                    ? "bg-blue-500 text-white"
                    : "hover:bg-base-100"
                }`}
                  >
                    {isSidebarOpen ? item[1] : item[0]}
                  </button>
                ))
              : menuItemsForParent.map((item) => (
                  <button
                    key={item[1]}
                    onClick={() => setActiveSpace(item[1])}
                    className={`w-full text-left px-4 py-3 transition-colors duration-200 whitespace-nowrap
                ${
                  activeSpace === item[1]
                    ? "bg-blue-500 text-white"
                    : "hover:bg-base-100"
                }`}
                  >
                    {isSidebarOpen ? item[1] : item[0]}
                  </button>
                ))}
          </nav>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto no-scrollbar">
          {/* Toggle Button */}
          <button
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="relative top-0 left-0 z-50 p-2 transition-colors duration-200 rounded-md shadow-md max-lg:hidden bg-base-100 hover:bg-base-100"
          >
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <div className="">{renderContent()}</div>
        </div>
      </div>
    );
  };
  {
    if (isAuthenticated) {
      return (
        <SampleDash userType={JSON.parse(Cookies.get("auth"))["user_type"]} />
      );
    }
  }
}

export default Dashboard;
