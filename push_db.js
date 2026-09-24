import fs from 'fs';
import pkg from 'pg';
const { Client } = pkg;

async function run() {
  const client = new Client({
    connectionString: "postgresql://postgres:i%40vfJ6%21NFy%263n-L@db.pscgatabfgvmmhnuvocu.supabase.co:5432/postgres"
  });
  try {
    await client.connect();
    console.log("Connected to Supabase DB!");
    const sql = fs.readFileSync('supabase/schema.sql', 'utf8');
    console.log("Executing schema.sql (size: " + sql.length + " bytes)...");
    await client.query(sql);
    console.log("Schema applied successfully!");
    
    // Also run migrations
    const files = fs.readdirSync('supabase/migrations').sort();
    for (const file of files) {
      if (file.endsWith('.sql')) {
        console.log("Executing migration: " + file);
        const migrationSql = fs.readFileSync('supabase/migrations/' + file, 'utf8');
        await client.query(migrationSql);
        console.log("Migration applied: " + file);
      }
    }
  } catch (err) {
    console.error("Error executing schema:", err);
  } finally {
    await client.end();
  }
}
run();
