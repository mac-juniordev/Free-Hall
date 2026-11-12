import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env';
import { q } from '../../db/query';
import { AppError } from '../../middleware/errorHandler';
import { hashPassword, verifyPassword } from '../../utils/password';
import { isValidMatricule, normalizeMatricule } from '../../utils/matricule';
import { LoginInput, RegisterInput } from './auth.schema';

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
  // 1. Resolve university
  const { rows: uniRows } = await q<UniversityRow>(
    `SELECT id, name, short_code, matricule_prefix, is_active
       FROM universities WHERE id = $1`,
    [input.universityId]
  );
  const university = uniRows[0];
  if (!university || !university.is_active) {
    throw new AppError('Selected university is not available', 400, 'UNIVERSITY_INVALID');
  }

  // 2. Validate matricule against university prefix
  const matricule = normalizeMatricule(input.matricule);
  const check = isValidMatricule(matricule, university.matricule_prefix);
  if (!check.valid) {
    throw new AppError(check.reason ?? 'Invalid matricule', 400, 'MATRICULE_INVALID');
  }

  // 3. Check uniqueness (case-insensitive on both matricule and email)
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

  // 4. Create pending user
  const passwordHash = await hashPassword(input.password);
  const { rows: created } = await q<UserRow>(
    `INSERT INTO users
       (university_id, full_name, matricule, email, password_hash, department, level, role, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
     RETURNING id, university_id, full_name, matricule, email, department, level, role, status`,
    [
      university.id,
      input.fullName,
      matricule,                 // stored UPPERCASED via normalizeMatricule
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

  // Case-insensitive matricule match — tolerates legacy mixed-case rows
  const { rows } = await q<UserRow>(
    `SELECT id, university_id, full_name, matricule, email, password_hash,
            department, level, role, status
       FROM users
      WHERE UPPER(matricule) = UPPER($1)`,
    [matricule]
  );
  const user = rows[0];

  // Uniform error message — don't leak whether matricule exists.
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