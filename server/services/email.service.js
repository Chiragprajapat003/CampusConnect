const nodemailer = require("nodemailer");

/**
 * Email Service — Gmail SMTP OTP Delivery
 *
 * Uses a single cached transporter with `service: "gmail"`.
 * Credentials are read from process.env (loaded by dotenv in server.js).
 *
 * Required .env variables:
 *   GMAIL_USER=your-real-gmail@gmail.com
 *   GMAIL_APP_PASS=abcd efgh ijkl mnop   (16-char Google App Password)
 */

let transporter = null;

/**
 * Creates or returns the cached Nodemailer transporter.
 * Returns null if credentials are missing.
 */
const getTransporter = () => {
  if (transporter) return transporter;

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASS;

  if (!user || !pass) {
    return null;
  }

  // Strip any spaces from App Password (Google displays it as "abcd efgh ijkl mnop")
  const cleanPass = pass.replace(/\s+/g, "");

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: user,
      pass: cleanPass,
    },
  });

  return transporter;
};

/**
 * Verifies SMTP credentials on server startup.
 * Logs success or failure to the backend terminal only.
 * Never exposes credentials.
 */
const verifyEmailTransporter = async () => {
  console.log("\n--------------------------------------------------");
  console.log("📧 [Email Service] Verifying Gmail SMTP...");

  // Safe boolean checks — never print actual values
  console.log(`   GMAIL_USER configured: ${Boolean(process.env.GMAIL_USER)}`);
  console.log(`   GMAIL_APP_PASS configured: ${Boolean(process.env.GMAIL_APP_PASS)}`);

  const transport = getTransporter();

  if (!transport) {
    console.error("❌ SMTP verification failed: GMAIL_USER or GMAIL_APP_PASS is missing in server/.env");
    console.log("--------------------------------------------------\n");
    return false;
  }

  try {
    await transport.verify();
    console.log("✅ Gmail SMTP connection verified successfully!");
    console.log("--------------------------------------------------\n");
    return true;
  } catch (error) {
    // Reset cached transporter so it can be recreated after .env fix
    transporter = null;

    console.error("❌ Gmail SMTP verification FAILED:");
    console.error(`   Error: ${error.message}`);

    if (error.message && error.message.includes("Username and Password not accepted")) {
      console.error("\n   DIAGNOSIS: Google rejected your credentials.");
      console.error("   1. Enable 2-Step Verification: https://myaccount.google.com/security");
      console.error("   2. Generate App Password: https://myaccount.google.com/apppasswords");
      console.error("   3. Paste the 16-character password into GMAIL_APP_PASS in server/.env");
      console.error("   4. Do NOT use your regular Gmail account password.\n");
    }

    console.log("--------------------------------------------------\n");
    return false;
  }
};

/**
 * Sends a 6-digit OTP verification email.
 *
 * @param {string} email - Recipient email address
 * @param {string} otp - 6-digit OTP code
 * @returns {Promise<{success: boolean, error?: string}>}
 */
const sendOtpEmail = async (email, otp) => {
  console.log(`\n📧 [Email] Sending OTP to ${email}...`);

  const transport = getTransporter();

  if (!transport) {
    console.error("❌ [Email] Cannot send — GMAIL_USER or GMAIL_APP_PASS not configured.");
    return {
      success: false,
      error: "Email service is not configured on the server.",
    };
  }

  const mailOptions = {
    from: `"CampusConnect" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: `🔐 Your CampusConnect Verification Code: ${otp}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 16px; background-color: #FFFFFF;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #4F46E5; margin: 0; font-size: 26px; font-weight: 800;">CampusConnect</h1>
          <p style="color: #64748B; font-size: 14px; margin-top: 4px;">Student Account Verification</p>
        </div>
        
        <p style="color: #1E293B; font-size: 15px; line-height: 24px;">Hello Student,</p>
        <p style="color: #475569; font-size: 14px; line-height: 22px;">
          Use the 6-digit verification code below to verify your email and activate your account:
        </p>
        
        <div style="text-align: center; margin: 28px 0;">
          <div style="display: inline-block; background-color: #EEF2FF; border: 2px dashed #4F46E5; border-radius: 14px; padding: 16px 32px;">
            <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #4F46E5; font-family: monospace;">${otp}</span>
          </div>
        </div>
        
        <p style="color: #64748B; font-size: 13px; text-align: center;">
          ⏱️ This code expires in <strong>10 minutes</strong>. Do not share it with anyone.
        </p>
        
        <hr style="border: none; border-top: 1px solid #F1F5F9; margin: 24px 0;" />
        
        <p style="color: #94A3B8; font-size: 11px; text-align: center;">
          If you did not request this code, you can safely ignore this email.
        </p>
      </div>
    `,
  };

  try {
    const info = await transport.sendMail(mailOptions);
    console.log(`✅ [Email] Delivered! MessageId: ${info.messageId}`);
    return { success: true };
  } catch (error) {
    // Reset transporter on auth errors so it can be recreated
    if (error.code === "EAUTH") {
      transporter = null;
    }

    console.error(`❌ [Email] Failed to send to ${email}: ${error.message}`);
    return {
      success: false,
      error: "Failed to send verification email. Please try again later.",
    };
  }
};

module.exports = {
  sendOtpEmail,
  verifyEmailTransporter,
};
