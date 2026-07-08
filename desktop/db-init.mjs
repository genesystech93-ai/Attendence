import fs from 'fs';
import pkg from 'pg';
const { Client } = pkg;

const connectionString = 'postgresql://postgres:SURAJmagar%409890@db.yvcgcaelwhcvkudqjuhs.supabase.co:5432/postgres';

async function runSchema() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log("Connected to Supabase Postgres.");

    const schemaPath = '../backend/schema.sql';
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log("Applying schema...");
    await client.query(schemaSql);
    console.log("Schema applied successfully.");

  } catch (error) {
    console.error("Error applying schema:", error);
  } finally {
    await client.end();
  }
}

runSchema();
