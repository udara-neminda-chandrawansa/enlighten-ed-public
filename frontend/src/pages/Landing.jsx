import { Link } from "wouter";
import logo from "../assets/logo.png";
import admin from "../assets/roles/admin.webp";
import teacher from "../assets/roles/teacher.jpg";
import student from "../assets/roles/student.jpg";
import parent from "../assets/roles/parent.webp";
import cta_bg from "../assets/landing/cta_bg.jpg";

function Landing() {
  return (
    <div>
      {/*banner*/}
      <div className="hero bg-base-300">
        <div className="flex-col w-full p-6 hero-content lg:flex-row">
          <div>
            <h1 className="text-5xl font-bold max-md:text-3xl">
              Your educational partner | EnlightenEd
            </h1>
            <p className="py-6 text-justify">
              Discover a revolutionary way to learn with EnlightenEd, your
              ultimate online learning platform. Join virtual classrooms, engage
              in interactive discussions, and track your progress through
              advanced tools and gamification. Whether you're a student,
              teacher, or parent, EnlightenEd makes learning seamless,
              collaborative, and fun.
            </p>
            <div className="flex gap-6">
              <Link
                href="/sign-up"
                className="btn text-white bg-[#00367E] hover:bg-[#00367E]/75"
              >
                Sign Up
              </Link>
              <Link href="/sign-in" className="text-white btn btn-secondary">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
      {/*about us*/}
      <div className="flex flex-col gap-6 p-6">
        <h1 className="text-3xl">About Us</h1>
        <div className="justify-between w-full gap-6 md:flex">
          <div className="flex flex-col gap-6 md:w-2/3">
            <p className="text-justify">
              At EnlightenEd, we believe learning should inspire, engage, and
              empower. Founded with a mission to bridge gaps in education, we've
              created a dynamic platform that transforms traditional learning
              into a captivating online experience. By blending advanced
              technology with proven teaching strategies, EnlightenEd offers an
              inclusive space where students, educators, and parents thrive
              together.
            </p>
            <p className="text-justify">
              From gamified lessons to real-time collaboration, we're dedicated
              to making education accessible, innovative, and enjoyable for
              everyone, everywhere. Join us in redefining the future of
              learning!
            </p>
          </div>
          <div className="flex items-center justify-center md:w-1/3">
            <img
              src={logo}
              className="h-[200px] 2xl:h-[400px] w-full object-contain max-md:hidden bg-white rounded-full"
            />
          </div>
        </div>
      </div>
      {/*roles*/}
      <h1 className="p-6 text-3xl">Available roles</h1>
      <div className="flex justify-center p-6 pt-0">
        <div className="grid grid-cols-4 gap-6 max-lg:grid-cols-2 max-md:grid-cols-1">
          {/*admin*/}
          <div className="shadow-xl card card-compact bg-base-100 max-xl:h-[400px]">
            <figure className="h-1/2">
              <img
                src={admin}
                alt="Admin img"
                className="object-cover w-full h-full"
              />
            </figure>
            <div className="card-body">
              <h2 className="card-title">Admin</h2>
              <p>Manages a single institution</p>
            </div>
          </div>
          {/*teacher*/}
          <div className="shadow-xl card card-compact bg-base-100 max-xl:h-[400px]">
            <figure className="h-1/2">
              <img
                src={teacher}
                alt="Teacher img"
                className="object-cover w-full h-full"
              />
            </figure>
            <div className="card-body">
              <h2 className="card-title">Teacher</h2>
              <p>
                Manages classrooms, students and relevant tests, assignments
                etc.
              </p>
            </div>
          </div>
          {/*student*/}
          <div className="shadow-xl card card-compact bg-base-100 max-xl:h-[400px]">
            <figure className="h-1/2">
              <img
                src={student}
                alt="Student img"
                className="object-cover w-full h-full"
              />
            </figure>
            <div className="card-body">
              <h2 className="card-title">Student</h2>
              <p>The learner</p>
            </div>
          </div>
          {/*parent*/}
          <div className="shadow-xl card card-compact bg-base-100 max-xl:h-[400px]">
            <figure className="h-1/2">
              <img
                src={parent}
                alt="Parent img"
                className="object-cover w-full h-full"
              />
            </figure>
            <div className="card-body">
              <h2 className="card-title">Parent</h2>
              <p>Guardian / Caretaker of learner</p>
            </div>
          </div>
        </div>
      </div>
      {/*features*/}
      <div className="flex flex-col gap-6 p-6">
        <h1 className="text-3xl">Our Features</h1>
        <ul className="flex flex-col gap-6 text-justify list-disc list-inside">
          <li>
            Virtual Classrooms: Engage in real-time with educators and peers
            through seamless video conferencing and collaborative tools,
            fostering a sense of community from anywhere.
          </li>
          <li>
            Gamified Learning: Turn studying into an adventure with points,
            badges, and rewards that make learning fun and motivational for
            students of all ages.
          </li>
          <li>
            Advanced Assessment Tools: Leverage AI-powered automatic grading and
            detailed insights to track progress, improve understanding, and save
            time.
          </li>
          <li>
            Time Management and Calendar Tools: Stay organized with our
            intuitive calendar that integrates classes, assignments, and
            deadlines in one place.
          </li>
          <li>
            Collaborative Spaces: Work on group projects, share ideas, and
            discuss topics with ease using our interactive workspaces.
          </li>
          <li>
            Parental Involvement Portal: Empower parents to stay informed and
            actively support their child’s learning journey.
          </li>
          <li>
            Offline Access: Download lessons and materials for uninterrupted
            learning, even without an internet connection.
          </li>
        </ul>
      </div>
      {/*CTA*/}

      <section className="overflow-hidden bg-base-300 sm:grid sm:grid-cols-2 sm:items-center">
        <div className="p-8 md:p-12 lg:px-16 lg:py-24">
          <div className="max-w-xl mx-auto text-center">
            <h2 className="text-2xl font-bold md:text-3xl sm:text-left">
              Ready to Revolutionize Your Learning Experience?
            </h2>

            <p className="hidden text-gray-500 md:mt-4 md:block sm:text-left">
              Join thousands of learners and educators already enhancing their
              education with EnlightenEd.
            </p>

            <div className="mt-4 md:mt-8 sm:text-left">
              <Link
                href="/sign-up"
                className="inline-block px-12 py-3 text-sm font-medium text-white transition rounded bg-[#00367E] hover:bg-[#00367E]/75 focus:outline-none focus:ring focus:ring-yellow-400"
              >
                Get Started Today
              </Link>
            </div>
          </div>
        </div>

        <img
          alt=""
          src={cta_bg}
          className="h-full w-full object-cover sm:h-[calc(100%_-_2rem)] sm:self-end sm:rounded-ss-[30px] md:h-[calc(100%_-_4rem)] md:rounded-ss-[60px]"
        />
      </section>
    </div>
  );
}
export default Landing;
