import { createClient } from "@supabase/supabase-js";

const db_con = createClient(
  "https://rzengfljcornmzntwavk.supabase.co",
  "my-private-key-was-removed-from-public-repo"
);

export default db_con;
