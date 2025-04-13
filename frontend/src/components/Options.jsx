import { useState, useContext, useEffect } from "react";
import { SocketContext } from "../Context";
import Cookies from "js-cookie";
import db_con from "../components/dbconfig";
import { PhoneCall, PhoneOff, Monitor } from "lucide-react";

const getUsers = async () => {
  try {
    const { data, error } = await db_con
      .from("users")
      .select("username, peer_id") // Fetch Peer ID instead of user_id
      .neq("user_id", JSON.parse(Cookies.get("auth"))["user_id"]) // Exclude self
      .neq("peer_id", null)
      .neq("peer_id", ""); // Exclude null peer_id rows

    if (error) {
      console.log("Users Loading error:", error.message);
      return { success: false, message: "Load Failed!" };
    }
    return { success: true, users: data };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, message: "Something went wrong!" };
  }
};

const updatePeerId = async (peerId) => {
  const userId = JSON.parse(Cookies.get("auth"))["user_id"]; // Get logged-in user ID
  const { error } = await db_con
    .from("users")
    .update({ peer_id: peerId })
    .eq("user_id", userId);

  if (error) {
    console.error("Error updating peer ID:", error.message);
  } else {
    console.log("Peer ID updated successfully!");
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
}

const Options = () => {
  const {
    callAccepted,
    setName,
    callEnded,
    leaveCall,
    callUser,
    shareScreen,
    stopSharing,
    isScreenSharing,
  } = useContext(SocketContext);
  const [users, setUsers] = useState([]);
  const { me } = useContext(SocketContext);

  const [callingAllowed, allowCalling] = useState(false);

  const fetchAdvancedStatus = async () => {
    const result = await getAdvancedStatus();

    if(result.success){
      if(result.data.length > 0){ 
        allowCalling(true);
      }
    } else {
      alert("Status Loading Error!");
    }
  }

  useEffect(() => {
    const fetchUsers = async () => {
      const result = await getUsers();
      if (result.success) {
        setUsers(result.users);
        //console.log("Users Loaded!");
      } else {
        console.log("Message:", result.message);
      }
    };
    fetchUsers();
  });

  useEffect(() => {
    setName(JSON.parse(Cookies.get("auth"))["username"]);
    updatePeerId(me);

    if(JSON.parse(Cookies.get("auth"))["user_type"] === "student"){
      // fetch advanced status for the logged in student
      fetchAdvancedStatus();
    }else{
      // lecturers are allowed to call students
      allowCalling(true);
    }
  }, []);

  return (
    <div className="lg:pr-6 lg:border-r">
      {/* Users List */}
      <div className="max-lg:pt-3">
        <p className="text-lg font-semibold">Invite Users</p>
        <div className="flex flex-col gap-2 mt-3 rounded-lg bg-base-100">
          {users.length > 0 ? (
            users.map((user, index) => (
              <div
                key={index}
                className="flex items-center justify-between gap-2 p-2 rounded-md bg-base-200"
              >
                <span>{user.username}</span>
                {!callAccepted && (
                      <button
                        className={`text-white btn btn-success`}
                        disabled={!callingAllowed}
                        onClick={() => callUser(user.peer_id)}
                      >
                        <PhoneCall />
                        Call
                      </button>
                    )
                  }

                {callAccepted && !callEnded ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      className="text-white btn btn-sm btn-error"
                      onClick={leaveCall}
                    >
                      <PhoneOff />
                      Hang up
                    </button>
                    <button
                      className="text-white btn btn-sm btn-info"
                      onClick={isScreenSharing ? stopSharing : shareScreen}
                    >
                      <Monitor />
                      {isScreenSharing ? "Stop Sharing" : "Share Screen"}
                    </button>
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">No users available</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Options;
