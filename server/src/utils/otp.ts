import crypto from 'crypto';

/** Generate a cryptographically-strong 6-digit OTP as a zero-padded string. */
export function generateOtp(): string {
  const n = crypto.randomInt(0, 1_000_000);
  return n.toString().padStart(6, '0');
}

/** True if `expiresAt` is in the future. */
export function isOtpValid(expiresAt: Date | string): boolean {
  const t = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
  return t.getTime() > Date.now();
}