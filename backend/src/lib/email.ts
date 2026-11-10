import nodemailer from 'nodemailer';
import config from '../config';

// In development without SMTP: log emails to console
function createTransport() {
  if (!config.email.enabled || !config.email.host) {
    // Ethereal or console logging in dev
    if (config.isDevelopment) {
      return null; // Will use console logger
    }
    throw new Error('Email is not configured. Set SMTP_HOST and EMAIL_ENABLED=true');
  }

  return nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.port === 465,
    auth: {
      user: config.email.user,
      pass: config.email.password,
    },
  });
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(opts: EmailOptions): Promise<void> {
  const transport = createTransport();

  if (!transport) {
    // Development mode — log to console
    console.log('\n' + '='.repeat(60));
    console.log('[EMAIL — DEV MODE — NOT ACTUALLY SENT]');
    console.log(`To:      ${opts.to}`);
    console.log(`Subject: ${opts.subject}`);
    console.log('Body:');
    console.log(opts.text ?? opts.html.replace(/<[^>]+>/g, ''));
    console.log('='.repeat(60) + '\n');
    return;
  }

  await transport.sendMail({
    from: config.email.from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });
}

export async function sendEmailVerification(
  to: string,
  name: string,
  token: string
): Promise<void> {
  const verifyUrl = `${config.server.frontendUrl}/auth/verify-email?token=${token}`;

  await sendEmail({
    to,
    subject: 'Verify your CollabSphere email address',
    text: `Hi ${name},\n\nPlease verify your email address by clicking the link below:\n${verifyUrl}\n\nThis link expires in 24 hours.\n\nIf you didn't create an account, ignore this email.`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #f9fafb; border-radius: 12px;">
        <div style="background: #5B4CF5; padding: 24px; border-radius: 8px; text-align: center; margin-bottom: 24px;">
          <h1 style="color: white; margin: 0; font-size: 24px;">CollabSphere</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0;">Student Collaboration Platform</p>
        </div>
        <h2 style="color: #1a1a2e; margin-bottom: 8px;">Hi ${name},</h2>
        <p style="color: #4b5563; line-height: 1.6;">
          Thanks for joining CollabSphere! Please verify your email address to complete your registration and start collaborating.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${verifyUrl}" 
             style="background: #5B4CF5; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
            Verify Email Address
          </a>
        </div>
        <p style="color: #9ca3af; font-size: 14px;">This link expires in 24 hours. If you didn't create a CollabSphere account, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">CollabSphere — Where students build together</p>
      </div>
    `,
  });
}

export async function sendPasswordReset(
  to: string,
  name: string,
  token: string
): Promise<void> {
  const resetUrl = `${config.server.frontendUrl}/auth/reset-password?token=${token}`;

  await sendEmail({
    to,
    subject: 'Reset your CollabSphere password',
    text: `Hi ${name},\n\nClick the link below to reset your password:\n${resetUrl}\n\nThis link expires in 1 hour. If you didn't request a reset, ignore this email.`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #f9fafb; border-radius: 12px;">
        <div style="background: #5B4CF5; padding: 24px; border-radius: 8px; text-align: center; margin-bottom: 24px;">
          <h1 style="color: white; margin: 0; font-size: 24px;">CollabSphere</h1>
        </div>
        <h2 style="color: #1a1a2e;">Password Reset Request</h2>
        <p style="color: #4b5563; line-height: 1.6;">Hi ${name}, we received a request to reset your password.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}"
             style="background: #5B4CF5; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
            Reset Password
          </a>
        </div>
        <p style="color: #9ca3af; font-size: 14px;">This link expires in 1 hour.</p>
      </div>
    `,
  });
}
