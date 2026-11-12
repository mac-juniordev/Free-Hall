/**
 * Validates and normalizes a matricule number against a university prefix.
 *
 * Rules:
 *  - Must start with the university's `matricule_prefix` (case-insensitive)
 *  - After the prefix, must contain at least 4 more alphanumeric characters
 *  - Total length between prefix.length + 4 and 30
 *  - No spaces, hyphens, or symbols
 */
export function normalizeMatricule(raw: string): string {
  return raw.trim().replace(/\s+/g, '').toUpperCase();
}

export function isValidMatricule(
  matricule: string,
  matriculePrefix: string
): { valid: boolean; reason?: string } {
  const m = normalizeMatricule(matricule);
  const p = matriculePrefix.trim().toUpperCase();

  if (p.length === 0) {
    return { valid: false, reason: 'University prefix is not configured' };
  }
  if (!m.startsWith(p)) {
    return {
      valid: false,
      reason: `Matricule must start with "${matriculePrefix.toUpperCase()}"`,
    };
  }
  const rest = m.slice(p.length);
  if (rest.length < 4) {
    return {
      valid: false,
      reason: 'Matricule must have at least 4 characters after the university prefix',
    };
  }
  if (!/^[A-Z0-9]+$/.test(m)) {
    return {
      valid: false,
      reason: 'Matricule may only contain letters and digits (no spaces or symbols)',
    };
  }
  if (m.length > 30) {
    return { valid: false, reason: 'Matricule is too long (max 30 chars)' };
  }
  return { valid: true };
}