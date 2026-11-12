import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';

/**
 * Gmail SMTP mailer. Used in Phase 15 for password-reset OTPs.
 * If env vars are blank, `sendMail` silently logs (dev mode) — no crash.
 */
let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;
  if (!env.GMAIL_USER || !env.GMAIL_APP_PASSWORD) {
    logger.warn({}, 'Gmail credentials not configured — mails will be logged only');
    return null;
  }
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: env.GMAIL_USER, pass: env.GMAIL_APP_PASSWORD },
  });
  return transporter;
}

type SendArgs = { to: string; subject: string; text: string; html?: string };

export async function sendMail(args: SendArgs): Promise<void> {
  const t = getTransporter();
  if (!t) {
    logger.info({ to: args.to, subject: args.subject, text: args.text }, '[DEV] Mail not sent');
    return;
  }
  await t.sendMail({
    from: `FreeHall <${env.GMAIL_USER}>`,
    to: args.to,
    subject: args.subject,
    text: args.text,
    html: args.html,
  });
}