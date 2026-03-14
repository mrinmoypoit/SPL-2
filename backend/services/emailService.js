const nodemailer = require('nodemailer');
require('dotenv').config();

// Create email transporter
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Verify transporter configuration (non-blocking)
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
let emailServiceReady = false;

transporter.verify((error, success) => {
    if (error) {
        console.warn('⚠️  Email service verification failed:', error.message);
        console.warn('   (Will attempt to send anyway)');
        emailServiceReady = false;
    } else {
        console.log('✅ Email service verified successfully');
        emailServiceReady = true;
    }
});

// Send OTP email (async, non-blocking)
const sendOTPEmail = async (email, otpCode, otpType) => {
    try {
        const subject = getEmailSubject(otpType);
        const html = getEmailTemplate(otpCode, otpType);

        const mailOptions = {
            from: `"TULONA" <${process.env.EMAIL_USER || 'noreply@tulona.com'}>`,
            to: email,
            subject: subject,
            html: html
        };

        // Try to send real email
        try {
            const info = await transporter.sendMail(mailOptions);
            console.log('✅ Email sent successfully to', email, '- Message ID:', info.messageId);
            return { success: true, messageId: info.messageId, method: 'real' };
        } catch (sendError) {
            console.warn('⚠️  Real email send failed:', sendError.message);
            
            // Fallback to console logging in development
            if (!IS_PRODUCTION) {
                console.log(`📧 [DEV MODE] OTP code for ${email}: ${otpCode}`);
                return { success: true, isDev: true, messageId: 'dev-mode', method: 'console' };
            }
            
            // In production, throw the error
            throw sendError;
        }
    } catch (error) {
        console.error('❌ Email error:', error.message);
        
        // Don't block authentication on email errors
        return { success: true, error: error.message, method: 'error-fallback' };
    }
};

// Get email subject based on OTP type
const getEmailSubject = (otpType) => {
    switch (otpType) {
        case 'email_verification':
            return 'Verify Your Email - TULONA';
        case 'password_reset':
            return 'Reset Your Password - TULONA';
        case 'login':
            return 'Your Login OTP - TULONA';
        default:
            return 'Your OTP Code - TULONA';
    }
};

// Get email HTML template
const getEmailTemplate = (otpCode, otpType) => {
    const getMessage = () => {
        switch (otpType) {
            case 'email_verification':
                return 'Thank you for registering with TULONA! Please use the OTP below to verify your email address.';
            case 'password_reset':
                return 'We received a request to reset your password. Use the OTP below to proceed.';
            case 'login':
                return 'Use the OTP below to complete your login to TULONA.';
            default:
                return 'Here is your OTP code:';
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
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                                <h1 style="margin: 0; color: #ffffff; font-size: 28px;">🏦 TULONA</h1>
                                <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 14px;">Banking Product Comparison Platform</p>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px 30px;">
                                <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">OTP Verification</h2>
                                <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.5;">
                                    ${getMessage()}
                                </p>
                                
                                <!-- OTP Code -->
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
                        
                        <!-- Footer -->
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

// Send welcome email (non-blocking)
const sendWelcomeEmail = async (email, name) => {
    try {
        const mailOptions = {
            from: `"TULONA" <${process.env.EMAIL_USER || 'noreply@tulona.com'}>`,
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

        try {
            await transporter.sendMail(mailOptions);
            console.log('✅ Welcome email sent to:', email);
        } catch (sendError) {
            console.warn('⚠️  Welcome email send failed:', sendError.message);
            if (!IS_PRODUCTION) {
                console.log(`📧 [DEV MODE] Welcome would be sent to ${email}`);
            }
        }
    } catch (error) {
        console.warn('⚠️  Welcome email error:', error.message);
    }
};

// Send password reset confirmation (non-blocking)
const sendPasswordResetConfirmation = async (email, name) => {
    try {
        const mailOptions = {
            from: `"TULONA" <${process.env.EMAIL_USER || 'noreply@tulona.com'}>`,
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

        try {
            await transporter.sendMail(mailOptions);
            console.log('✅ Password reset confirmation sent to:', email);
        } catch (sendError) {
            console.warn('⚠️  Confirmation email send failed:', sendError.message);
            if (!IS_PRODUCTION) {
                console.log(`📧 [DEV MODE] Confirmation would be sent to ${email}`);
            }
        }
    } catch (error) {
        console.warn('⚠️  Confirmation email error:', error.message);
    }
};

module.exports = {
    sendOTPEmail,
    sendWelcomeEmail,
    sendPasswordResetConfirmation
};
