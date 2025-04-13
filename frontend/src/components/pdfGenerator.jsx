import PDFDocument from "pdfkit/js/pdfkit.standalone";
import { saveAs } from "file-saver";
import { format } from "date-fns";

// Helper function to create a blob from PDFKit document
const createBlob = (pdfDoc) => {
  return new Promise((resolve) => {
    const chunks = [];
    pdfDoc.on("data", (chunk) => chunks.push(chunk));
    pdfDoc.on("end", () => {
      const blob = new Blob(chunks, { type: "application/pdf" });
      resolve(blob);
    });
    pdfDoc.end();
  });
};

// Format date strings consistently
const formatDate = (dateString) => {
  try {
    return format(new Date(dateString), "MMM dd, yyyy - hh:mm:ss a");
  } catch (e) {
    return dateString || "N/A";
  }
};

// Generate performance report for a student
export const generatePerformanceReport = async (
  student,
  mcqSubmissions,
  essaySubmissions,
  aiAnalysis
) => {
  // Create a new PDF document
  const doc = new PDFDocument({ margin: 50 });

  // Add metadata
  doc.info.Title = `Performance Report - ${student.student_name}`;
  doc.info.Author = "Automated Reporting System";

  // Add title
  doc.fontSize(25).text("Student Performance Report", { align: "center" });
  doc.moveDown();

  // Add student info
  doc.fontSize(14).text("Student Information", { underline: true });
  doc.fontSize(12).text(`Name: ${student.student_name}`);
  doc.text(`Email: ${student.student_email}`);
  doc.text(`ID: ${student.student_id}`);
  doc.moveDown(2);

  // MCQ Exam Performance
  doc
    .fontSize(14)
    .text("Multiple Choice Exam Performance", { underline: true });
  doc.moveDown();

  if (mcqSubmissions && mcqSubmissions.length > 0) {
    // Create table header
    const mcqTableTop = doc.y;

    doc.fontSize(10);

    // Draw header
    doc.text("Exam ID", 50, mcqTableTop);
    doc.text("Marks", 150, mcqTableTop);
    doc.text("Date", 250, mcqTableTop);

    // Draw line below header
    doc
      .moveTo(50, mcqTableTop + 20)
      .lineTo(550, mcqTableTop + 20)
      .stroke();

    // Draw data rows
    let currentY = mcqTableTop + 30;

    mcqSubmissions.forEach((exam) => {
      doc.text(exam.exam_id, 50, currentY);
      doc.text(exam.marks, 150, currentY);
      doc.text(formatDate(exam.created_at), 250, currentY);

      currentY += 20;
    });

    // Calculate average marks
    const averageMark =
      mcqSubmissions.reduce((sum, exam) => sum + exam.marks, 0) /
      mcqSubmissions.length;

    doc.moveTo(50, currentY).lineTo(550, currentY).stroke();
    currentY += 20;
    doc.text(`Average Score: ${averageMark.toFixed(2)}`, 50, currentY);

    doc.moveDown(2);
  } else {
    doc.text("No multiple choice exam submissions available.");
    doc.moveDown();
  }

  // Essay Exam Performance
  doc.fontSize(14).text("Essay Exam Performance", { underline: true });
  doc.moveDown();

  if (essaySubmissions && essaySubmissions.length > 0) {
    // For each essay submission
    essaySubmissions.forEach((essay, index) => {
      doc.fontSize(12).text(`Essay ${index + 1} (Exam ID: ${essay.exam_id})`);
      doc.fontSize(10).text(`Submitted: ${formatDate(essay.created_at)}`);

      // Check if we need a new page for this essay
      if (doc.y > 650) {
        doc.addPage();
      }

      doc.fontSize(11).text("Analysis:");
      doc.fontSize(10).text(essay.analysis || "No analysis available", {
        width: 500,
        align: "justify",
      });

      doc.moveDown();
    });
  } else {
    doc.text("No essay exam submissions available.");
  }

  // Create a recommendations section
  if (
    (mcqSubmissions && mcqSubmissions.length > 0) ||
    (essaySubmissions && essaySubmissions.length > 0)
  ) {
    // Add a new page if we're close to the end
    if (doc.y > 650) {
      doc.addPage();
    }

    doc.fontSize(14).text("Recommendations", { underline: true });
    doc.moveDown();
    doc.fontSize(11).text(aiAnalysis.reply, { align: "justify", width: 500 });
  }

  // Generate blob and save
  const blob = await createBlob(doc);
  saveAs(blob, `${student.student_name}_Performance_Report.pdf`);

  return true;
};

// Generate attendance report for a student
export const generateAttendanceReport = async (student, attendanceData) => {
  // Create a new PDF document
  const doc = new PDFDocument({ margin: 50 });

  // Add metadata
  doc.info.Title = `Attendance Report - ${student.student_name}`;
  doc.info.Author = "Automated Reporting System";

  // Add title
  doc.fontSize(25).text("Student Attendance Report", { align: "center" });
  doc.moveDown();

  // Add student info
  doc.fontSize(14).text("Student Information", { underline: true });
  doc.fontSize(12).text(`Name: ${student.student_name}`);
  doc.text(`Email: ${student.student_email}`);
  doc.text(`ID: ${student.student_id}`);
  doc.moveDown(2);

  // Attendance Summary Statistics
  if (attendanceData && attendanceData.length > 0) {
    // Calculate statistics
    const totalMeetings = attendanceData.length / 2;

    // Add summary statistics
    doc.fontSize(14).text("Attendance Summary", { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(`Total Meetings: ${totalMeetings}`);
    doc.moveDown();

    // Detailed Attendance Records
    doc.fontSize(14).text("Detailed Attendance Records", { underline: true });
    doc.moveDown();

    // Create table header
    const tableTop = doc.y;

    doc.fontSize(10);
    doc.text("Meeting", 50, tableTop);
    doc.text("Date", 250, tableTop);
    doc.text("Status", 400, tableTop);

    // Draw line below header
    doc
      .moveTo(50, tableTop + 20)
      .lineTo(550, tableTop + 20)
      .stroke();

    // Check if we need a new page
    if (doc.y > 700) {
      doc.addPage();
    }

    // Draw data rows
    let currentY = tableTop + 30;

    attendanceData.forEach((record) => {
      // If we're near the bottom of the page, add a new page
      if (currentY > 700) {
        doc.addPage();
        currentY = 50;

        // Redraw header on new page
        doc.fontSize(10);
        doc.text("Meeting", 50, currentY);
        doc.text("Date", 250, currentY);
        doc.text("Status", 400, currentY);

        // Draw line below header
        doc
          .moveTo(50, currentY + 20)
          .lineTo(550, currentY + 20)
          .stroke();

        currentY += 30;
      }

      doc.fillColor("#000000");
      doc.text(
        record.meeting_name || `Meeting ${record.attendance_id}`,
        50,
        currentY
      );
      doc.text(formatDate(record.created_at), 250, currentY);
      doc.text(record.status, 400, currentY);

      currentY += 20;
    });
  } else {
    doc.text("No attendance data available.");
  }

  // Generate blob and save
  const blob = await createBlob(doc);
  saveAs(blob, `${student.student_name}_Attendance_Report.pdf`);

  return true;
};
