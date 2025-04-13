import { createClient } from "@supabase/supabase-js";

const db_con = createClient(
  "https://rzengfljcornmzntwavk.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6ZW5nZmxqY29ybm16bnR3YXZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc1NDg1NTcsImV4cCI6MjA1MzEyNDU1N30.rsnMsP53TQKMc18TlXGzWFgV9tEtKhBdzBSVg6HG4uE"
);

export default db_con;