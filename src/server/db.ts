import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import alasql from 'alasql';

const { Pool } = pg;

const CONFIG_FILE = path.join(process.cwd(), 'db', 'db_config.json');

// Get initial connection string
let activeConnectionString = "";
try {
  const parentDir = path.dirname(CONFIG_FILE);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }
  if (fs.existsSync(CONFIG_FILE)) {
    const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    if (cfg && cfg.connectionString) {
      activeConnectionString = cfg.connectionString;
    }
  }
} catch (e) {
  console.error("Failed to read db_config.json:", e);
}

if (!activeConnectionString) {
  activeConnectionString = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_KfIik80cXFQO@ep-fancy-dream-aqjle7ix-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
}

// Instantiate PostgreSQL database pool
let pgPool = new Pool({
  connectionString: activeConnectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

let useLocalFallback = false;
const DB_FILE = path.join(process.cwd(), 'db', 'local_store.json');

export function getActiveConnectionString() {
  return activeConnectionString;
}

export function getUseLocalFallback() {
  return useLocalFallback;
}

export function setUseLocalFallback(val: boolean) {
  useLocalFallback = val;
}

export function updatePgPool(newConnectionString: string) {
  try {
    const oldPool = pgPool;
    pgPool = new Pool({
      connectionString: newConnectionString,
      ssl: {
        rejectUnauthorized: false
      }
    });
    activeConnectionString = newConnectionString;
    useLocalFallback = false; // Reset fallback to test Postgres with the new connection
    
    // Save to config file for persistence across server restarts
    try {
      const parentDir = path.dirname(CONFIG_FILE);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      fs.writeFileSync(CONFIG_FILE, JSON.stringify({ connectionString: newConnectionString }, null, 2), 'utf8');
    } catch (fsErr) {
      console.error("Failed to write to db_config.json:", fsErr);
    }

    // Gracefully shutdown the old pool
    oldPool.end().catch(err => console.log("Old pg pool closed with error:", err));
    return true;
  } catch (err) {
    console.error("Failed to rebuild pg pool:", err);
    return false;
  }
}

// Initialize local Alasql tables if fallback is used
export function initLocalDbSchema() {
  if (useLocalFallback) return; // Prevent double initialization
  
  console.log("⚠️ Server-Side Warning: PostgreSQL query failed, quota limit reached, or unreachable. Seamlessly activating local persistent JSON database fallback! 🔌");
  useLocalFallback = true;
  
  try {
    alasql(`CREATE TABLE IF NOT EXISTS users (
      id INT UNIQUE AUTO_INCREMENT,
      username STRING,
      email STRING,
      password STRING,
      bio STRING,
      avatar_url STRING,
      is_verified BOOLEAN,
      role STRING,
      created_at TIMESTAMP
    )`);
    alasql(`CREATE TABLE IF NOT EXISTS posts (
      id INT UNIQUE AUTO_INCREMENT,
      user_id INT,
      content STRING,
      image_url STRING,
      video_url STRING,
      created_at TIMESTAMP
    )`);
    alasql(`CREATE TABLE IF NOT EXISTS likes (
      id INT UNIQUE AUTO_INCREMENT,
      user_id INT,
      post_id INT,
      created_at TIMESTAMP
    )`);
    alasql(`CREATE TABLE IF NOT EXISTS conversations (
      id INT UNIQUE AUTO_INCREMENT,
      user1_id INT,
      user2_id INT,
      created_at TIMESTAMP,
      updated_at TIMESTAMP
    )`);
    alasql(`CREATE TABLE IF NOT EXISTS messages (
      id INT UNIQUE AUTO_INCREMENT,
      conversation_id INT,
      sender_id INT,
      receiver_id INT,
      message STRING,
      type STRING,
      attachment_url STRING,
      reply_to_id INT,
      is_edited BOOLEAN,
      is_deleted BOOLEAN,
      status STRING,
      created_at TIMESTAMP
    )`);
    alasql(`CREATE TABLE IF NOT EXISTS message_reactions (
      id INT UNIQUE AUTO_INCREMENT,
      message_id INT,
      user_id INT,
      emoji STRING,
      created_at TIMESTAMP
    )`);
    alasql(`CREATE TABLE IF NOT EXISTS follows (
      id INT UNIQUE AUTO_INCREMENT,
      follower_id INT,
      following_id INT,
      created_at TIMESTAMP
    )`);
    alasql(`CREATE TABLE IF NOT EXISTS comments (
      id INT UNIQUE AUTO_INCREMENT,
      user_id INT,
      post_id INT,
      content STRING,
      created_at TIMESTAMP
    )`);
    alasql(`CREATE TABLE IF NOT EXISTS notifications (
      id INT UNIQUE AUTO_INCREMENT,
      sender_id INT,
      receiver_id INT,
      type STRING,
      post_id INT,
      content STRING,
      is_read BOOLEAN,
      created_at TIMESTAMP
    )`);
    alasql(`CREATE TABLE IF NOT EXISTS reels (
      id INT UNIQUE AUTO_INCREMENT,
      user_id INT,
      video_url STRING,
      caption STRING,
      is_ai_moderate BOOLEAN,
      created_at TIMESTAMP
    )`);
    alasql(`CREATE TABLE IF NOT EXISTS reel_likes (
      id INT UNIQUE AUTO_INCREMENT,
      user_id INT,
      reel_id INT,
      created_at TIMESTAMP
    )`);
    alasql(`CREATE TABLE IF NOT EXISTS reel_comments (
      id INT UNIQUE AUTO_INCREMENT,
      user_id INT,
      reel_id INT,
      content STRING,
      like_count INT,
      created_at TIMESTAMP
    )`);
    alasql(`CREATE TABLE IF NOT EXISTS reel_comment_likes (
      id INT UNIQUE AUTO_INCREMENT,
      user_id INT,
      comment_id INT,
      created_at TIMESTAMP
    )`);
    alasql(`CREATE TABLE IF NOT EXISTS advertisements (
      id INT UNIQUE AUTO_INCREMENT,
      author_id INT,
      title STRING,
      image_url STRING,
      destination_link STRING,
      status STRING,
      impressions INT,
      clicks INT,
      is_promoted_post BOOLEAN,
      original_post_id INT,
      created_at TIMESTAMP
    )`);
    alasql(`CREATE TABLE IF NOT EXISTS user_status (
      user_id INT UNIQUE,
      is_online BOOLEAN,
      last_seen TIMESTAMP
    )`);

    // Load data if backup file exists
    if (fs.existsSync(DB_FILE)) {
      console.log("Loading local database storage data from:", DB_FILE);
      const fileContent = fs.readFileSync(DB_FILE, 'utf8');
      if (fileContent.trim()) {
        const parsed = JSON.parse(fileContent);
        // Load rows into tables
        for (const tableName of Object.keys(parsed)) {
          if (alasql.tables[tableName]) {
            alasql.tables[tableName].data = parsed[tableName];
            // Update sequence generator auto increment value
            let maxId = 0;
            for (const row of parsed[tableName]) {
              if (row && typeof row.id === 'number' && row.id > maxId) {
                maxId = row.id;
              }
            }
            const tableObj = alasql.tables[tableName] as any;
            if (tableObj && tableObj.identities && tableObj.identities.id) {
              tableObj.identities.id.value = maxId + 1;
            }
          }
        }
      }
    }
    console.log("Local database successfully initialized with persistent fallback.");
  } catch (err) {
    console.error("Failed to initialize Alasql schemas:", err);
  }
}

// Save databases to local store JSON
function persistLocalDb() {
  try {
    const parentDir = path.dirname(DB_FILE);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    
    const dbData: Record<string, any[]> = {};
    for (const tableName of Object.keys(alasql.tables)) {
      dbData[tableName] = alasql.tables[tableName].data || [];
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2), 'utf8');
  } catch (err) {
    console.error("Persistent save to local disk failed:", err);
  }
}

// Register custom functions to prevent parse or execution errors on Alasql fallback
try {
  alasql.fn.NOW = () => new Date().toISOString().replace('T', ' ').replace('Z', '');
  alasql.fn.now = () => new Date().toISOString().replace('T', ' ').replace('Z', '');
  alasql.fn.GREATEST = (...args: any[]) => Math.max(...args.map(a => Number(a) || 0));
  alasql.fn.greatest = (...args: any[]) => Math.max(...args.map(a => Number(a) || 0));
  alasql.fn.COALESCE = (...args: any[]) => {
    for (const arg of args) {
      if (arg !== null && arg !== undefined) return arg;
    }
    return null;
  };
  alasql.fn.coalesce = (...args: any[]) => {
    for (const arg of args) {
      if (arg !== null && arg !== undefined) return arg;
    }
    return null;
  };
} catch (fnErr) {
  console.error("Failed to register Alasql functions:", fnErr);
}

// Map PostgreSQL queries to standard Alasql queries
function executeQueryInLocal(sql: string, params: any[] = []): { rows: any[], rowCount: number } {
  let processedSql = sql;

  // Intercept schema creation and index creation so it doesn't crash on Alasql
  if (
    processedSql.match(/CREATE\s+TABLE/i) || 
    processedSql.match(/ALTER\s+TABLE/i) || 
    processedSql.match(/CREATE\s+INDEX/i) ||
    processedSql.match(/DO\s+\$\$/i)
  ) {
    return { rows: [], rowCount: 0 };
  }

  // Intercept the special user_status ON CONFLICT query:
  if (processedSql.match(/INSERT\s+INTO\s+user_status/i) && processedSql.match(/ON\s+CONFLICT/i)) {
    const userId = params[0];
    const check = alasql(`SELECT * FROM user_status WHERE user_id = ?`, [userId]) as any[];
    if (check && check.length > 0) {
      alasql(`UPDATE user_status SET is_online = TRUE, last_seen = NOW() WHERE user_id = ?`, [userId]);
    } else {
      alasql(`INSERT INTO user_status (user_id, is_online, last_seen) VALUES (?, TRUE, NOW())`, [userId]);
    }
    persistLocalDb();
    return { rows: [], rowCount: 1 };
  }

  // Replace Postgres-specific INTERVAL time addition with string literal representation for Alasql parser
  if (processedSql.includes("NOW() + INTERVAL '15 minutes'")) {
    const futureDate = new Date(Date.now() + 15 * 60 * 1000).toISOString().replace('T', ' ').replace('Z', '');
    processedSql = processedSql.replace("NOW() + INTERVAL '15 minutes'", `'${futureDate}'`);
  }

  // Handle standard postgres queries parameters converting $1, $2 to ?
  const reorderedParams: any[] = [];
  processedSql = processedSql.replace(/\$([0-9]+)/g, (match, num) => {
    const paramIndex = parseInt(num, 10) - 1;
    reorderedParams.push(params[paramIndex] !== undefined ? params[paramIndex] : null);
    return '?';
  });

  // Handle case-insensitive ILIKE which Alasql doesn't support by default. Convert:
  // "username ILIKE ?" to "LOWER(username) LIKE LOWER(?)"
  processedSql = processedSql.replace(/([a-zA-Z0-9_\.]+)\s+ILIKE\s+(\?)/gi, 'LOWER($1) LIKE LOWER($2)');

  // Trim Postgres RETURNING clause
  const hasReturning = processedSql.match(/RETURNING\s+(.+)$/i);
  if (hasReturning) {
    processedSql = processedSql.replace(/RETURNING\s+(.+)$/i, '').trim();
  }

  let rows: any[] = [];
  try {
    const isMutation = processedSql.match(/INSERT/i) || processedSql.match(/UPDATE/i) || processedSql.match(/DELETE/i);
    
    if (processedSql.match(/INSERT/i)) {
      // Find the targeted table
      const tableMatch = processedSql.match(/INSERT\s+INTO\s+([a-zA-Z0-9_]+)/i);
      const tableName = tableMatch ? tableMatch[1].toLowerCase() : null;
      
      alasql(processedSql, reorderedParams);
      persistLocalDb();
      
      if (tableName && alasql.tables[tableName]) {
        // If it was an insert, the newly created record is returned inside row payload.
        const tableData = alasql.tables[tableName].data;
        const insertedRow = tableData[tableData.length - 1];
        rows = [insertedRow || {}];
      }
    } else if (processedSql.match(/UPDATE/i)) {
      // Find the targeted table
      const tableMatch = processedSql.match(/UPDATE\s+([a-zA-Z0-9_]+)/i);
      const tableName = tableMatch ? tableMatch[1].toLowerCase() : null;
      
      alasql(processedSql, reorderedParams);
      persistLocalDb();
      
      if (tableName && alasql.tables[tableName] && hasReturning) {
        const tableData = alasql.tables[tableName].data || [];
        // Extract all number values from parameters as potential ID matching values
        const idCandidates = params
          .map(p => {
            if (typeof p === 'number') return p;
            if (typeof p === 'string' && /^\d+$/.test(p)) return Number(p);
            return null;
          })
          .filter((p): p is number => p !== null);
          
        // Find modified records in the database table
        const matchedRows = tableData.filter((row: any) => row && idCandidates.includes(Number(row.id)));
        rows = matchedRows;
      } else {
        rows = [];
      }
    } else {
      rows = alasql(processedSql, reorderedParams);
      if (isMutation) {
        persistLocalDb();
      }
    }
  } catch (err: any) {
    console.error("Local Alasql Query Error:", err.message, "on query:", processedSql);
    // Return empty results instead of crashing the process entirely
    return { rows: [], rowCount: 0 };
  }

  if (!Array.isArray(rows)) {
    if (typeof rows === 'number') {
      return { rows: [], rowCount: rows };
    }
    rows = rows ? [rows] : [];
  }

  return {
    rows,
    rowCount: rows.length
  };
}

// Detect physical connection error or infrastructure limit/failure.
// We should NOT invoke fallback on typical user-level database errors such as constraint names, unique violations or column syntax errors.
function isConnectionError(err: any): boolean {
  if (!err) return false;
  const code = String(err.code || '');
  
  // Class 08: Connection Exception
  // Class 57: Operator Intervention (admin shutdown etc.)
  if (code.startsWith('08') || code.startsWith('57') || code === 'ECONNREFUSED' || code === 'ENOTFOUND') {
    return true;
  }

  // Integrity constraints and syntax violations are typical user-controlled errors. Don't fallback!
  if (code.startsWith('23') || code.startsWith('42')) {
    return false;
  }

  const message = String(err.message || '').toLowerCase();
  if (
    message.includes('quota') || 
    message.includes('limit') || 
    message.includes('connection') || 
    message.includes('refused') || 
    message.includes('timeout') ||
    message.includes('ssl') ||
    message.includes('terminated') ||
    message.includes('unreachable') ||
    message.includes('econnrefused')
  ) {
    return true;
  }
  return false;
}

// Proxied Pool Object mimicking the exact pg Pool API
const pool = {
  query: async (text: string | { text: string; values?: any[] }, params?: any[]): Promise<{ rows: any[], rowCount: number }> => {
    let sqlText = typeof text === 'string' ? text : text.text;
    let sqlParams = typeof text === 'string' ? (params || []) : (text.values || []);

    if (useLocalFallback) {
      return executeQueryInLocal(sqlText, sqlParams);
    }

    try {
      return await pgPool.query(sqlText, sqlParams);
    } catch (err: any) {
      if (isConnectionError(err)) {
        console.warn("PostgreSQL Connection error occurred. Activating local persistent fallback:", err.message);
        initLocalDbSchema();
        return executeQueryInLocal(sqlText, sqlParams);
      }
      // Re-throw normal integrity validation errors to allow controllers/applications to react appropriately
      throw err;
    }
  },
  
  // Backwards compatibility handlers
  connect: async () => {
    if (useLocalFallback) {
      return {
        query: async (text: string, params?: any[]) => executeQueryInLocal(text, params),
        release: () => {}
      };
    }
    try {
      return await pgPool.connect();
    } catch (err: any) {
      if (isConnectionError(err)) {
        console.warn("PostgreSQL Connection error on connect(). Activating local fallback:", err.message);
        initLocalDbSchema();
        return {
          query: async (text: string, params?: any[]) => executeQueryInLocal(text, params),
          release: () => {}
        };
      }
      throw err;
    }
  },
  
  end: async () => {
    await pgPool.end();
  }
};

export default pool;
