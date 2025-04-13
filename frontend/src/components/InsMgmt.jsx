import { useState, useEffect } from "react";
import db_con from "./dbconfig";
import Cookies from "js-cookie";

// create ins method
const createIns = async (ins_name, ins_admin) => {
  try {
    const { data, error } = await db_con
      .from("institutions")
      .insert([{ ins_name, ins_admin }])
      .select()
      .single();

    if (error) {
      console.log("Save error:", error.message);
      return { success: false, message: "Save Failed!" };
    }

    return { success: true, exam: data };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, message: "Something went wrong!" };
  }
};

// save changes to institution
const saveIns = async (ins_name, ins_admin) => {
  try {
    // save ins
    const { data, error } = await db_con
      .from("institutions")
      .update([{ ins_name }])
      .eq("ins_admin", ins_admin)
      .select()
      .single();

    if (error) {
      console.log("Save error:", error.message);
      return { success: false, message: "Save Failed!" };
    }

    return { success: true, exam: data };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, message: "Something went wrong!" };
  }
};

const signup = async (username, email, password, user_type) => {
  try {
    // Check if the email already exists
    const { data: existingUser } = await db_con
      .from("users")
      .select("email")
      .eq("email", email)
      .single();

    if (existingUser) {
      return { success: false, message: "Email already in use!" };
    }

    // Insert new user
    const { data, error } = await db_con
      .from("users")
      .insert([{ username, email, password, user_type }])
      .select()
      .single();

    if (error) {
      console.log("Signup error:", error.message);
      return { success: false, message: "Signup Failed!" };
    }

    return { success: true, user: data };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, message: "Something went wrong!" };
  }
};

// validate institution
const validateIns = async () => {
  try {
    const { data, error } = await db_con
      .from("institutions")
      .select("ins_name, ins_admin")
      .eq("ins_admin", JSON.parse(Cookies.get("auth"))["user_id"]);

    if (error) {
      console.log("Institutions Loading error:", error.message);
      return { success: false, message: "Load Failed!" };
    }
    return { success: true, institutes: data };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, message: "Something went wrong!" };
  }
};

function InsMgmt() {
  const [insName, setInsName] = useState("");
  const [lecturers, setLecturers] = useState([]);
  const [assignedLecturers, setAssignedLecturers] = useState([]);

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState("student");
  const [showPassword, setShowPassword] = useState(false);

  // Function to fetch lecturers
  const fetchLecturers = async () => {
    try {
      const { data, error } = await db_con
        .from("users")
        .select("user_id, username")
        .eq("user_type", "lecturer");
      if (error) throw error;
      setLecturers(data);
    } catch (error) {
      console.error("Error fetching lecturers:", error.message);
    }
  };

  // Function to get institution ID for the logged-in user
  const fetchInstitution = async () => {
    try {
      const { data, error } = await db_con
        .from("institutions")
        .select("ins_id")
        .eq("ins_admin", JSON.parse(Cookies.get("auth"))["user_id"])
        .single();
      if (error) throw error;
      return data?.ins_id;
    } catch (error) {
      console.error("Error fetching institution:", error.message);
      return null;
    }
  };

  // Function to fetch assigned lecturers
  const fetchAssignedLecturers = async (insId) => {
    try {
      const { data, error } = await db_con
        .from("institutions_lecturers")
        .select("lecturer_id")
        .eq("ins_id", insId);
      if (error) throw error;
      setAssignedLecturers(data.map((entry) => entry.lecturer_id));
    } catch (error) {
      console.error("Error fetching assigned lecturers:", error.message);
    }
  };

  // Assign lecturer
  const assignLecturer = async (lecturerId) => {
    const insId = await fetchInstitution();
    if (!insId) return;

    try {
      const { error } = await db_con
        .from("institutions_lecturers")
        .insert([{ ins_id: insId, lecturer_id: lecturerId }]);
      if (error) throw error;

      setAssignedLecturers((prev) => [...prev, lecturerId]); // Update UI
    } catch (error) {
      console.error("Error assigning lecturer:", error.message);
    }
  };

  // Remove lecturer assignment
  const removeLecturer = async (lecturerId) => {
    const insId = await fetchInstitution();
    if (!insId) return;

    try {
      const { error } = await db_con
        .from("institutions_lecturers")
        .delete()
        .eq("ins_id", insId)
        .eq("lecturer_id", lecturerId);
      if (error) throw error;

      setAssignedLecturers((prev) => prev.filter((id) => id !== lecturerId)); // Update UI
    } catch (error) {
      console.error("Error removing lecturer assignment:", error.message);
    }
  };

  // Load lecturers and assigned lecturers on component mount
  useEffect(() => {
    const fetchData = async () => {
      await fetchLecturers();
      const insId = await fetchInstitution();
      if (insId) {
        await fetchAssignedLecturers(insId);
      }
    };
    fetchData();
  }, []);

  // handle creating new ins
  const handleInsCreate = async () => {
    const result = await createIns(
      insName,
      JSON.parse(Cookies.get("auth"))["user_id"]
    );

    if (result.success) {
      alert(`Save successful! The page will be reloaded now.`);
      window.location.reload();
    } else {
      alert(result.message);
    }
  };

  // habdle saving existing ins
  const handleInsSave = async () => {
    const result = await saveIns(
      insName,
      JSON.parse(Cookies.get("auth"))["user_id"]
    );

    if (result.success) {
      alert(`Save successful! The page will be reloaded now.`);
      window.location.reload();
    } else {
      alert(result.message);
    }
  };

  // return false if this admin already has an institution, else true
  const validateInsAvailable = async () => {
    const result = await validateIns();
    if (result.success) {
      if (result.institutes.length > 0) {
        // admin has an institution, set name and return false
        setInsName(result.institutes[0].ins_name);
        return false;
      } else {
        // admin has no institution, return true
        return true;
      }
    } else {
      console.log("Message:", result.message);
      return false;
    }
  };

  // handle either creating an institution or updating existing one
  const handleInsAction = async () => {
    const isAvailable = await validateInsAvailable();
    if (isAvailable) {
      // admin doesn't have an institution, therefore available -> create an institution now
      await handleInsCreate();
    } else {
      // admin has an institution, therefore save existing one
      await handleInsSave();
    }
  };

  const handleSignup = async (event) => {
    event.preventDefault();
    const result = await signup(username, email, password, accountType);

    if (result.success) {
      alert(`Signup successful for ${result.user.username}`);
    } else {
      alert(result.message);
    }
  };

  // on load, vaidate if there is an institution
  useEffect(() => {
    validateInsAvailable();
  }, []);

  return (
    <div>
      <div className="flex gap-3 max-md:flex-wrap">
        <label className="flex items-center w-full gap-2 input input-bordered max-md:flex-wrap max-md:h-full max-md:py-3">
          Your Institute Name:
          <input
            type="text"
            className="grow"
            value={insName}
            onChange={(e) => {
              setInsName(e.target.value);
            }}
          />
        </label>
        <button
          className="text-white btn btn-success max-md:w-full"
          onClick={handleInsAction}
        >
          Save
        </button>
      </div>
      <div className="flex flex-col gap-3 mt-4">
        <p className="font-semibold">Assign Lecturers</p>
        <ul className="flex flex-col gap-3">
          {lecturers.map((lecturer) => (
            <li key={lecturer.user_id} className="flex items-center gap-3 max-md:flex-wrap">
              {lecturer.username}
              {assignedLecturers.includes(lecturer.user_id) ? (
                <button
                  className="btn btn-outline btn-danger btn-sm"
                  onClick={() => removeLecturer(lecturer.user_id)}
                >
                  Remove Assignment
                </button>
              ) : (
                <button
                  className="btn btn-outline btn-success btn-sm"
                  onClick={() => assignLecturer(lecturer.user_id)}
                >
                  Assign
                </button>
              )}
            </li>
          ))}
        </ul>
        <hr />
        <p className="font-semibold">Create User Accounts</p>
        <div className="space-y-4">
          <label className="flex items-center gap-2 input input-bordered">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="w-4 h-4 opacity-70"
            >
              <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 0 0-11.215 0c-.22.578.254 1.139.872 1.139h9.47Z" />
            </svg>
            <input
              type="text"
              className="grow"
              placeholder="Username"
              onChange={(e) => setUsername(e.target.value)}
              value={username}
            />
          </label>
          <label className="flex items-center gap-2 input input-bordered">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="w-4 h-4 opacity-70"
            >
              <path d="M2.5 3A1.5 1.5 0 0 0 1 4.5v.793c.026.009.051.02.076.032L7.674 8.51c.206.1.446.1.652 0l6.598-3.185A.755.755 0 0 1 15 5.293V4.5A1.5 1.5 0 0 0 13.5 3h-11Z" />
              <path d="M15 6.954 8.978 9.86a2.25 2.25 0 0 1-1.956 0L1 6.954V11.5A1.5 1.5 0 0 0 2.5 13h11a1.5 1.5 0 0 0 1.5-1.5V6.954Z" />
            </svg>
            <input
              type="text"
              id="email"
              name="email"
              className="grow"
              placeholder="Email"
              onChange={(e) => setEmail(e.target.value)}
              value={email}
            />
          </label>
          <label className="flex items-center gap-2 input input-bordered">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="w-4 h-4 opacity-70"
            >
              <path
                fillRule="evenodd"
                d="M14 6a4 4 0 0 1-4.899 3.899l-1.955 1.955a.5.5 0 0 1-.353.146H5v1.5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-2.293a.5.5 0 0 1 .146-.353l3.955-3.955A4 4 0 1 1 14 6Zm-4-2a.75.75 0 0 0 0 1.5.5.5 0 0 1 .5.5.75.75 0 0 0 1.5 0 2 2 0 0 0-2-2Z"
                clipRule="evenodd"
              />
            </svg>
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              name="password"
              className="grow"
              placeholder="Password"
              onChange={(e) => setPassword(e.target.value)}
              value={password}
            />
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.912 9.912 0 014.666-5.88M12 5c-1.996 0-3.885.515-5.521 1.41m0 0L12 12l-5.521-5.59z"
                  />
                  <line x1="3" y1="3" x2="21" y2="21" />
                </svg>
              )}
            </button>
          </label>
          <div className="flex justify-start gap-6 max-sm:flex-col">
            <p>Account Type:</p>
            {["student", "lecturer", "parent"].map((type) => (
              <div key={type} className="flex items-center">
                <input
                  id={type}
                  type="radio"
                  name="accountType"
                  className="radio"
                  checked={accountType === type}
                  onChange={() => setAccountType(type)}
                />
                <label
                  htmlFor={type}
                  className="text-sm font-medium capitalize ms-2"
                >
                  {type}
                </label>
              </div>
            ))}
          </div>
          <button
            type="submit"
            className="bg-[#00367E] hover:bg-[#00367E]/80 transition-all text-white rounded-md p-2 max-md:w-full md:px-4"
            onClick={handleSignup}
          >
            Create Account
          </button>
        </div>
      </div>
    </div>
  );
}

export default InsMgmt;
