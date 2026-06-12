import pool from "./src/server/db";

async function checkSchema() {
  console.log("--- Checking notifications table schema ---");
  try {
    const tableCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'notifications';
    `);
    console.log("Columns of notifications table:", tableCheck.rows);

    const userCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users';
    `);
    console.log("Columns of users table:", userCheck.rows);

    const checkCount = await pool.query(`SELECT COUNT(*) FROM notifications;`);
    console.log("Total notifications:", checkCount.rows[0].count);

  } catch (err: any) {
    console.error("Schema check failed:", err.message);
  }
  process.exit(0);
}

checkSchema();
