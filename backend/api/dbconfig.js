const { createClient } = require('@supabase/supabase-js');

const db_con = createClient(
  "https://rzengfljcornmzntwavk.supabase.co", 
  "my-private-key-was-removed-from-public-repo"
);

module.exports = db_con;
