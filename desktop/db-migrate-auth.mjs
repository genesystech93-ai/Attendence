import pkg from 'pg';
const { Client } = pkg;

const connectionString = 'postgresql://postgres:SURAJmagar%409890@db.yvcgcaelwhcvkudqjuhs.supabase.co:5432/postgres';

async function migrate() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log("Connected to Supabase Postgres.");

    const sql = `
      -- Remove auth.users constraint
      ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;
      
      -- Give ID a default uuid generator since it no longer inherits from auth.users
      ALTER TABLE public.users ALTER COLUMN id SET DEFAULT gen_random_uuid();
      
      -- Add password column
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password TEXT NOT NULL DEFAULT 'password123';

      -- Ensure genesoft exists
      INSERT INTO public.users (username, full_name, role, password) 
      VALUES ('genesoft', 'Super Admin', 'admin', 'SURAJmagar@9890')
      ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password;

      -- Disable RLS so anonymous web clients can query and mutate tables
      ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
      ALTER TABLE public.offices DISABLE ROW LEVEL SECURITY;
      ALTER TABLE public.attendance_logs DISABLE ROW LEVEL SECURITY;
      ALTER TABLE public.leave_requests DISABLE ROW LEVEL SECURITY;
    `;

    console.log("Applying auth migration...");
    await client.query(sql);
    console.log("Migration applied successfully.");

  } catch (error) {
    console.error("Error applying migration:", error);
  } finally {
    await client.end();
  }
}

migrate();
