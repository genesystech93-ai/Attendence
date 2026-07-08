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
      
      -- Rename email to username
      DO $$
      BEGIN
        IF EXISTS(SELECT *
          FROM information_schema.columns
          WHERE table_name='users' and column_name='email')
        THEN
            ALTER TABLE public.users RENAME COLUMN email TO username;
        END IF;
      END $$;

      -- Add password column
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password TEXT NOT NULL DEFAULT 'password123';

      -- Clear old data to prevent conflicts
      DELETE FROM public.attendance_logs;
      DELETE FROM public.leave_requests;
      DELETE FROM public.users;

      -- Insert permanent Admin user
      INSERT INTO public.users (username, full_name, role, password) 
      VALUES ('genesoft', 'Super Admin', 'admin', 'SURAJmagar@9890');
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
