import db_con from "../components/dbconfig";
import { useState, useEffect } from "react";
import Cookies from "js-cookie";

// Get the current user's info from cookies
const getCurrentUser = () => {
  try {
    return JSON.parse(Cookies.get("auth"));
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
};

// Get assigned student for the logged in parent
const getStudentForParent = async (parentId) => {
  try {
    const { data, error } = await db_con
      .from("students_parents")
      .select("student_id")
      .eq("parent_id", parentId)
      .single();

    if (error) {
      console.log("Student loading error:", error.message);
      return { success: false, message: "Load Failed!" };
    }
    return { success: true, student: data };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, message: "Something went wrong!" };
  }
};

// Get classes where the user is a lecturer
const getClassesForLecturer = async (lecturerId) => {
  try {
    const { data, error } = await db_con
      .from("classrooms")
      .select("class_id, classname")
      .eq("lecturer_id", lecturerId);

    if (error) {
      console.log("Lecturer's classes loading error:", error.message);
      return { success: false, message: "Load Failed!" };
    }
    return { success: true, classes: data };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, message: "Something went wrong!" };
  }
};

// Get students for a specific class
const getStudentsForClass = async (classId) => {
  try {
    const { data, error } = await db_con
      .from("classrooms_students")
      .select("student_id, users!inner(user_id, username)")
      .eq("class_id", classId);

    if (error) {
      console.log("Students loading error:", error.message);
      return { success: false, message: "Load Failed!" };
    }

    // Transform the data to be more usable
    const students = data.map((item) => ({
      user_id: item.users.user_id,
      username: item.users.username,
    }));

    return { success: true, students };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, message: "Something went wrong!" };
  }
};

// Get students for multiple classes
const getStudentsForClasses = async (classIds) => {
  try {
    // Get all student-class relationships
    const { data: classStudents, error } = await db_con
      .from("classrooms_students")
      .select("student_id")
      .in("class_id", classIds);

    if (error) {
      console.log("Students loading error:", error.message);
      return { success: false, message: "Load Failed!" };
    }

    // Extract unique student IDs
    const studentIds = [
      ...new Set(classStudents.map((item) => item.student_id)),
    ];

    return {
      success: true,
      studentIds, // Returns array like ["stud1", "stud2", "stud3"]
    };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, message: "Something went wrong!" };
  }
};

// Get classes where the user is a student
const getClassesForStudent = async (studentId) => {
  try {
    const { data, error } = await db_con
      .from("classrooms_students")
      .select("class_id, classrooms!inner(class_id, classname, lecturer_id)")
      .eq("student_id", studentId);

    if (error) {
      console.log("Student's classes loading error:", error.message);
      return { success: false, message: "Load Failed!" };
    }

    // Transform the data to be more usable
    const classes = data.map((item) => ({
      class_id: item.classrooms.class_id,
      classname: item.classrooms.classname,
      lecturer_id: item.classrooms.lecturer_id,
    }));

    return { success: true, classes };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, message: "Something went wrong!" };
  }
};

// Get lecturers for a student
const getLecturersForStudent = async (classesData) => {
  if (!classesData || !classesData.length)
    return { success: false, lecturers: [] };

  try {
    // Extract unique lecturer IDs
    const lecturerIds = [...new Set(classesData.map((cls) => cls.lecturer_id))];

    const { data, error } = await db_con
      .from("users")
      .select("user_id, username")
      .in("user_id", lecturerIds);

    if (error) {
      console.log("Lecturers loading error:", error.message);
      return { success: false, message: "Load Failed!" };
    }

    return { success: true, lecturers: data };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, message: "Something went wrong!" };
  }
};

// Get admins for a lecturers
const getAdminForLecturer = async (lecturerData) => {
  if (!lecturerData || !lecturerData.length)
    return { success: false, admins: [] };

  try {
    // Extract unique lecturer IDs
    const lecturerIds = [...new Set(lecturerData.map((lec) => lec.id))];

    const { data: insData, error: insError } = await db_con
      .from("institutions_lecturers")
      .select("ins_id")
      .in("lecturer_id", lecturerIds);

    if (insError) {
      console.log("Institutions loading error:", insError.message);
      return { success: false, message: "Load Failed!" };
    }

    // Extract unique institution IDs
    const insIds = [...new Set(insData.map((ins) => ins.ins_id))];

    const { data: adminData, error: adminError } = await db_con
      .from("institutions")
      .select("ins_admin, users!inner(username)")
      .in("ins_id", insIds);

    if (adminError) {
      console.log("Admin loading error:", adminError.message);
      return { success: false, message: "Load Failed!" };
    }

    return { success: true, admins: adminData };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, message: "Something went wrong!" };
  }
};

// Get parents for an array of students objects
const getParentForStudent = async (studentData) => {
  if (!studentData || !studentData.length)
    return { success: false, parents: [] };

  try {
    // Extract unique student IDs
    const studentIds = [...new Set(studentData.map((stud) => stud.id))];

    // First get all parent IDs
    const { data: parentData, error: parentError } = await db_con
      .from("students_parents")
      .select(`parent_id`)
      .in("student_id", studentIds);

    if (parentError) {
      console.log("Parents loading error:", parentError.message);
      return { success: false, message: "Load Failed!" };
    }

    // Extract unique parent IDs
    const parentIds = [
      ...new Set(parentData.map((parent) => parent.parent_id)),
    ];

    if (!parentIds.length) {
      return { success: true, parents: [] };
    }

    // Fetch usernames for all parents in one batch
    const { data: usersData, error: usersError } = await db_con
      .from("users")
      .select(`user_id, username`)
      .in("user_id", parentIds);

    if (usersError) {
      console.log("Users loading error:", usersError.message);
      return { success: false, message: "Load Failed!" };
    }

    // Combine the data
    const parentsWithUsernames = parentData.map((parent) => {
      const user = usersData.find((u) => u.user_id === parent.parent_id);
      return {
        parent_id: parent.parent_id,
        username: user?.username,
      };
    });

    return { success: true, parents: parentsWithUsernames };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, message: "Something went wrong!" };
  }
};

// Get parents for an array of stud ids
const getParentsForStudentIds = async (studentIds) => {
  if (!studentIds || !studentIds.length) {
    return { success: false, parents: [], message: "No student IDs provided" };
  }

  try {
    // Ensure we have unique student IDs
    const uniqueStudentIds = [...new Set(studentIds)];

    // Get all parent-student relationships
    const { data: parentRelations, error: relationError } = await db_con
      .from("students_parents")
      .select("student_id, parent_id")
      .in("student_id", uniqueStudentIds);

    if (relationError) {
      console.log("Parent relations error:", relationError.message);
      return { success: false, message: "Failed to load parent relations" };
    }

    if (!parentRelations.length) {
      return { success: true, parents: [], message: "No parents found" };
    }

    // Get unique parent IDs
    const parentIds = [...new Set(parentRelations.map((r) => r.parent_id))];

    // Fetch parent details
    const { data: parentDetails, error: detailError } = await db_con
      .from("users")
      .select("user_id, username, email") // Add other fields if needed
      .in("user_id", parentIds);

    if (detailError) {
      console.log("Parent details error:", detailError.message);
      return { success: false, message: "Failed to load parent details" };
    }

    // Map parents to students
    const parentsByStudent = parentRelations.map((relation) => {
      const parent = parentDetails.find(
        (p) => p.user_id === relation.parent_id
      );
      return {
        student_id: relation.student_id,
        parent_id: relation.parent_id,
        parent_username: parent?.username,
        parent_email: parent?.email,
      };
    });

    return {
      success: true,
      parents: parentsByStudent,
      message: "Parents loaded successfully",
    };
  } catch (error) {
    console.error("Error in getParentsForStudentIds:", error);
    return {
      success: false,
      parents: [],
      message: "Internal server error",
    };
  }
};

// Get classmates for a student
const getClassmatesForStudent = async (classesData, studentId) => {
  if (!classesData || !classesData.length)
    return { success: false, classmates: [] };

  try {
    const classIds = classesData.map((cls) => cls.class_id);

    // Get all student_ids from the student's classes
    const { data: studentsData, error: studentsError } = await db_con
      .from("classrooms_students")
      .select("student_id")
      .in("class_id", classIds);

    if (studentsError) {
      console.log("Classmates loading error:", studentsError.message);
      return { success: false, message: "Load Failed!" };
    }

    // Extract unique student IDs and remove self
    const studentIds = [
      ...new Set(studentsData.map((item) => item.student_id)),
    ].filter((id) => id !== studentId);

    if (studentIds.length === 0) {
      return { success: true, classmates: [] };
    }

    // Get user details for these students
    const { data: classmatesData, error: classmatesError } = await db_con
      .from("users")
      .select("user_id, username")
      .in("user_id", studentIds);

    if (classmatesError) {
      console.log("Classmates details loading error:", classmatesError.message);
      return { success: false, message: "Load Failed!" };
    }

    return { success: true, classmates: classmatesData };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, message: "Something went wrong!" };
  }
};

// Get classes where the user is a student
const getInsForAdmin = async (adminId) => {
  try {
    const { data: institution, error } = await db_con
      .from("institutions")
      .select("ins_id")
      .eq("ins_admin", adminId)
      .single();

    if (error) {
      console.log("Institution loading error:", error.message);
      return { success: false, message: "Load Failed!" };
    }

    return { success: true, data: institution };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, message: "Something went wrong!" };
  }
};

// Get lecturers for a student
const getLecturersForIns = async (ins_id) => {
  try {
    const { data, error } = await db_con
      .from("institutions_lecturers")
      .select("lecturer_id")
      .eq("ins_id", ins_id);

    if (error) {
      console.log("Lecturers loading error:", error.message);
      return { success: false, message: "Load Failed!" };
    }

    return { success: true, lecturers: data };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, message: "Something went wrong!" };
  }
};

const getClassesForAllLecturers = async (lecturers) => {
  try {
    // Use Promise.all to fetch classes for all lecturers in parallel
    const classPromises = lecturers.map((lecturer) =>
      getClassesForLecturer(lecturer.lecturer_id)
    );

    const allResults = await Promise.all(classPromises);

    // Transform results to the requested format
    const formattedResults = allResults.map((result, index) => ({
      lecturer_id: lecturers[index].lecturer_id,
      class_ids: result.success
        ? result.classes.map((cls) => cls.class_id)
        : [],
      error: result.success ? null : result.message,
    }));

    return {
      success: true,
      data: formattedResults,
    };
  } catch (error) {
    console.error("Error fetching classes for lecturers:", error);
    return {
      success: false,
      message: "Failed to fetch classes for all lecturers",
      error: error.message,
    };
  }
};

function LoadUsers() {
  const [individuals, setIndividuals] = useState([]);
  const [classGroups, setClassGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    // Keep track of the component mount status to prevent state updates after unmount
    let isMounted = true;

    const fetchData = async () => {
      try {
        const currentUser = getCurrentUser();

        if (!currentUser) {
          if (isMounted) {
            setError("User not authenticated");
            setLoading(false);
          }
          return;
        }

        const { user_id, user_type } = currentUser;

        // Check if we already loaded data for this user
        if (user_id === currentUserId && !loading) {
          return;
        }

        // Set the current user ID to track if we've loaded data for this user
        if (isMounted) {
          setCurrentUserId(user_id);
          setLoading(true);
        }

        // Handle based on user type (implementation remains the same)
        if (user_type === "lecturer") {
          // Get lecturer's classes
          const classesResult = await getClassesForLecturer(user_id);

          if (!classesResult.success) {
            if (isMounted) {
              setError(classesResult.message);
              setLoading(false);
            }
            return;
          }

          // Format class groups
          const formattedGroups = classesResult.classes.map((cls) => ({
            id: `${cls.class_id}`,
            name: cls.classname,
            type: "group",
            class_id: cls.class_id,
          }));

          let allStudents = [];
          let allIndividuals = [];

          for (const cls of classesResult.classes) {
            const studentsResult = await getStudentsForClass(cls.class_id);
            if (studentsResult.success) {
              allStudents = [...allStudents, ...studentsResult.students];
            }
          }

          // Remove duplicates
          const uniqueStudents = allStudents.filter(
            (student, index, self) =>
              index === self.findIndex((s) => s.user_id === student.user_id)
          );

          // Format student list
          const formattedStudents = uniqueStudents.map((student) => ({
            id: student.user_id,
            name: student.username,
            type: "individual",
            role: "student",
          }));

          allIndividuals = [...allIndividuals, ...formattedStudents];

          const parentResult = await getParentForStudent(formattedStudents);

          if (!parentResult.success) {
            if (isMounted) {
              setError(parentResult.message);
              setLoading(false);
            }
            return;
          }

          // Format parent list
          const formattedParents = parentResult.parents.map((parent) => ({
            id: parent.parent_id,
            name: parent.username,
            type: "individual",
            role: "parent",
          }));

          allIndividuals = [...allIndividuals, ...formattedParents];

          if (isMounted) {
            setClassGroups(formattedGroups);
            setIndividuals(allIndividuals);
          }
        } else if (user_type === "student") {
          // Student logic implementation (remains the same)
          const classesResult = await getClassesForStudent(user_id);

          if (!classesResult.success) {
            if (isMounted) {
              setError(classesResult.message);
              setLoading(false);
            }
            return;
          }

          // Format class groups
          const formattedGroups = classesResult.classes.map((cls) => ({
            id: `${cls.class_id}`,
            name: cls.classname,
            type: "group",
            class_id: cls.class_id,
          }));

          // Get lecturers
          const lecturersResult = await getLecturersForStudent(
            classesResult.classes
          );

          // Get classmates
          const classmatesResult = await getClassmatesForStudent(
            classesResult.classes,
            user_id
          );

          let allIndividuals = [];

          if (lecturersResult.success) {
            const formattedLecturers = lecturersResult.lecturers.map(
              (lecturer) => ({
                id: lecturer.user_id,
                name: lecturer.username,
                type: "individual",
                role: "lecturer",
              })
            );
            allIndividuals = [...allIndividuals, ...formattedLecturers];
          }

          if (classmatesResult.success) {
            const formattedClassmates = classmatesResult.classmates.map(
              (classmate) => ({
                id: classmate.user_id,
                name: classmate.username,
                type: "individual",
                role: "student",
              })
            );
            allIndividuals = [...allIndividuals, ...formattedClassmates];
          }

          if (isMounted) {
            setClassGroups(formattedGroups);
            setIndividuals(allIndividuals);
          }
        } else if (user_type === "parent") {
          // Get lecturers of classes that are registered by the linked student
          // implement above logic below !!

          const result = await getStudentForParent(getCurrentUser()["user_id"]);

          const studentId = result.student.student_id;

          const classesResult = await getClassesForStudent(studentId);

          const lecturersResult = await getLecturersForStudent(
            classesResult.classes
          );

          let allIndividuals = [];

          if (!lecturersResult.success) {
            if (isMounted) {
              setError(classesResult.message);
              setLoading(false);
            }
            return;
          }

          const formattedLecturers = lecturersResult.lecturers.map(
            (lecturer) => ({
              id: lecturer.user_id,
              name: lecturer.username,
              type: "individual",
              role: "lecturer",
            })
          );

          allIndividuals = [...allIndividuals, ...formattedLecturers];

          const adminsResult = await getAdminForLecturer(formattedLecturers);

          if (!adminsResult.success) {
            if (isMounted) {
              setError(adminsResult.message);
              setLoading(false);
            }
            return;
          }

          const formattedAdmins = adminsResult.admins.map((admin) => ({
            id: admin.ins_admin,
            name: admin.users.username,
            type: "individual",
            role: "admin",
          }));

          allIndividuals = [...allIndividuals, ...formattedAdmins];

          if (isMounted) {
            setIndividuals(allIndividuals);
          }
        } else if (user_type === "admin") {
          // get parents of students of lecturers assignned to institutions
          const insResult = await getInsForAdmin(getCurrentUser()["user_id"]);

          const insId = insResult.data.ins_id;

          const lecResult = await getLecturersForIns(insId);

          const lecturers = lecResult.lecturers;

          const classResult = await getClassesForAllLecturers(lecturers);

          const classesArray = classResult.data.flatMap(
            (lecturerData) => lecturerData.class_ids
          );

          const studResult = await getStudentsForClasses(classesArray);

          const parResult = await getParentsForStudentIds(
            studResult.studentIds
          );

          const formattedParents = parResult.parents.map((parent) => ({
            id: parent.parent_id,
            name: parent.parent_username,
            type: "individual",
            role: "parent",
          }));

          if (isMounted) {
            setIndividuals(formattedParents);
          }
        }

        if (isMounted) {
          setLoading(false);
        }
      } catch (error) {
        console.error("Error in data fetching:", error);
        if (isMounted) {
          setError("An unexpected error occurred");
          setLoading(false);
        }
      }
    };

    fetchData();

    // Cleanup function to prevent memory leaks and state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [currentUserId]); // Only depends on currentUserId to prevent unnecessary reloads

  return {
    individuals,
    classGroups,
    loading,
    error,
  };
}

export default LoadUsers;
