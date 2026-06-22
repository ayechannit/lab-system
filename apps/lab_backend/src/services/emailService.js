const nodemailer = require('nodemailer');

class EmailService {
  /**
   * Send a password reset email containing the 6-digit PIN code.
   * @param {string} toEmail 
   * @param {string} code - The 6-digit reset code
   * @param {string} userName - Optional user name
   */
  static async sendPasswordResetEmail(toEmail, code, userName = 'Valued User') {
    const fromEmail = process.env.EMAIL_FROM || 'no-reply@healthlab.com';
    const hasSmtp = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

    const emailSubject = '🔒 Password Reset Verification Code';
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #2c3e50; text-align: center; border-bottom: 2px solid #3498db; padding-bottom: 10px;">MedLab Password Reset</h2>
        <p>Dear ${userName},</p>
        <p>We received a request to reset the password for your account associated with the email address <strong>${toEmail}</strong>.</p>
        <p>Please use the following 6-digit verification code to complete your password reset. This code is valid for <strong>15 minutes</strong>.</p>
        
        <div style="background-color: #f7f9fa; border: 1px dashed #3498db; border-radius: 4px; padding: 15px; margin: 20px 0; text-align: center;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2980b9;">${code}</span>
        </div>

        <p style="color: #e74c3c; font-size: 14px;"><strong>Security Note:</strong> If you did not request this reset, please ignore this email or contact support if you suspect unauthorized access. Do not share this code with anyone.</p>
        
        <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #7f8c8d; text-align: center;">This is an automated message, please do not reply directly to this email.</p>
      </div>
    `;

    if (hasSmtp) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587', 10),
          secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        await transporter.sendMail({
          from: `"MedLab" <${fromEmail}>`,
          to: toEmail,
          subject: emailSubject,
          html: emailHtml,
        });

        console.log(`Password reset email successfully sent to ${toEmail}`);
        return true;
      } catch (err) {
        console.error(`SMTP Failed to send email to ${toEmail}:`, err.message);
        // Fallback to console print so developers/users are never locked out
        this._logFallback(toEmail, code);
        return false;
      }
    } else {
      // Fallback behavior when SMTP is not configured
      this._logFallback(toEmail, code);
      return true;
    }
  }

  static _logFallback(toEmail, code) {
    console.log('\n======================================================');
    console.log('⚠️  SMTP EMAIL SERVICE NOT FULLY CONFIGURATION OR FAILED');
    console.log(`👉 TARGET EMAIL: ${toEmail}`);
    console.log(`👉 PASSWORD RESET CODE: ${code}`);
    console.log('👉 ACTION REQUIRED: Copy/paste this code on your device to reset password.');
    console.log('======================================================\n');
  }
}

module.exports = EmailService;
