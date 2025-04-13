import { useState, useEffect, useRef } from "react";
import db_con from "./dbconfig";
import Cookies from "js-cookie";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import { ToastContainer, toast } from "react-toastify";

import audio_1 from "../assets/audio/alert.mp3";
import audio_2 from "../assets/audio/alert-2.mp3";

const getMyExams = async (classIds) => {
  if (classIds.length === 0) {
    return { success: true, exams: [] };
  }

  try {
    const { data, error } = await db_con
      .from("exams")
      .select(
        "exam_id, class_id, lecturer_id, exam_name, exam_type, exam_qs, created_at, exam_deadline"
      )
      .in("class_id", classIds)
      .order("exam_id", { ascending: true });

    if (error) {
      console.log("Exams Loading error:", error.message);
      return { success: false, message: "Load Failed!" };
    }
    return { success: true, exams: data };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, message: "Something went wrong!" };
  }
};

const getMyAssignments = async (classIds) => {
  if (classIds.length === 0) {
    return { success: true, assignments: [] };
  }

  try {
    const { data, error } = await db_con
      .from("class_assignments")
      .select(
        "class_assignment_id, class_id, assignment_name, created_at, deadline"
      )
      .in("class_id", classIds)
      .order("class_assignment_id", { ascending: true });

    if (error) {
      console.log("Assignments Loading error:", error.message);
      return { success: false, message: "Load Failed!" };
    }
    return { success: true, assignments: data };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, message: "Something went wrong!" };
  }
};

const getMyClasses = async () => {
  try {
    const { data, error } = await db_con
      .from("classrooms_students")
      .select("class_id")
      .eq("student_id", JSON.parse(Cookies.get("auth"))["user_id"])
      .order("class_id", { ascending: true });

    if (error) {
      console.log("Classes Loading error:", error.message);
      return { success: false, message: "Load Failed!" };
    }
    return { success: true, classes: data.map((item) => item.class_id) };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, message: "Something went wrong!" };
  }
};

export default function Calendar() {
  const audio1 = new Audio(audio_1);
  const audio2 = new Audio(audio_2);
  const [events, setEvents] = useState([]);
  const [myExams, setMyExams] = useState([]);
  const [myAssignments, setMyAssignments] = useState([]);

  // Notify based on urgency
  const notify = (item, type, urgency) => {
    let message = `'${
      item.exam_name || item.assignment_name
    }' ${type} deadline is ${urgency}!`;
    toast(message);

    if (urgency === "within 6 hours") {
      audio1.play();
    } else {
      audio2.play();
    }
  };

  // Get my classes, exams, and assignments
  useEffect(() => {
    const fetchData = async () => {
      const classResult = await getMyClasses();
      if (classResult.success) {
        const [examResult, assignmentResult] = await Promise.all([
          getMyExams(classResult.classes),
          getMyAssignments(classResult.classes),
        ]);

        if (examResult.success) setMyExams(examResult.exams);
        if (assignmentResult.success)
          setMyAssignments(assignmentResult.assignments);
      }
    };

    fetchData();
  }, []);

  // Get events (deadlines)
  useEffect(() => {
    if (myExams.length === 0 && myAssignments.length === 0) return;

    const examEvents = myExams.map((exam) => ({
      title: `Exam: ${exam.exam_name}`,
      start: new Date(exam.exam_deadline), // Pass ISO string directly
      color: "red",
      extendedProps: { type: "exam" },
    }));

    const assignmentEvents = myAssignments.map((assignment) => ({
      title: `Assignment: ${assignment.assignment_name}`,
      start: new Date(assignment.deadline), // Pass ISO string directly
      color: "blue",
      extendedProps: { type: "assignment" },
    }));

    setEvents([...examEvents, ...assignmentEvents]);
  }, [myExams, myAssignments]);

// Use a ref to track if notifications have been shown
const notificationsShown = useRef(false);

// Check deadlines on component load, only once
useEffect(() => {
  // Don't run if notifications have already been shown or data isn't loaded
  if (
    notificationsShown.current || 
    (myExams.length === 0 && myAssignments.length === 0)
  ) {
    return;
  }
  
  const checkDeadlines = () => {
    const now = new Date();

    // Check exam deadlines
    myExams.forEach((exam) => {
      const deadline = new Date(exam.exam_deadline);
      const timeDiff = deadline - now;
      const hoursLeft = timeDiff / (1000 * 60 * 60);

      if (hoursLeft <= 6 && hoursLeft > 0) {
        notify(exam, "exam", "within 6 hours");
      } else if (hoursLeft <= 24 && hoursLeft > 6) {
        notify(exam, "exam", "today");
      } else if (hoursLeft <= 168 && hoursLeft > 24) {
        notify(exam, "exam", "this week");
      }
    });

    // Check assignment deadlines
    myAssignments.forEach((assignment) => {
      const deadline = new Date(assignment.deadline);
      const timeDiff = deadline - now;
      const hoursLeft = timeDiff / (1000 * 60 * 60);

      if (hoursLeft <= 6 && hoursLeft > 0) {
        notify(assignment, "assignment", "within 6 hours");
      } else if (hoursLeft <= 24 && hoursLeft > 6) {
        notify(assignment, "assignment", "today");
      } else if (hoursLeft <= 168 && hoursLeft > 24) {
        notify(assignment, "assignment", "this week");
      }
    });
    
    // Mark notifications as shown to prevent future runs
    notificationsShown.current = true;
  };

  checkDeadlines();
}, [myExams, myAssignments]);

  return (
    <div>
      <FullCalendar
        plugins={[dayGridPlugin]}
        initialView="dayGridMonth"
        weekends={true}
        events={events}
        eventContent={renderEventContent}
        timeZone="Asia/Colombo" // Explicitly set to local timezone
      />
      <ToastContainer />
    </div>
  );
}

// Custom render function
function renderEventContent(eventInfo) {
  return (
    <div className="flex gap-3">
      <b>{eventInfo.timeText}</b>
      <i>{eventInfo.event.title}</i>
    </div>
  );
}
