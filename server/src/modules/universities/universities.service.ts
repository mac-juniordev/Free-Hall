import { q } from '../../db/query';
import { AppError } from '../../middleware/errorHandler';
import { CreateUniversityInput, UpdateUniversityInput } from './universities.schema';

export type UniversityRow = {
  id: string;
  name: string;
  short_code: string;
  matricule_prefix: string;
  is_active: boolean;
  created_at: string;
};

export type UniversityDto = {
  id: string;
  name: string;
  shortCode: string;
  matriculePrefix: string;
  isActive: boolean;
  createdAt: string;
};

function toDto(row: UniversityRow): UniversityDto {
  return {
    id: row.id,
    name: row.name,
    shortCode: row.short_code,
    matriculePrefix: row.matricule_prefix,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export async function listUniversities(opts: { includeInactive: boolean }): Promise<UniversityDto[]> {
  const where = opts.includeInactive ? '' : 'WHERE is_active = TRUE';
  const { rows } = await q<UniversityRow>(
    `SELECT id, name, short_code, matricule_prefix, is_active, created_at
       FROM universities
       ${where}
      ORDER BY name ASC`
  );
  return rows.map(toDto);
}

export async function getUniversityById(id: string): Promise<UniversityDto> {
  const { rows } = await q<UniversityRow>(
    `SELECT id, name, short_code, matricule_prefix, is_active, created_at
       FROM universities WHERE id = $1`,
    [id]
  );
  const row = rows[0];
  if (!row) throw new AppError('University not found', 404, 'NOT_FOUND');
  return toDto(row);
}

export async function createUniversity(input: CreateUniversityInput): Promise<UniversityDto> {
  // Uniqueness — name OR short_code
  const { rows: existing } = await q<{ id: string; name: string; short_code: string }>(
    `SELECT id, name, short_code FROM universities
      WHERE LOWER(name) = LOWER($1) OR LOWER(short_code) = LOWER($2)`,
    [input.name, input.shortCode]
  );
  if (existing.length > 0) {
    const conflict = existing[0];
    if (conflict.name.toLowerCase() === input.name.toLowerCase()) {
      throw new AppError('A university with this name already exists', 409, 'NAME_TAKEN');
    }
    throw new AppError('A university with this short code already exists', 409, 'CODE_TAKEN');
  }

  const { rows } = await q<UniversityRow>(
    `INSERT INTO universities (name, short_code, matricule_prefix, is_active)
     VALUES ($1, $2, UPPER($3), $4)
     RETURNING id, name, short_code, matricule_prefix, is_active, created_at`,
    [input.name, input.shortCode, input.matriculePrefix, input.isActive ?? true]
  );
  return toDto(rows[0]);
}

export async function updateUniversity(
  id: string,
  input: UpdateUniversityInput
): Promise<UniversityDto> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (input.name !== undefined) {
    fields.push(`name = $${idx++}`);
    values.push(input.name);
  }
  if (input.shortCode !== undefined) {
    fields.push(`short_code = $${idx++}`);
    values.push(input.shortCode);
  }
  if (input.matriculePrefix !== undefined) {
    fields.push(`matricule_prefix = UPPER($${idx++})`);
    values.push(input.matriculePrefix);
  }
  if (input.isActive !== undefined) {
    fields.push(`is_active = $${idx++}`);
    values.push(input.isActive);
  }

  if (fields.length === 0) {
    throw new AppError('No fields to update', 400, 'NO_CHANGES');
  }

  values.push(id);
  const { rows } = await q<UniversityRow>(
    `UPDATE universities
        SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING id, name, short_code, matricule_prefix, is_active, created_at`,
    values
  );
  const row = rows[0];
  if (!row) throw new AppError('University not found', 404, 'NOT_FOUND');
  return toDto(row);
}

/**
 * Public interface used by AUTH SYSTEM during register
 * (to validate matricule prefix) and by every other system for scoping.
 */
export async function findUniversityById(id: string): Promise<UniversityRow | null> {
  const { rows } = await q<UniversityRow>(
    `SELECT id, name, short_code, matricule_prefix, is_active, created_at
       FROM universities WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
}