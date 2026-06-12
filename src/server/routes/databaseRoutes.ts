import express from 'express';
import pool, { getActiveConnectionString, getUseLocalFallback, updatePgPool, setUseLocalFallback } from '../db';
import { initDb } from '../initDb';
import { getSmtpConfig, saveSmtpConfig, verifySmtpAndSendTest } from '../lib/emailService';

const router = express.Router();

function maskConnectionString(uri: string) {
  if (!uri) return "";
  try {
    const regex = /^(postgresql:\/\/[^:]+:)([^@]+)(@.+)$/i;
    if (regex.test(uri)) {
      return uri.replace(regex, '$1********$3');
    }
    return uri.substring(0, Math.min(15, uri.length)) + '...';
  } catch (e) {
    return uri.substring(0, Math.min(10, uri.length)) + '...';
  }
}

function maskSmtpPassword(pwd: string) {
  if (!pwd) return "";
  if (pwd.length <= 4) return "****";
  return pwd.substring(0, 2) + "********" + pwd.substring(pwd.length - 2);
}

// Get DB configurations & statistics
router.get('/config', async (req, res, next) => {
  try {
    const rawUrl = getActiveConnectionString();
    const maskedUrl = maskConnectionString(rawUrl);
    const isFallback = getUseLocalFallback();
    
    // Check connection health
    let isHealthy = false;
    let errorMsg: string | null = null;
    let tables: { name: string; count: number }[] = [];

    try {
      // Run physical health query directly matching the active state
      const healthRes = await pool.query('SELECT 1 as ok');
      if (healthRes && healthRes.rows && healthRes.rows.length > 0) {
        isHealthy = true;
      }
    } catch (err: any) {
      errorMsg = err?.message || 'Connection test failed';
    }

    // Try to count rows for major tables to show database stats beautifully!
    const tableNames = [
      'users', 'posts', 'likes', 'comments', 
      'conversations', 'messages', 'reels', 'advertisements',
      'live_streams', 'live_comments', 'live_reactions'
    ];

    for (const tbl of tableNames) {
      try {
        const countRes = await pool.query(`SELECT COUNT(*) as count FROM ${tbl}`);
        const countValue = countRes?.rows?.[0]?.count;
        tables.push({
          name: tbl,
          count: countValue != null ? Number(countValue) : 0
        });
      } catch (countErr) {
        tables.push({ name: tbl, count: 0 });
      }
    }

    res.json({
      success: true,
      activeDb: isFallback ? 'Local JSON Persistent Database (Fallback)' : 'PostgreSQL Database',
      connectionString: maskedUrl,
      rawUrlAvailable: !!rawUrl,
      isFallback,
      isHealthy,
      errorMsg,
      tables
    });
  } catch (err) {
    next(err);
  }
});

// Update connection URL & trigger migration
router.post('/config', async (req, res, next) => {
  try {
    const { connectionString } = req.body;
    if (!connectionString || typeof connectionString !== 'string' || !connectionString.trim()) {
      return res.status(400).json({ error: 'Connection string is required and must be a valid string' });
    }

    const cleanUrl = connectionString.trim();
    if (!cleanUrl.startsWith('postgresql://') && !cleanUrl.startsWith('postgres://')) {
      return res.status(400).json({ error: 'ConnectionString must start with postgresql:// or postgres://' });
    }

    console.log(`Manual request to switch database. New URL: ${cleanUrl.substring(0, 30)}...`);
    
    // Update the pg connection pool
    const poolUpdated = updatePgPool(cleanUrl);
    if (!poolUpdated) {
      return res.status(500).json({ error: 'Failed to reinitialize connection pool on server' });
    }

    // Attempt to invoke migrations to initialize tables in the newly connected database
    console.log('Running tables migration on the new database connection...');
    await initDb();

    // Verify connection test with PostgreSQL directly
    let testSuccess = false;
    let testError = null;
    try {
      const testRes = await pool.query('SELECT 1 as connected');
      if (testRes && testRes.rows && testRes.rows.length > 0) {
        testSuccess = true;
      }
    } catch (testErr: any) {
      testError = testErr.message;
      // Mark it as fallback since connection failed
      setUseLocalFallback(true);
    }

    res.json({
      success: true,
      message: testSuccess 
        ? 'Database successfully switched and tables initialized!' 
        : 'Database URL stored, but the connection test failed. Reverting to local fallback database temporarily.',
      isFallback: !testSuccess,
      connectionError: testError,
      connectionString: maskConnectionString(cleanUrl)
    });
  } catch (err: any) {
    console.error('Error switching database config:', err);
    res.status(500).json({ error: err.message || 'Failed to switch database configuration' });
  }
});

// Manual migrate trigger
router.post('/initialize', async (req, res, next) => {
  try {
    setUseLocalFallback(false); // Reset fallback first to attempt physical PostgreSQL migration
    await initDb();
    res.json({ success: true, message: 'Database schema synchronization triggered successfully!' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Schema sync failed' });
  }
});

// Get SMTP configuration status
router.get('/smtp', (req, res) => {
  try {
    const cfg = getSmtpConfig();
    if (cfg) {
      res.json({
        success: true,
        configured: true,
        host: cfg.host,
        port: cfg.port,
        user: cfg.user,
        maskedPass: maskSmtpPassword(cfg.pass),
      });
    } else {
      res.json({
        success: true,
        configured: false,
        host: "",
        port: 587,
        user: "",
        maskedPass: "",
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to retrieve SMTP configuration' });
  }
});

// Update SMTP configuration
router.post('/smtp', (req, res) => {
  try {
    const { host, port, user, pass } = req.body;
    if (!host || !user || !pass) {
      return res.status(400).json({ error: 'SMTP Host, User, and Password are all required.' });
    }

    const numericPort = port ? parseInt(port) : 587;
    const configSaved = saveSmtpConfig({
      host: host.trim(),
      port: numericPort,
      user: user.trim(),
      pass: pass.trim(),
    });

    if (configSaved) {
      res.json({
        success: true,
        message: 'SMTP settings successfully stored and activated on the server!',
        host: host.trim(),
        port: numericPort,
        user: user.trim(),
        maskedPass: maskSmtpPassword(pass.trim()),
      });
    } else {
      res.status(500).json({ error: 'Failed to write SMTP settings to system database' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to store SMTP configuration' });
  }
});

// Send verification SMTP test email
router.post('/smtp/test', async (req, res, next) => {
  try {
    const { targetEmail } = req.body;
    if (!targetEmail || typeof targetEmail !== 'string' || !targetEmail.trim()) {
      return res.status(400).json({ error: 'Recipient target email is required' });
    }

    const testRes = await verifySmtpAndSendTest(targetEmail.trim());
    if (testRes.success) {
      res.json({
        success: true,
        message: testRes.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: testRes.message
      });
    }
  } catch (err: any) {
    console.error('SMTP test handler error:', err);
    res.status(500).json({ error: err.message || 'Error occurred during connection validation' });
  }
});

export default router;
