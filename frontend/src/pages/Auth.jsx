import { useState } from "react";
import { useLocation } from "wouter";
import Cookies from "js-cookie";
import db_con from "../components/dbconfig";

const login = async (email, password) => {
  try {
    // Attempt to sign in the user with the email and password
    const { data, error } = await db_con
      .from("users")
      .select("*")
      .eq("email", email)
      .eq("password", password) // Assuming you store plain text passwords (consider hashing them)
      .single(); // Use `.single()` to get one user

    if (error) {
      console.log("Login error:", error.message);
      return { success: false, message: "Login Failed!" };
    }
    return { success: true, user: data };
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

function Auth({ reqType }) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [accountType] = useState("admin");
  const [location, navigate] = useLocation();
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();
    const result = await login(email, password);

    if (result.success) {
      // show login msg
      alert(`Welcome, ${result.user.username}`);
      // save user data as a cookie
      const expirationTime = new Date(new Date().getTime() + 60000 * 60 * 24);
      Cookies.set("auth", JSON.stringify(result.user), {
        expires: expirationTime,
      });
      // navigate to dash
      navigate(`/users`);
    } else {
      // Show error message
      alert(result.message);
    }
  };

  const handleSignup = async (event) => {
    event.preventDefault();
    const result = await signup(username, email, password, accountType);

    if (result.success) {
      alert(`Signup successful! Welcome, ${result.user.username}`);
      Cookies.set("auth", JSON.stringify(result.user), {
        expires: 1, // 1 day expiration
      });
      navigate(`/users`);
    } else {
      alert(result.message);
    }
  };

  return (
    <div className="flex items-center justify-center flex-grow p-6 bg-base-200">
      <div className="flex flex-col flex-grow max-w-xl gap-6 p-6 border rounded-lg h-fit bg-base-100">
        <h1 className="text-3xl text-center">{reqType === "Sign In" ? "Sign In" : "Create Admin Account"}</h1>
        {reqType === "Sign Up" ? (
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
        ) : (
          ""
        )}
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
        <button
          type="submit"
          className="bg-[#00367E] text-white rounded-md p-2"
          onClick={reqType === "Sign In" ? handleLogin : handleSignup}
        >
          {reqType}
        </button>
      </div>
    </div>
  );
}

export default Auth;
