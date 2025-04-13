import logo from "../assets/logo.png";
import { Link } from "wouter";

function Footer() {
  return (
    <footer className="">
      <div className="relative max-w-screen-xl px-4 py-16 mx-auto sm:px-6 lg:px-8 lg:pt-24">
        <div className="absolute end-4 top-4 sm:end-6 sm:top-6 lg:end-8 lg:top-8">
          <a
            className="inline-block p-2 text-white transition bg-[#00367E] rounded-full shadow hover:bg-[#00367E]/75 sm:p-3 lg:p-4"
            href="#nav"
          >
            <span className="sr-only">Back to top</span>

            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="size-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                clipRule="evenodd"
              />
            </svg>
          </a>
        </div>

        <div className="lg:flex lg:items-end lg:justify-between">
          <div>
            <div className="flex justify-center lg:justify-start">
              <img
                src={logo}
                className="max-lg:w-[250px] w-[150px] bg-white rounded-full"
              />
            </div>

            <p className="max-w-md mx-auto mt-6 leading-relaxed text-center text-gray-500 lg:text-left">
              Discover a revolutionary way to learn with EnlightenEd, your
              ultimate online learning platform.
            </p>
          </div>

          <ul className="flex flex-wrap justify-center gap-6 mt-12 md:gap-8 lg:mt-0 lg:justify-end lg:gap-12">
            <li>
              <Link className="transition hover:text-[#00367E]" href="/">
                Home
              </Link>
            </li>

            <li className="hidden">
              <Link className="transition hover:text-[#00367E]" href="/sign-up">
                Sign Up
              </Link>
            </li>

            <li>
              <Link className="transition hover:text-[#00367E]" href="/sign-in">
                Sign In
              </Link>
            </li>

          </ul>
        </div>

        <p className="mt-12 text-sm text-center text-gray-500 lg:text-right">
          EnlightenEd 2025. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

export default Footer;
