import { z } from 'zod';

const uuidLoose = z
  .string()
  .regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    'Invalid UUID format'
  );

const courseCode = z
  .string()
  .trim()
  .min(2, 'Course code is too short')
  .max(30, 'Course code is too long');

const studentCount = z
  .number()
  .int('Student count must be a whole number')
  .min(1, 'Student count must be at least 1')
  .max(5000, 'Student count seems too large');

/**
 * Instant claim: starts now, runs for durationMin from now.
 */
export const claimBookingSchema = z.object({
  hallId: uuidLoose,
  courseCode,
  studentCount,
  durationMin: z
    .number()
    .int()
    .min(30, 'Duration must be at least 30 minutes')
    .max(300, 'Duration cannot exceed 5 hours'),
});

/**
 * Scheduled booking: start_time must be later today (or up to 7 days ahead).
 * end_time = start_time + durationMin.
 */
export const scheduleBookingSchema = z
  .object({
    hallId: uuidLoose,
    courseCode,
    studentCount,
    startTime: z.string().datetime({ message: 'startTime must be ISO 8601' }),
    durationMin: z
      .number()
      .int()
      .min(30, 'Duration must be at least 30 minutes')
      .max(300, 'Duration cannot exceed 5 hours'),
  })
  .refine(
    (data) => {
      const t = new Date(data.startTime).getTime();
      const now = Date.now();
      // Cannot schedule in the past
      if (t <= now) return false;
      // Cannot schedule more than 7 days ahead
      if (t > now + 7 * 24 * 60 * 60 * 1000) return false;
      return true;
    },
    { path: ['startTime'], message: 'startTime must be in the future (within 7 days)' }
  );

export const bookingIdParamSchema = z.object({
  id: uuidLoose,
});

export type ClaimBookingInput = z.infer<typeof claimBookingSchema>;
export type ScheduleBookingInput = z.infer<typeof scheduleBookingSchema>;