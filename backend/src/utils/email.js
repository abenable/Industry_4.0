import nodemailer from 'nodemailer';
import { MailtrapTransport } from 'mailtrap';
import logger from './logger.js';
import { ApiError } from '../controllers/error.js';

const createTransporter = () => {
    // Prefer Mailtrap when a token is provided (safe for staging/dev)
    if (process.env.MAILTRAP_TOKEN) {
        logger.info('Using Mailtrap for email delivery (testing mode)');
        return nodemailer.createTransport(
            MailtrapTransport({
                token: process.env.MAILTRAP_TOKEN
            })
        );
    }

    // Generic SMTP fallback (for production, set SMTP_* variables)
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        logger.info('Using generic SMTP for email delivery');
        const tlsOptions = {};
        if (process.env.ALLOW_INSECURE_SMTP === 'true' && process.env.NODE_ENV !== 'production') {
            tlsOptions.rejectUnauthorized = false;
            logger.warn('ALLOW_INSECURE_SMTP enabled: TLS certificate validation for SMTP will be skipped (non-production only)');
        }

        return nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            },
            ...(Object.keys(tlsOptions).length > 0 && { tls: tlsOptions })
        });
    }

    throw new Error('No email service configured. Please set MAILTRAP_TOKEN for staging or SMTP_* for production.');
};

export const sendMail = async (options) => {
    try {
        // Create appropriate transporter based on available credentials
        const transport = createTransporter();

        // Sender configuration
        const sender = {
            address: process.env.EMAIL_FROM_ADDRESS || process.env.GMAIL_USER || process.env.SMTP_USER,
            name: process.env.EMAIL_FROM_NAME || 'VeTella Platform',
        };

        // Email options
        const mailOptions = {
            from: sender,
            to: options.email,
            subject: options.subject,
            text: options.message || options.text,
            ...(options.html && { html: options.html }),
            ...(options.category && { category: options.category }),
        };

        // Log email content for debugging
        logger.info('=== EMAIL DEBUG INFO ===');
        logger.info(`To: ${mailOptions.to}`);
        logger.info(`Subject: ${mailOptions.subject}`);
        logger.info(`Message: ${mailOptions.text}`);
        logger.info('========================');

        // Send email
        const info = await transport.sendMail(mailOptions);
        logger.info(`Email sent successfully to ${mailOptions.to}. Message ID: ${info.messageId}`);

        return {
            success: true,
            messageId: info.messageId,
            response: info.response
        };
    } catch (error) {
        logger.error(`Email send failed: ${error.message}`);
        throw new ApiError(500, `Email send failed: ${error.message}`);
    }
};
