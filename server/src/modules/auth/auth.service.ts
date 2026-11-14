import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env';
import { q } from '../../db/query';
import { AppError } from '../../middleware/errorHandler';
import { hashPassword, verifyPassword } from '../../utils/password';
import { isValidMatricule, normalizeMatricule } from '../../utils/matricule';
import { generateOtp } from '../../utils/otp';
import { sendMail } from '../../services/mailer';
import { logger } from '../../utils/logger';
import {
  LoginInput,
  RegisterInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from './auth.schema';

type UniversityRow = {
  id: string;
  name: string;
  short_code: string;
  matricule_prefix: string;
  is_active: boolean;
};

type UserRow = {
  id: string;
  university_id: string;
  full_name: string;
  matricule: string;
  email: string;
  password_hash: string;
  department: string;
  level: string;
  role: 'super_admin' | 'cc' | 'assistant';
  status: 'pending' | 'approved' | 'suspended';
};

function signToken(userId: string): string {
  const opts: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
    subject: userId,
  };
  return jwt.sign({}, env.JWT_SECRET, opts);
}

export async function listUniversities() {
  const { rows } = await q<UniversityRow>(
    `SELECT id, name, short_code, matricule_prefix, is_active
       FROM universities
      WHERE is_active = TRUE
      ORDER BY name ASC`
  );
  return rows.map((u) => ({
    id: u.id,
    name: u.name,
    shortCode: u.short_code,
    matriculePrefix: u.matricule_prefix,
  }));
}

export async function register(input: RegisterInput) {
  const { rows: uniRows } = await q<UniversityRow>(
    `SELECT id, name, short_code, matricule_prefix, is_active
       FROM universities WHERE id = $1`,
    [input.universityId]
  );
  const university = uniRows[0];
  if (!university || !university.is_active) {
    throw new AppError('Selected university is not available', 400, 'UNIVERSITY_INVALID');
  }

  const matricule = normalizeMatricule(input.matricule);
  const check = isValidMatricule(matricule, university.matricule_prefix);
  if (!check.valid) {
    throw new AppError(check.reason ?? 'Invalid matricule', 400, 'MATRICULE_INVALID');
  }

  const { rows: existing } = await q<{ id: string; matricule: string; email: string }>(
    `SELECT id, matricule, email
       FROM users
      WHERE UPPER(matricule) = UPPER($1) OR LOWER(email) = LOWER($2)`,
    [matricule, input.email]
  );
  if (existing.length > 0) {
    const conflict = existing[0];
    if (conflict.matricule.toUpperCase() === matricule.toUpperCase()) {
      throw new AppError('This matricule is already registered', 409, 'MATRICULE_TAKEN');
    }
    throw new AppError('This email is already registered', 409, 'EMAIL_TAKEN');
  }

  const passwordHash = await hashPassword(input.password);
  const { rows: created } = await q<UserRow>(
    `INSERT INTO users
       (university_id, full_name, matricule, email, password_hash, department, level, role, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
     RETURNING id, university_id, full_name, matricule, email, department, level, role, status`,
    [
      university.id,
      input.fullName,
      matricule,
      input.email.toLowerCase(),
      passwordHash,
      input.department,
      input.level,
      input.role,
    ]
  );
  const user = created[0];

  return {
    message: 'Registration received. A Super Admin will verify your CC status shortly.',
    user: {
      id: user.id,
      fullName: user.full_name,
      matricule: user.matricule,
      email: user.email,
      universityId: user.university_id,
      department: user.department,
      level: user.level,
      role: user.role,
      status: user.status,
    },
  };
}

export async function login(input: LoginInput) {
  const matricule = normalizeMatricule(input.matricule);

  const { rows } = await q<UserRow>(
    `SELECT id, university_id, full_name, matricule, email, password_hash,
            department, level, role, status
       FROM users
      WHERE UPPER(matricule) = UPPER($1)`,
    [matricule]
  );
  const user = rows[0];

  if (!user) {
    throw new AppError('Incorrect matricule or password', 401, 'INVALID_CREDENTIALS');
  }

  const ok = await verifyPassword(input.password, user.password_hash);
  if (!ok) {
    throw new AppError('Incorrect matricule or password', 401, 'INVALID_CREDENTIALS');
  }

  if (user.status === 'suspended') {
    throw new AppError('Account suspended. Contact your Super Admin.', 403, 'SUSPENDED');
  }
  if (user.status === 'pending') {
    throw new AppError(
      'Your account is pending verification. Please wait for Super Admin approval.',
      403,
      'PENDING'
    );
  }

  const token = signToken(user.id);

  return {
    token,
    user: {
      id: user.id,
      universityId: user.university_id,
      fullName: user.full_name,
      matricule: user.matricule,
      email: user.email,
      department: user.department,
      level: user.level,
      role: user.role,
      status: user.status,
    },
  };
}

/**
 * Forgot password — generates a 6-digit OTP, stores it (15-min expiry), invalidates
 * any older unused OTPs for the same user, and emails it.
 *
 * ALWAYS responds with the same generic success message so an attacker can't
 * enumerate registered emails.
 */
export async function forgotPassword(input: ForgotPasswordInput) {
  const genericResponse = {
    message:
      'If an account exists for this email, a 6-digit reset code has been sent. It expires in 15 minutes.',
  };

  const email = input.email.toLowerCase().trim();

  const { rows } = await q<{ id: string; email: string; full_name: string; status: string }>(
    `SELECT id, email, full_name, status FROM users WHERE LOWER(email) = LOWER($1)`,
    [email]
  );
  const user = rows[0];

  if (!user) {
    // Do not reveal that the email doesn't exist.
    return genericResponse;
  }

  if (user.status === 'suspended') {
    // Still respond generically so admin decisions can't be probed.
    logger.info({ email, reason: 'suspended' }, 'forgot-password skipped (suspended)');
    return genericResponse;
  }

  // Invalidate any outstanding unused OTPs for this user
  await q(
    `UPDATE password_resets
        SET used = TRUE
      WHERE user_id = $1 AND used = FALSE`,
    [user.id]
  );

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 15 * 60_000);

  await q(
    `INSERT INTO password_resets (user_id, otp_code, expires_at, used)
     VALUES ($1, $2, $3, FALSE)`,
    [user.id, otp, expiresAt.toISOString()]
  );

  // Fire-and-forget — if mailing fails, we still return the generic response
  // (so timing / errors don't leak). Dev mode just logs the OTP.

    void sendMail({
    to: user.email,
    subject: 'FreeHall password reset code',
    text: [
      `Hi ${user.full_name},`,
      ``,
      `Your FreeHall password reset code is: ${otp}`,
      ``,
      `This code expires in 15 minutes. If you did not request a reset, you can ignore this email.`,
      ``,
      `— FreeHall`,
    ].join('\n'),
  }).catch((err: unknown) => {
    logger.error({ err, email }, 'sendMail failed for password reset');
  });
  return genericResponse;
}

/**
 * Reset password — verifies OTP (unused + not expired), then updates password.
 * Uniform error for wrong/expired/used OTP.
 */
export async function resetPassword(input: ResetPasswordInput) {
  const email = input.email.toLowerCase().trim();

  const { rows: userRows } = await q<{ id: string; status: string }>(
    `SELECT id, status FROM users WHERE LOWER(email) = LOWER($1)`,
    [email]
  );
  const user = userRows[0];
  if (!user) {
    throw new AppError('Invalid or expired reset code', 400, 'INVALID_OTP');
  }
  if (user.status === 'suspended') {
    throw new AppError('Account suspended. Contact your Super Admin.', 403, 'SUSPENDED');
  }

  const { rows: otpRows } = await q<{
    id: string;
    used: boolean;
    expires_at: string;
  }>(
    `SELECT id, used, expires_at
       FROM password_resets
      WHERE user_id = $1
        AND otp_code = $2
      ORDER BY created_at DESC
      LIMIT 1`,
    [user.id, input.otp]
  );
  const reset = otpRows[0];

  if (!reset || reset.used || new Date(reset.expires_at).getTime() <= Date.now()) {
    throw new AppError('Invalid or expired reset code', 400, 'INVALID_OTP');
  }

  const newHash = await hashPassword(input.newPassword);

  // Update password + mark OTP used in a single transaction
  await q('BEGIN');
  try {
    await q(`UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`, [
      newHash,
      user.id,
    ]);
    await q(`UPDATE password_resets SET used = TRUE WHERE id = $1`, [reset.id]);
    // Invalidate all other unused OTPs for this user
    await q(
      `UPDATE password_resets SET used = TRUE WHERE user_id = $1 AND used = FALSE`,
      [user.id]
    );
    await q('COMMIT');
  } catch (err) {
    await q('ROLLBACK');
    throw err;
  }

  return { message: 'Password has been reset. You can now log in with your new password.' };
}