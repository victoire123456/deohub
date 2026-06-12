import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
}

const SMTP_CONFIG_FILE = path.join(process.cwd(), 'db', 'smtp_config.json');

// Lazy load transporter to prevent crash on startup if misconfigured
let transporterInstance: nodemailer.Transporter | null = null;

export function getSmtpConfig(): SmtpConfig | null {
  try {
    if (fs.existsSync(SMTP_CONFIG_FILE)) {
      const cfg = JSON.parse(fs.readFileSync(SMTP_CONFIG_FILE, 'utf8'));
      if (cfg && cfg.host && cfg.user && cfg.pass) {
        return {
          host: cfg.host,
          port: cfg.port ? parseInt(cfg.port) : 587,
          user: cfg.user,
          pass: cfg.pass,
        };
      }
    }
  } catch (e) {
    console.error("Failed to read smtp_config.json:", e);
  }

  // Fallback to environment variables
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return { host, port, user, pass };
  }

  return null;
}

export function saveSmtpConfig(config: SmtpConfig): boolean {
  try {
    const parentDir = path.dirname(SMTP_CONFIG_FILE);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(SMTP_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
    // Clear transporter to force re-creation with new config
    transporterInstance = null;
    return true;
  } catch (e) {
    console.error("Failed to write smtp_config.json:", e);
    return false;
  }
}

function getTransporter(): nodemailer.Transporter {
  if (transporterInstance) return transporterInstance;

  const cfg = getSmtpConfig();

  if (cfg) {
    console.log(`[EmailService] Initializing real SMTP connection for ${cfg.user}@${cfg.host}`);
    transporterInstance = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.port === 465,
      auth: {
        user: cfg.user,
        pass: cfg.pass,
      },
    });
  } else {
    console.log('[EmailService] SMTP credentials missing. Initializing fallback logging transporter.');
    // Simple mock transporter that logs to terminal and writes to screen
    transporterInstance = {
      sendMail: async (options: any) => {
        console.log('\n==================================================');
        console.log('📬  [SIMULATED EMAIL SENT]');
        console.log(`To:      ${options.to}`);
        console.log(`Subject: ${options.subject}`);
        console.log('--------------------------------------------------');
        console.log(options.text);
        console.log('==================================================\n');
        return { messageId: 'simulated-id-' + Date.now() };
      }
    } as unknown as nodemailer.Transporter;
  }

  return transporterInstance;
}

/**
 * Sends a registration verification code email to the specified user
 */
export async function sendVerificationEmail(email: string, username: string, code: string): Promise<boolean> {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your DeoHub Account</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #f4f4f5;
          margin: 0;
          padding: 0;
          color: #18181b;
        }
        .container {
          max-width: 500px;
          margin: 40px auto;
          background-color: #ffffff;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          border: 1px solid #e4e4e7;
        }
        .header {
          background-color: #7c3aed;
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          color: #ffffff;
          margin: 0;
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }
        .content {
          padding: 40px 30px;
          text-align: center;
        }
        .greeting {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 20px;
          color: #27272a;
        }
        .instruction {
          font-size: 14px;
          color: #71717a;
          line-height: 1.6;
          margin-bottom: 30px;
        }
        .code-container {
          background-color: #f4f4f5;
          border-radius: 12px;
          padding: 20px;
          margin: 20px 0 30px;
          border: 1px dashed #7c3aed;
        }
        .verification-code {
          font-size: 32px;
          font-weight: 900;
          letter-spacing: 8px;
          color: #7c3aed;
          margin: 0;
        }
        .footer {
          background-color: #fafafa;
          padding: 20px;
          text-align: center;
          font-size: 11px;
          color: #a1a1aa;
          border-top: 1px solid #f4f4f5;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .help-text {
          font-size: 12px;
          color: #a1a1aa;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>DeoHub</h1>
        </div>
        <div class="content">
          <div class="greeting">Hi ${username},</div>
          <div class="instruction">
            Thank you for creating an account on DeoHub! To verify your email address and activate your account, please enter the following 6-digit verification code:
          </div>
          <div class="code-container">
            <h2 class="verification-code">${code}</h2>
          </div>
          <div class="instruction">
            This verification code is active for the next 15 minutes. If you did not request this code, you can safely ignore this email.
          </div>
          <div class="help-text">
            Need help? Reach out to support@deohub.io
          </div>
        </div>
        <div class="footer">
          DeoHub &copy; 2026 &bull; Share thoughts with the world
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
    Hi ${username},
    
    Thank you for creating an account on DeoHub!
    
    To verify your email address, please use the following 6-digit verification code:
    
    ${code}
    
    This verification code is active for the next 15 minutes.
    
    DeoHub - Share your thoughts with the world
  `;

  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: `"DeoHub" <${process.env.SMTP_USER || 'no-reply@deohub.io'}>`,
      to: email,
      subject: `Verify Your Account - Code: ${code} 🚀`,
      html: htmlContent,
      text: textContent,
    });
    return true;
  } catch (err) {
    console.error(`[EmailService] Failed to send email to ${email}:`, err);
    return false;
  }
}

export async function verifySmtpAndSendTest(toEmail: string): Promise<{ success: boolean; message: string }> {
  const cfg = getSmtpConfig();
  if (!cfg) {
    return { success: false, message: 'SMTP credentials are not configured.' };
  }

  try {
    const testTransporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.port === 465,
      auth: {
        user: cfg.user,
        pass: cfg.pass,
      },
    });

    // Run connection verify
    await testTransporter.verify();

    // Send actual test email to check delivery flow
    await testTransporter.sendMail({
      from: `"DeoHub" <${cfg.user}>`,
      to: toEmail,
      subject: 'DeoHub SMTP Connection Test Successful! 🎉',
      text: `Hello! This is a test message from DeoHub. Your SMTP credentials have been registered successfully!\n\nHost: ${cfg.host}\nPort: ${cfg.port}\nUser: ${cfg.user}\n\nEnjoy SMTP email delivery!`,
      html: `
        <div style="font-family: sans-serif; padding: 24px; max-width: 600px; border: 1px solid #e4e4e7; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #7c3aed; margin-top: 0;">DeoHub SMTP Test Email 🎉</h2>
          <p>Congratulations! Your SMTP connection to <strong>\${cfg.host}</strong> has been configured, verified, and authenticated successfully.</p>
          <div style="background: #f4f4f5; padding: 16px; border-radius: 8px; font-family: monospace; font-size: 13px; margin: 20px 0;">
            <strong>Host:</strong> \${cfg.host}<br>
            <strong>Port:</strong> \${cfg.port}<br>
            <strong>User:</strong> \${cfg.user}
          </div>
          <p>This confirms that user authentication codes, transaction notifications, and mail delivery signals are fully operational in your application.</p>
          <hr style="border: 0; border-top: 1px solid #e4e4e7; margin: 24px 0;" />
          <p style="color: #71717a; font-size: 12px; text-transform: uppercase;">Sent securely via Brevo/SMTP dynamic server stack.</p>
        </div>
      `,
    });

    return { success: true, message: 'SMTP credentials authenticated and test email sent successfully!' };
  } catch (err: any) {
    console.error('[EmailService] SMTP validation test failed:', err);
    return { success: false, message: err?.message || 'SMTP authentication or socket connection failed.' };
  }
}
