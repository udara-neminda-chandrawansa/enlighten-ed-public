import db_con from "./dbconfig";
import Cookies from "js-cookie";
import { useState, useEffect } from "react";
import { UserPlus, School, PlusCircle } from "lucide-react";

const getMyClasses = async () => {
  try {
    const { data, error } = await db_con
      .from("classrooms")
      .select("class_id, classname")
      .eq("lecturer_id", JSON.parse(Cookies.get("auth"))["user_id"])
      .order("class_id", { ascending: true });

    if (error) {
      console.log("Classes Loading error:", error.message);
      return { success: false, message: "Load Failed!" };
    }
    return { success: true, classes: data };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, message: "Something went wrong!" };
  }
};

const getAttendance = async () => {
  try {
    // Get attendance data in a separate query
    const { data: attendanceData, error: attendanceError } = await db_con
      .from("meeting_attendance")
      .select(
        `
    meeting_name, 
    student_id, 
    status, 
    created_at,
    student:student_id(username, email)
  `
      )
      .eq("lecturer_id", JSON.parse(Cookies.get("auth"))["user_id"])
      .order("attendance_id", { ascending: true });

    if (attendanceError) {
      console.log("Attendance Loading error:", attendanceError.message);
      return { success: false, message: "Load Failed!" };
    }

    return {
      success: true,
      attendance: attendanceData,
    };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, message: "Something went wrong!" };
  }
};

// Fetches students belonging to a specific class
const getStudentsByClass = async (classId) => {
  try {
    const { data, error } = await db_con
      .from("classrooms_students")
      .select(
        "student_id, users(username, email), classrooms!inner(adv_student)"
      )
      .eq("class_id", classId)
      .order("class_id", { ascending: true });

    if (error) {
      console.log(
        `Error fetching students for class ${classId}:`,
        error.message
      );
      return { success: false, students: [] };
    }

    // Map student records
    const students = data.map((record) => ({
      user_id: record.student_id,
      username: record.users.username,
      email: record.users.email,
      adv_student: record.classrooms.adv_student,
    }));

    return { success: true, students };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, students: [] };
  }
};

// Fetches students who are not yet registered for a given class
const getUnregisteredStudentsByClass = async (classId) => {
  try {
    // Step 1: Fetch all students who are already registered for the class
    const { data: registeredStudents, error: registeredError } = await db_con
      .from("classrooms_students")
      .select("student_id")
      .eq("class_id", classId);

    if (registeredError) {
      console.log(
        `Error fetching registered students for class ${classId}:`,
        registeredError.message
      );
      return { success: false, students: [] };
    }

    // Step 2: Extract the list of registered student IDs
    const registeredStudentIds = registeredStudents.map(
      (record) => record.student_id
    );

    // Step 3: Fetch all students who are not registered for the class
    const { data, error } = await db_con
      .from("users")
      .select("user_id, username, email")
      .eq("user_type", "student")
      .not("user_id", "in", `(${registeredStudentIds.join(",")})`); // Exclude the registered students

    if (error) {
      console.log(
        `Error fetching unregistered students for class ${classId}:`,
        error.message
      );
      console.log(registeredStudentIds);
      return { success: false, students: [] };
    }

    return { success: true, students: data };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, students: [] };
  }
};

const addStudentToClass = async (class_id, student_id) => {
  try {
    // add student to class
    const { data, error } = await db_con
      .from("classrooms_students")
      .insert([{ class_id, student_id }])
      .select()
      .single();

    if (error) {
      console.log("Save error:", error.message);
      return { success: false, message: "Save Failed!" };
    }

    return { success: true, student: data };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, message: "Something went wrong!" };
  }
};

const createNewClass = async (classname, lecturer_id) => {
  try {
    // add student to class
    const { data, error } = await db_con
      .from("classrooms")
      .insert([{ classname, lecturer_id }])
      .select()
      .single();

    if (error) {
      console.log("Save error:", error.message);
      return { success: false, message: "Save Failed!" };
    }

    return { success: true, class: data };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, message: "Something went wrong!" };
  }
};

const setAdvancedStudent = async (class_id, adv_student) => {
  try {
    // add student to class
    const { data, error } = await db_con
      .from("classrooms")
      .update([{ adv_student }])
      .eq("class_id", class_id)
      .select()
      .single();

    if (error) {
      console.log("Save error:", error.message);
      return { success: false, message: "Save Failed!" };
    }

    return { success: true, class: data };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, message: "Something went wrong!" };
  }
};

function VirtualClassMgmt() {
  const [myClasses, setMyClasses] = useState([]);
  const [classStudents, setClassStudents] = useState({}); // Store students per class
  const [unregStudents, setUnregStudents] = useState([]); // unregistered students (for a specific class)
  const [newClassName, setNewClassName] = useState(""); // for adding new classes
  const [selectedClassID, setSelectedClassID] = useState(0);

  const [selectedTab, setSelectedTab] = useState(0);

  const [attendanceData, setAttendanceData] = useState([]);

  const fetchMyClasses = async () => {
    const result = await getMyClasses();
    if (result.success) {
      setMyClasses(result.classes);

      // Sequential fetching - wait for each request to complete before starting the next
      for (const vclass of result.classes) {
        const studentResult = await getStudentsByClass(vclass.class_id);
        setClassStudents((prev) => ({
          ...prev,
          [vclass.class_id]: studentResult.students,
        }));
      }
    } else {
      console.log("Message:", result.message);
    }
  };

  const fetchAttendance = async () => {
    const result = await getAttendance();

    if (result.success) {
      setAttendanceData(result.attendance);
    } else {
      alert("Attendance data loading failed!");
    }
  };

  useEffect(() => {
    fetchAttendance();
    fetchMyClasses();
  }, []);

  const fetchUnregStudents = async (thisClassID) => {
    const result = await getUnregisteredStudentsByClass(thisClassID);
    setSelectedClassID(thisClassID);
    if (result.success) {
      setUnregStudents(result.students);
    } else {
      console.log("Message:", result.message);
    }
  };

  const handleAddStudent = async (classID, studentID) => {
    const result = await addStudentToClass(classID, studentID);

    if (result.success) {
      setUnregStudents((prevStudents) =>
        prevStudents.filter((student) => student.user_id !== studentID)
      );
      alert(`Save successful! The page will be reloaded now.`);
      window.location.reload();
    } else {
      alert(result.message);
    }
  };

  const handleCreateClass = async (classname) => {
    const result = await createNewClass(
      classname,
      JSON.parse(Cookies.get("auth"))["user_id"]
    );

    if (result.success) {
      alert(`Save successful! The page will be reloaded now.`);
      window.location.reload();
    } else {
      alert(result.message);
    }
  };

  const handleAdvanceStudentAssignments = async (class_id, adv_student) => {
    const result = await setAdvancedStudent(class_id, adv_student);

    if (result.success) {
      alert("Advanced Student Changed Successfully!");
      fetchAttendance();
      fetchMyClasses();
    } else {
      alert("Advanced Student Changing Failed!");
    }
  };

  return (
    <div>
      <div role="tablist" className="tabs tabs-boxed">
        <p
          role="tab"
          className={`max-sm:text-xs tab ${
            selectedTab === 0 ? "tab-active font-semibold" : ""
          }`}
          onClick={() => setSelectedTab(0)}
        >
          Your Classrooms
        </p>
        <p
          role="tab"
          className={`max-sm:text-xs tab ${
            selectedTab === 1 ? "tab-active font-semibold" : ""
          }`}
          onClick={() => setSelectedTab(1)}
        >
          Attendance Records
        </p>
      </div>

      {selectedTab === 0 && (
        <>
          <button
            onClick={() => document.getElementById("addClassModal").showModal()}
            className="mt-4 text-white btn btn-success btn-sm"
          >
            <School />
            Add a New Class
          </button>
          <div className="flex flex-col gap-3 mt-3">
            {myClasses.length > 0 ? (
              myClasses.map((vclass, index) => (
                <div key={index}>
                  <span className="flex gap-2 md:items-center max-md:flex-col">
                    <p className="font-semibold">{vclass.class_id}.</p>{" "}
                    {vclass.classname}
                    <button
                      onClick={() => {
                        document.getElementById("addStudModal").showModal();
                        fetchUnregStudents(vclass.class_id);
                      }}
                      className="text-white btn btn-success btn-sm w-fit"
                    >
                      <UserPlus />
                      Add Students
                    </button>
                  </span>
                  <div className="mt-3 overflow-x-auto border border-b-[1px] rounded-md">
                    <table className="table table-zebra">
                      <thead>
                        <tr>
                          <th>User ID</th>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Set as Advanced Student</th>
                        </tr>
                      </thead>
                      <tbody>
                        {classStudents[vclass.class_id]?.length > 0 ? (
                          classStudents[vclass.class_id].map((student) => (
                            <tr key={student.user_id}>
                              <td>{student.user_id}</td>
                              <td>{student.username}</td>
                              <td>{student.email}</td>
                              <td>
                                <button
                                  className={`btn btn-outline btn-sm ${
                                    student.user_id === student.adv_student
                                      ? "btn-active"
                                      : ""
                                  }`}
                                  onClick={() =>
                                    handleAdvanceStudentAssignments(
                                      vclass.class_id,
                                      student.user_id
                                    )
                                  }
                                >
                                  Advanced Student
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan="3"
                              className="text-center text-gray-500"
                            >
                              No students assigned
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No classes available</p>
            )}
          </div>
        </>
      )}

      {selectedTab === 1 && (
        <div className="mt-4 overflow-x-auto border">
          <table className="table table-zebra">
            {/* Table Head */}
            <thead>
              <tr>
                <th>#</th>
                <th>Meeting Name</th>
                <th>Student Name</th>
                <th>Student Email</th>
                <th>Status</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            {/* Table Body */}
            <tbody>
              {attendanceData.map((attendance, index) => (
                <tr key={index}>
                  <th>{index + 1}</th>
                  <td>{attendance.meeting_name}</td>
                  <td>{attendance.student.username}</td>
                  <td>{attendance.student.email}</td>
                  <td className="capitalize">{attendance.status}</td>
                  <td>{new Date(attendance.created_at).toString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/*add students modal*/}
      <dialog id="addStudModal" className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-bold">Add Students</h3>
          <div className="flex flex-col gap-3 mt-3">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Add to Class</th>
                </tr>
              </thead>
              <tbody>
                {unregStudents.map((student) => (
                  <tr key={student.user_id}>
                    <td>{student.user_id}</td>
                    <td>{student.username}</td>
                    <td>{student.email}</td>
                    <td>
                      <button
                        className="flex w-full gap-2 text-white btn btn-success"
                        onClick={() => {
                          handleAddStudent(selectedClassID, student.user_id);
                        }}
                      >
                        <PlusCircle />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
      {/*add classes modal*/}
      <dialog id="addClassModal" className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-bold">Add a Class</h3>
          <div className="flex flex-col gap-3 mt-3">
            <input
              type="text"
              className="input input-bordered"
              placeholder="Provide a class name"
              onChange={(e) => setNewClassName(e.target.value)}
            />
            <button
              className="btn"
              onClick={() => handleCreateClass(newClassName)}
            >
              Save
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </div>
  );
}

export default VirtualClassMgmt;
