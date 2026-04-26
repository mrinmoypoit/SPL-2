const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = Number.parseInt(process.env.EMAIL_PORT, 10) || 587;
const EMAIL_SECURE = process.env.EMAIL_SECURE
    ? process.env.EMAIL_SECURE === 'true'
    : EMAIL_PORT === 465;
const EMAIL_USER = (process.env.EMAIL_USER || '').trim();
const RAW_EMAIL_APP_PASSWORD = (process.env.EMAIL_APP_PASSWORD || '').trim();
const RAW_EMAIL_PASSWORD = (process.env.EMAIL_PASSWORD || '').trim();
const EMAIL_PASSWORD_SOURCE = RAW_EMAIL_APP_PASSWORD
    ? 'EMAIL_APP_PASSWORD'
    : (RAW_EMAIL_PASSWORD ? 'EMAIL_PASSWORD' : '');
const EMAIL_PASSWORD = (RAW_EMAIL_APP_PASSWORD || RAW_EMAIL_PASSWORD).replace(/\s+/g, '');
const HAS_EMAIL_CREDENTIALS = Boolean(EMAIL_USER && EMAIL_PASSWORD);
const IS_GMAIL_TRANSPORT = EMAIL_HOST.toLowerCase().includes('gmail') || EMAIL_USER.toLowerCase().endsWith('@gmail.com');
const LOOKS_LIKE_GOOGLE_APP_PASSWORD = EMAIL_PASSWORD.length === 16;

const transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: EMAIL_PORT,
    secure: EMAIL_SECURE,
    auth: HAS_EMAIL_CREDENTIALS
        ? {
            user: EMAIL_USER,
            pass: EMAIL_PASSWORD
        }
        : undefined
});

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
let emailServiceReady = false;

const getGmailAuthHint = () => 'Use a Google App Password (16 characters) in EMAIL_APP_PASSWORD. Regular Gmail account passwords are rejected by SMTP.';
const isGmailAuthError = (error) => /535|badcredentials|username and password not accepted/i.test(
    `${error?.message || ''} ${error?.response || ''}`
);

// Verify transporter configuration
if (!HAS_EMAIL_CREDENTIALS) {
    console.warn('⚠️  Email credentials are missing. Set EMAIL_USER and EMAIL_APP_PASSWORD in backend/.env');
    emailServiceReady = false;
} else {
    if (IS_GMAIL_TRANSPORT && EMAIL_PASSWORD_SOURCE === 'EMAIL_PASSWORD') {
        console.warn('⚠️  Using EMAIL_PASSWORD fallback. Set EMAIL_APP_PASSWORD in backend/.env to avoid Gmail auth failures.');
    }
    if (IS_GMAIL_TRANSPORT && !LOOKS_LIKE_GOOGLE_APP_PASSWORD) {
        console.warn('⚠️  Gmail app passwords are 16 characters (spaces optional). Your current email password does not match that format.');
    }

    transporter.verify((error) => {
        if (error) {
            console.warn('⚠️  Email service verification failed:', error.message);
            if (isGmailAuthError(error)) {
                console.warn(`   ${getGmailAuthHint()}`);
            }
            console.warn('   (Will attempt to send anyway)');
            emailServiceReady = false;
        } else {
            console.log('✅ Email service verified successfully');
            emailServiceReady = true;
        }
    });
}

// Helper functions moved UP (or use 'function' keyword for hoisting)
const getEmailSubject = (otpType) => {
    switch (otpType) {
        case 'email_verification': return 'Verify Your Email - TULONA';
        case 'password_reset': return 'Reset Your Password - TULONA';
        case 'login': return 'Your Login OTP - TULONA';
        default: return 'Your OTP Code - TULONA';
    }
};

const getEmailTemplate = (otpCode, otpType) => {
    const getMessage = () => {
        switch (otpType) {
            case 'email_verification': return 'Thank you for registering with TULONA! Please use the OTP below to verify your email address.';
            case 'password_reset': return 'We received a request to reset your password. Use the OTP below to proceed.';
            case 'login': return 'Use the OTP below to complete your login to TULONA.';
            default: return 'Here is your OTP code:';
        }
    };

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>OTP Verification</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4; padding: 20px;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <tr>
                            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                                <h1 style="margin: 0; color: #ffffff; font-size: 28px;">🏦 TULONA</h1>
                                <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 14px;">Banking Product Comparison Platform</p>
                            </td>
                        </tr>
                        
                        <tr>
                            <td style="padding: 40px 30px;">
                                <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">OTP Verification</h2>
                                <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.5;">
                                    ${getMessage()}
                                </p>
                                
                                <div style="background-color: #f8f9fa; border: 2px dashed #667eea; border-radius: 8px; padding: 30px; text-align: center; margin: 30px 0;">
                                    <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Your OTP Code</p>
                                    <h1 style="margin: 0; color: #667eea; font-size: 48px; font-weight: bold; letter-spacing: 8px;">${otpCode}</h1>
                                </div>
                                
                                <p style="margin: 20px 0; color: #666666; font-size: 14px; line-height: 1.5;">
                                    ⏰ This OTP will expire in <strong>10 minutes</strong>.
                                </p>
                                
                                <p style="margin: 20px 0 0 0; color: #999999; font-size: 12px; line-height: 1.5;">
                                    ⚠️ If you didn't request this OTP, please ignore this email or contact our support team.
                                </p>
                            </td>
                        </tr>
                        
                        <tr>
                            <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                                <p style="margin: 0 0 10px 0; color: #999999; font-size: 12px;">
                                    © 2026 TULONA. All rights reserved.
                                </p>
                                <p style="margin: 0; color: #999999; font-size: 12px;">
                                    Banking Product Comparison Platform
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;
};

// 2. Fixed nested try-catch and incorrect success flags
const sendOTPEmail = async (email, otpCode, otpType) => {
    try {
        const subject = getEmailSubject(otpType);
        const html = getEmailTemplate(otpCode, otpType);

        const mailOptions = {
            from: `"TULONA" <${EMAIL_USER || 'noreply@tulona.com'}>`,
            to: email,
            subject: subject,
            html: html
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully to', email, '- Message ID:', info.messageId);
        return { success: true, messageId: info.messageId, method: 'real' };

    } catch (error) {
        console.error('❌ Email send failed:', error.message);
        const gmailAuthError = isGmailAuthError(error);
        
        // Fallback to console logging in development
        if (!IS_PRODUCTION) {
            if (gmailAuthError) {
                console.warn(`⚠️  ${getGmailAuthHint()}`);
            }
            console.log(`📧 [DEV MODE] OTP code for ${email}: ${otpCode}`);
            // Success is true here ONLY because we are emulating an email in dev mode
            return { success: true, isDev: true, messageId: 'dev-mode', method: 'console' };
        }
        
        // In production, an error MUST return success: false
        return {
            success: false,
            error: gmailAuthError ? `${error.message}. ${getGmailAuthHint()}` : error.message,
            method: 'error-fallback'
        };
    }
};

const sendWelcomeEmail = async (email, name) => {
    try {
        const mailOptions = {
            from: `"TULONA" <${EMAIL_USER || 'noreply@tulona.com'}>`,
            to: email,
            subject: 'Welcome to TULONA! 🎉',
            html: `
            <!DOCTYPE html>
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #667eea;">Welcome to TULONA, ${name}! 🎉</h2>
                    <p>Thank you for joining TULONA - your trusted Banking Product Comparison Platform.</p>
                    <p>With TULONA, you can:</p>
                    <ul>
                        <li>Compare banking products from multiple institutions</li>
                        <li>Get personalized product recommendations</li>
                        <li>Receive notifications about new offers</li>
                        <li>Make informed financial decisions</li>
                    </ul>
                    <p>Get started by exploring our products and finding the best banking solutions for you!</p>
                    <br>
                    <p>Best regards,<br>The TULONA Team</p>
                </div>
            </body>
            </html>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('✅ Welcome email sent to:', email);
    } catch (error) {
        console.warn('⚠️  Welcome email send failed:', error.message);
        if (!IS_PRODUCTION) {
            console.log(`📧 [DEV MODE] Welcome would be sent to ${email}`);
        }
    }
};

const sendPasswordResetConfirmation = async (email, name) => {
    try {
        const mailOptions = {
            from: `"TULONA" <${EMAIL_USER || 'noreply@tulona.com'}>`,
            to: email,
            subject: 'Password Changed Successfully - TULONA',
            html: `
            <!DOCTYPE html>
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #667eea;">Password Changed Successfully</h2>
                    <p>Hi ${name},</p>
                    <p>Your password has been changed successfully.</p>
                    <p>If you didn't make this change, please contact our support team immediately.</p>
                    <br>
                    <p>Best regards,<br>The TULONA Team</p>
                </div>
            </body>
            </html>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('✅ Password reset confirmation sent to:', email);
    } catch (error) {
        console.warn('⚠️  Confirmation email send failed:', error.message);
        if (!IS_PRODUCTION) {
            console.log(`📧 [DEV MODE] Confirmation would be sent to ${email}`);
        }
    }
};

module.exports = {
    sendOTPEmail,
    sendWelcomeEmail,
    sendPasswordResetConfirmation
};
