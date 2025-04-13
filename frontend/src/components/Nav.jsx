import { Link } from "wouter";
import ThemeToggle from "./ThemeToggle";

function Navbar() {
  return (
    <div id="nav" className="navbar bg-base-100">
      <div className="navbar-start">
        <div className="dropdown">
          <div tabIndex={0} role="button" className="btn btn-ghost btn-circle">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h7"
              />
            </svg>
          </div>
          <ul
            tabIndex={0}
            className="menu menu-sm dropdown-content bg-base-100 rounded-box z-[1] mt-3 w-52 p-2 shadow"
          >
            <li>
              <Link href="/">Home</Link>
            </li>
            <li className="hidden">
              <Link href="/sign-up">Sign Up</Link>
            </li>
            <li>
              <Link href="/sign-in">Sign In</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="navbar-center">
        <a className="text-xl btn btn-ghost">EnlightenEd</a>
      </div>
      <div className="navbar-end">
        <ThemeToggle></ThemeToggle>
      </div>
    </div>
  );
}

export default Navbar;
