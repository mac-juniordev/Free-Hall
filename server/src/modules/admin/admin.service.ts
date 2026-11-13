
import { q } from '../../db/query.js';
import { AppError } from '../../middleware/errorHandler.js';

export type PendingUserDto = {
  id: string;
  fullName: string;
  matricule: string;
  email: string;
  department: string;
  level: string;
  role: 'super_admin' | 'cc' | 'assistant';
  createdAt: string;
};

export type PendingHallDto = {
  id: string;
  name: string;
  zone: string;
  capacityTier: 'small' | 'medium' | 'large' | 'amphi';
  approxCapacityRange: string;
  submittedByName: string;
  submittedByMatricule: string;
  createdAt: string;
};

export type AnalyticsDto = {
  totalUsers: number;
  activeCCs: number;
  pendingApprovals: number;
  suspendedUsers: number;
  totalHalls: number;
  approvedHalls: number;
  pendingHalls: number;
  activeBookings: number;
  completedBookings: number;
  totalSwaps: number;
  acceptedSwaps: number;
};

type PendingUserRow = {
  id: string;
  full_name: string;
  matricule: string;
  email: string;
  department: string;
  level: string;
  role: 'super_admin' | 'cc' | 'assistant';
  created_at: string;
};

type PendingHallRow = {
  id: string;
  name: string;
  zone: string;
  capacity_tier: 'small' | 'medium' | 'large' | 'amphi';
  approx_capacity_range: string;
  created_at: string;
  submitted_by_name: string | null;
  submitted_by_matricule: string | null;
};

type AnalyticsRow = {
  total_users: string | number;
  active_ccs: string | number;
  pending_approvals: string | number;
  suspended_users: string | number;
  total_halls: string | number;
  approved_halls: string | number;
  pending_halls: string | number;
  active_bookings: string | number;
  completed_bookings: string | number;
  total_swaps: string | number;
  accepted_swaps: string | number;
};

/**
 * Typed wrapper for the existing database helper.
 * Keeps q compatible with a non-generic implementation.
 */
async function queryRows<T>(
  sql: string,
  params: unknown[] = []
): Promise<{ rows: T[]; rowCount: number }> {
  const result = await q(sql, params);

  return result as unknown as {
    rows: T[];
    rowCount: number;
  };
}

// ── Users queue ──

export async function listPendingUsers(
  universityId: string
): Promise<PendingUserDto[]> {
  const { rows } = await queryRows<PendingUserRow>(
    `SELECT id, full_name, matricule, email,
            department, level, role, created_at
       FROM users
      WHERE university_id = $1
        AND status = 'pending'
      ORDER BY created_at ASC`,
    [universityId]
  );

  return rows.map((r) => ({
    id: r.id,
    fullName: r.full_name,
    matricule: r.matricule,
    email: r.email,
    department: r.department,
    level: r.level,
    role: r.role,
    createdAt: r.created_at,
  }));
}

export async function approveUser(
  userId: string,
  universityId: string
): Promise<void> {
  const { rowCount } = await queryRows<never>(
    `UPDATE users
        SET status = 'approved',
            updated_at = NOW()
      WHERE id = $1
        AND university_id = $2
        AND status = 'pending'
      RETURNING id`,
    [userId, universityId]
  );

  if (rowCount === 0) {
    throw new AppError(
      'Pending user not found',
      404,
      'NOT_FOUND'
    );
  }
}

export async function suspendUser(
  userId: string,
  universityId: string
): Promise<void> {
  const { rows } = await queryRows<{ role: string; status: string }>(
    `SELECT role, status
       FROM users
      WHERE id = $1
        AND university_id = $2`,
    [userId, universityId]
  );

  const user = rows[0];

  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  if (user.role === 'super_admin') {
    throw new AppError(
      'Cannot suspend a super admin',
      400,
      'FORBIDDEN_TARGET'
    );
  }

  if (user.status === 'suspended') {
    throw new AppError(
      'User is already suspended',
      400,
      'ALREADY_SUSPENDED'
    );
  }

  await q(
    `UPDATE users
        SET status = 'suspended',
            updated_at = NOW()
      WHERE id = $1
        AND university_id = $2`,
    [userId, universityId]
  );
}

export async function reinstateUser(
  userId: string,
  universityId: string
): Promise<void> {
  const { rowCount } = await queryRows<never>(
    `UPDATE users
        SET status = 'approved',
            updated_at = NOW()
      WHERE id = $1
        AND university_id = $2
        AND status = 'suspended'
      RETURNING id`,
    [userId, universityId]
  );

  if (rowCount === 0) {
    throw new AppError(
      'Suspended user not found',
      404,
      'NOT_FOUND'
    );
  }
}

// ── Halls queue ──

export async function listPendingHalls(
  universityId: string
): Promise<PendingHallDto[]> {
  const { rows } = await queryRows<PendingHallRow>(
    `SELECT
        h.id,
        h.name,
        h.zone,
        h.capacity_tier,
        h.approx_capacity_range,
        h.created_at,
        u.full_name AS submitted_by_name,
        u.matricule AS submitted_by_matricule
       FROM halls h
       LEFT JOIN users u ON u.id = h.submitted_by
      WHERE h.university_id = $1
        AND h.status = 'pending'
      ORDER BY h.created_at ASC`,
    [universityId]
  );

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    zone: r.zone,
    capacityTier: r.capacity_tier,
    approxCapacityRange: r.approx_capacity_range,
    submittedByName: r.submitted_by_name ?? 'Unknown',
    submittedByMatricule: r.submitted_by_matricule ?? '—',
    createdAt: r.created_at,
  }));
}

export async function approveHall(
  hallId: string,
  universityId: string
): Promise<void> {
  const { rowCount } = await queryRows<never>(
    `UPDATE halls
        SET status = 'approved',
            updated_at = NOW()
      WHERE id = $1
        AND university_id = $2
        AND status = 'pending'
      RETURNING id`,
    [hallId, universityId]
  );

  if (rowCount === 0) {
    throw new AppError(
      'Pending hall not found',
      404,
      'NOT_FOUND'
    );
  }
}

export async function rejectHall(
  hallId: string,
  universityId: string
): Promise<void> {
  const { rowCount } = await queryRows<never>(
    `UPDATE halls
        SET status = 'rejected',
            updated_at = NOW()
      WHERE id = $1
        AND university_id = $2
        AND status = 'pending'
      RETURNING id`,
    [hallId, universityId]
  );

  if (rowCount === 0) {
    throw new AppError(
      'Pending hall not found',
      404,
      'NOT_FOUND'
    );
  }
}

// ── Analytics ──

export async function getAnalytics(
  universityId: string
): Promise<AnalyticsDto> {
  const { rows } = await queryRows<AnalyticsRow>(
    `SELECT
        (SELECT COUNT(*)
           FROM users
          WHERE university_id = $1) AS total_users,

        (SELECT COUNT(*)
           FROM users
          WHERE university_id = $1
            AND role IN ('cc', 'assistant')
            AND status = 'approved') AS active_ccs,

        (SELECT COUNT(*)
           FROM users
          WHERE university_id = $1
            AND status = 'pending') AS pending_approvals,

        (SELECT COUNT(*)
           FROM users
          WHERE university_id = $1
            AND status = 'suspended') AS suspended_users,

        (SELECT COUNT(*)
           FROM halls
          WHERE university_id = $1) AS total_halls,

        (SELECT COUNT(*)
           FROM halls
          WHERE university_id = $1
            AND status = 'approved') AS approved_halls,

        (SELECT COUNT(*)
           FROM halls
          WHERE university_id = $1
            AND status = 'pending') AS pending_halls,

        (SELECT COUNT(*)
           FROM bookings
          WHERE university_id = $1
            AND status IN ('active', 'upcoming')) AS active_bookings,

        (SELECT COUNT(*)
           FROM bookings
          WHERE university_id = $1
            AND status = 'completed') AS completed_bookings,

        (SELECT COUNT(*)
           FROM swap_requests
          WHERE university_id = $1) AS total_swaps,

        (SELECT COUNT(*)
           FROM swap_requests
          WHERE university_id = $1
            AND status = 'accepted') AS accepted_swaps`,
    [universityId]
  );

  const r = rows[0];

  if (!r) {
    throw new AppError(
      'Unable to retrieve analytics',
      500,
      'ANALYTICS_ERROR'
    );
  }

  return {
    totalUsers: Number(r.total_users),
    activeCCs: Number(r.active_ccs),
    pendingApprovals: Number(r.pending_approvals),
    suspendedUsers: Number(r.suspended_users),
    totalHalls: Number(r.total_halls),
    approvedHalls: Number(r.approved_halls),
    pendingHalls: Number(r.pending_halls),
    activeBookings: Number(r.active_bookings),
    completedBookings: Number(r.completed_bookings),
    totalSwaps: Number(r.total_swaps),
    acceptedSwaps: Number(r.accepted_swaps),
  };
}
