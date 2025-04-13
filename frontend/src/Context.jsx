import { createContext, useState, useRef, useEffect } from "react";
import { io } from "socket.io-client";
import Peer from "simple-peer";
import Cookies from "js-cookie";
import db_con from "./components/dbconfig";

const SocketContext = createContext();
// local: http://localhost:8080
// global: https://enlighten-ed.onrender.com
const socket = io("https://enlighten-ed.onrender.com", {
  path: "/socket.io", // Explicitly set the socket.io path
  // path: '/',
  transports: ["websocket"],
  withCredentials: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

const saveAttendanceInDB = async (
  meeting_name,
  student_id,
  lecturer_id,
  status
) => {
  try {
    // save attendance
    const { data, error } = await db_con
      .from("meeting_attendance")
      .insert([{ meeting_name, student_id, lecturer_id, status }])
      .select()
      .single();

    if (error) {
      console.log("Save error:", error.message);
      return { success: false, message: "Save Failed!" };
    }

    return { success: true, attendance: data };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, message: "Something went wrong!" };
  }
};

const ContextProvider = ({ children }) => {
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [stream, setStream] = useState();
  const [screenStream, setScreenStream] = useState(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [name, setName] = useState("");
  const [call, setCall] = useState({});
  const [me, setMe] = useState("");
  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();
  const [jitsiAPI, setJitsiAPI] = useState(null); // jitsi

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((currentStream) => {
        setStream(currentStream);
        if (myVideo.current) {
          myVideo.current.srcObject = currentStream;
        }
      })
      .catch((err) => console.error("Media access error:", err));

    socket.on("connect", () => {
      console.log("Connected to socket server");
    });

    socket.on("me", (id) => {
      console.log("Received socket ID:", id);
      setMe(id);
    });

    socket.on("callUser", ({ from, name: callerName, signal }) => {
      console.log("Incoming call from:", callerName, "ID:", from); // Debugging
      setCall({ isReceivingCall: true, from, name: callerName, signal });
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message);
    });

    return () => {
      socket.off("me");
      socket.off("connect");
      socket.off("callUser");
      socket.off("connect_error");
    };
  }, []);

  const startClassroom = (roomName) => {
    const domain = "meet.jit.si";
    const options = {
      roomName: `vpaas-magic-cookie-be52c4165cd9421185aa10e0878ff9a0/${roomName}-${
        JSON.parse(Cookies.get("auth"))["user_id"]
      }`,
      width: "100%",
      height: "100%",
      parentNode: document.getElementById("jitsi-container"),
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        SHOW_BRAND_WATERMARK: false,
      },
      configOverwrite: {
        disableSimulcast: false,
        disableDeepLinking: true,
      },
      userInfo: {
        displayName: JSON.parse(Cookies.get("auth"))["username"],
      },
    };

    const api = new JitsiMeetExternalAPI(domain, options);
    setJitsiAPI(api); // Store API instance if needed elsewhere
  };

  const joinClassroom = (roomName, lecturerId) => {
    const domain = "meet.jit.si";
    const options = {
      roomName: `vpaas-magic-cookie-be52c4165cd9421185aa10e0878ff9a0/${roomName}-${lecturerId}`,
      width: "100%",
      height: "100%",
      parentNode: document.getElementById("jitsi-container"),
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        SHOW_BRAND_WATERMARK: false,
      },
      configOverwrite: {
        disableSimulcast: false,
        disableDeepLinking: true,
      },
      userInfo: {
        displayName: JSON.parse(Cookies.get("auth"))["username"],
      },
    };

    const api = new JitsiMeetExternalAPI(domain, options);
    setJitsiAPI(api);

    // Track which events we've already recorded to prevent duplicates
    const recordedEvents = new Map(); // Maps user_id to {joined: timestamp, left: timestamp}
    let previousParticipants = new Set();
    const userId = JSON.parse(Cookies.get("auth"))["user_id"];
    let hasJoined = false;

    // Helper function to record attendance with deduplication
    const recordAttendance = (status) => {
      const currentTime = Date.now();
      const userEvents = recordedEvents.get(userId) || { joined: 0, left: 0 };

      // Only record if this is a new event or it happened more than 10 seconds after the last one
      // (to handle legitimate rejoin scenarios)
      if (
        status === "joined" &&
        (!userEvents.joined || currentTime - userEvents.joined > 10000)
      ) {
        console.log(`Recording join for user ${userId}`);
        saveAttendance(roomName, userId, lecturerId, "joined");
        recordedEvents.set(userId, { ...userEvents, joined: currentTime });
        hasJoined = true;
      } else if (
        status === "left" &&
        hasJoined &&
        (!userEvents.left || currentTime - userEvents.left > 10000)
      ) {
        console.log(`Recording leave for user ${userId}`);
        saveAttendance(roomName, userId, lecturerId, "left");
        recordedEvents.set(userId, { ...userEvents, left: currentTime });
      }
    };

    // Listen for the participantLeft event
    api.addListener("participantLeft", (participant) => {
      console.log("Participant Left Event:", participant);
      // Only record our own departure
      recordAttendance("left");
    });

    // Keep the interval check for joins
    const checkAttendance = setInterval(async () => {
      try {
        const participants = api.getParticipantsInfo();
        const currentParticipants = new Set(participants.map((p) => p.id));

        // If this is our first check and we're in the participant list, record join
        if (!hasJoined && participants.length > 0) {
          recordAttendance("joined");
        }

        // Update the previousParticipants set
        previousParticipants = currentParticipants;
      } catch (error) {
        console.error("Error checking attendance:", error);
      }
    }, 5000); // Check every 5 seconds

    // Add a direct event listener for the user leaving the meeting
    api.addListener("videoConferenceLeft", () => {
      console.log("User left the meeting, cleaning up");
      recordAttendance("left");
      clearInterval(checkAttendance);
    });
  };

  // Function to store attendance
  const saveAttendance = async (
    meetingName,
    participantID,
    lecturerID,
    status
  ) => {
    try {
      const response = await saveAttendanceInDB(
        meetingName,
        participantID,
        lecturerID,
        status
      );
      if (!response.success) {
        alert("Attendance recording failed!");
      } else {
        console.log(`Attendance saved: ${participantID} - ${status}`);
      }
    } catch (error) {
      console.error("Error saving attendance:", error);
    }
  };

  const answerCall = () => {
    setCallAccepted(true);
    const peer = new Peer({ initiator: false, trickle: false, stream });
    peer.on("signal", (data) => {
      socket.emit("answerCall", { signal: data, to: call.from });
    });
    peer.on("stream", (currentStream) => {
      userVideo.current.srcObject = currentStream;
    });
    peer.signal(call.signal);
    connectionRef.current = peer;
  };

  const callUser = (peerId) => {
    if (!peerId) {
      console.error("Invalid Peer ID");
      return;
    }

    const peer = new Peer({ initiator: true, trickle: false, stream });

    peer.on("signal", (data) => {
      console.log("Calling Peer ID:", peerId);
      socket.emit("callUser", {
        userToCall: peerId, // Use peer ID from database
        signalData: data,
        from: me, // My Peer ID
        name,
      });
    });

    peer.on("stream", (currentStream) => {
      userVideo.current.srcObject = currentStream;
    });

    socket.on("callAccepted", (signal) => {
      setCallAccepted(true);
      peer.signal(signal);
    });

    connectionRef.current = peer;
  };

  const leaveCall = () => {
    setCallEnded(true);
    connectionRef.current.destroy();
    window.location.reload();
  };

  // **Screen Sharing**
  const shareScreen = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });

      if (!connectionRef.current) {
        console.error("No active connection to share screen.");
        return;
      }

      const peer = connectionRef.current; // Get the active peer connection

      // Replace existing video track with the new screen-sharing track
      const screenTrack = screenStream.getTracks()[0];

      // Find the sender for the video track
      const sender = peer._pc
        .getSenders()
        .find((s) => s.track?.kind === "video");

      if (sender) {
        sender.replaceTrack(screenTrack);
      } else {
        peer.addTrack(screenTrack, screenStream); // Add screen track if not already there
      }

      console.log("Screen sharing started.");
      setIsScreenSharing(true);

      // Stop sharing when user turns off screen share
      screenTrack.onended = () => {
        stopSharing();
      };
    } catch (error) {
      console.error("Error sharing screen:", error);
    }
  };

  // Function to stop sharing and revert to webcam
  const stopSharing = async () => {
    try {
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });

      if (!connectionRef.current) {
        console.error("No active connection to stop screen sharing.");
        return;
      }

      const peer = connectionRef.current;
      const cameraTrack = cameraStream.getTracks()[0];

      const sender = peer._pc
        .getSenders()
        .find((s) => s.track?.kind === "video");

      if (sender) {
        sender.replaceTrack(cameraTrack);
      }

      console.log("Switched back to camera.");
      setIsScreenSharing(false);
    } catch (error) {
      console.error("Error switching back to camera:", error);
    }
  };

  return (
    <SocketContext.Provider
      value={{
        call,
        callAccepted,
        myVideo,
        userVideo,
        stream,
        name,
        setName,
        callEnded,
        me,
        callUser,
        leaveCall,
        answerCall,
        shareScreen,
        stopSharing,
        isScreenSharing,
        startClassroom,
        joinClassroom,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
export { ContextProvider, SocketContext };
