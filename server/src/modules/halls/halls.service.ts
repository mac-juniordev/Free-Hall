import { q } from '../../db/query';
import { AppError } from '../../middleware/errorHandler';
import { ListHallsQuery, SuggestHallInput } from './halls.schema';
import {
  getActiveBookingForHall,
  getUpcomingBookingSoon,
} from '../bookings/bookings.service';

type HallRow = {
  id: string;
  university_id: string;
  name: string;
  zone: string;
  capacity_tier: 'small' | 'medium' | 'large' | 'amphi';
  approx_capacity_range: string;
  status: 'approved' | 'pending' | 'rejected';
  submitted_by: string | null;
  created_at: string;
};

export type HallLiveStatus = 'FREE' | 'OCCUPIED' | 'BOOKED_SOON';

export type HallDto = {
  id: string;
  universityId: string;
  name: string;
  zone: string;
  capacityTier: 'small' | 'medium' | 'large' | 'amphi';
  approxCapacityRange: string;
  status: 'approved' | 'pending' | 'rejected';
  submittedBy: string | null;
  liveStatus: HallLiveStatus;
  activeBookingId: string | null;
  createdAt: string;
};

function toDto(
  row: HallRow,
  liveStatus: HallLiveStatus,
  activeBookingId: string | null
): HallDto {
  return {
    id: row.id,
    universityId: row.university_id,
    name: row.name,
    zone: row.zone,
    capacityTier: row.capacity_tier,
    approxCapacityRange: row.approx_capacity_range,
    status: row.status,
    submittedBy: row.submitted_by,
    liveStatus,
    activeBookingId,
    createdAt: row.created_at,
  };
}

export async function findHallById(
  hallId: string,
  universityId: string
): Promise<HallRow | null> {
  const { rows } = await q<HallRow>(
    `SELECT id, university_id, name, zone, capacity_tier, approx_capacity_range,
            status, submitted_by, created_at
       FROM halls
      WHERE id = $1 AND university_id = $2`,
    [hallId, universityId]
  );
  return rows[0] ?? null;
}

async function computeLive(hallId: string): Promise<{
  liveStatus: HallLiveStatus;
  activeBookingId: string | null;
}> {
  const active = await getActiveBookingForHall(hallId);
  if (active) {
    return { liveStatus: 'OCCUPIED', activeBookingId: active.id };
  }
  const soon = await getUpcomingBookingSoon(hallId);
  if (soon) {
    return { liveStatus: 'BOOKED_SOON', activeBookingId: null };
  }
  return { liveStatus: 'FREE', activeBookingId: null };
}

export async function listHalls(
  universityId: string,
  filters: ListHallsQuery
): Promise<HallDto[]> {
  const conditions: string[] = [`university_id = $1`, `status = 'approved'`];
  const values: unknown[] = [universityId];
  let idx = 2;

  if (filters.zone) {
    conditions.push(`zone = $${idx++}`);
    values.push(filters.zone);
  }
  if (filters.tier) {
    conditions.push(`capacity_tier = $${idx++}`);
    values.push(filters.tier);
  }

  const { rows } = await q<HallRow>(
    `SELECT id, university_id, name, zone, capacity_tier, approx_capacity_range,
            status, submitted_by, created_at
       FROM halls
      WHERE ${conditions.join(' AND ')}
      ORDER BY zone ASC, name ASC`,
    values
  );

  const dtos = await Promise.all(
    rows.map(async (row) => {
      const { liveStatus, activeBookingId } = await computeLive(row.id);
      return toDto(row, liveStatus, activeBookingId);
    })
  );
  return dtos;
}

export async function getHallDetail(
  hallId: string,
  universityId: string
): Promise<HallDto> {
  const row = await findHallById(hallId, universityId);
  if (!row || row.status !== 'approved') {
    throw new AppError('Hall not found', 404, 'NOT_FOUND');
  }
  const { liveStatus, activeBookingId } = await computeLive(row.id);
  return toDto(row, liveStatus, activeBookingId);
}

export async function suggestHall(
  input: SuggestHallInput,
  universityId: string,
  submittedByUserId: string
): Promise<HallDto> {
  const { rows: existing } = await q<{ id: string }>(
    `SELECT id FROM halls WHERE university_id = $1 AND LOWER(name) = LOWER($2)`,
    [universityId, input.name]
  );
  if (existing.length > 0) {
    throw new AppError(
      'A hall with this name already exists at your university',
      409,
      'HALL_EXISTS'
    );
  }

  const { rows } = await q<HallRow>(
    `INSERT INTO halls
       (university_id, name, zone, capacity_tier, approx_capacity_range, status, submitted_by)
     VALUES ($1, $2, $3, $4, $5, 'pending', $6)
     RETURNING id, university_id, name, zone, capacity_tier, approx_capacity_range,
               status, submitted_by, created_at`,
    [
      universityId,
      input.name,
      input.zone,
      input.capacityTier,
      input.approxCapacityRange,
      submittedByUserId,
    ]
  );

  return toDto(rows[0], 'FREE', null);
}