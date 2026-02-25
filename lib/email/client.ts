import { Resend } from 'resend';

let resendInstance: Resend | null = null;

export function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn('[HonuVibe Email] RESEND_API_KEY not set — emails will be skipped');
    return null;
  }

  if (!resendInstance) {
    resendInstance = new Resend(apiKey);
  }

  return resendInstance;
}

export function getFromAddress(): string {
  return process.env.RESEND_FROM_EMAIL ?? 'HonuVibe.AI <hello@honuvibe.ai>';
}

export function getAdminEmail(): string {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.warn('[HonuVibe Email] ADMIN_EMAIL not set — admin notifications will be skipped');
  }
  return adminEmail ?? '';
}
