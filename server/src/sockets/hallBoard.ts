import { Server as IOServer, Socket } from 'socket.io';
import { logger } from '../utils/logger';

/**
 * Per-connection subscriptions. Clients call `halls:join` with their
 * universityId after connecting; they receive `hall:update` events for
 * every hall state change on their campus.
 */
export function attachHallBoard(io: IOServer, socket: Socket) {
  socket.on('halls:join', (universityId: string) => {
    if (typeof universityId !== 'string' || universityId.length === 0) {
      socket.emit('error', { code: 'BAD_UNIVERSITY', message: 'universityId required' });
      return;
    }
    void socket.join(`halls:${universityId}`);
    logger.debug({ socketId: socket.id, universityId }, 'Socket joined hall board room');
  });

  socket.on('halls:leave', (universityId: string) => {
    if (typeof universityId !== 'string') return;
    void socket.leave(`halls:${universityId}`);
    logger.debug({ socketId: socket.id, universityId }, 'Socket left hall board room');
  });
}

// ── Emitters used by other systems ──

export type HallUpdatePayload = {
  hallId: string;
  liveStatus: 'FREE' | 'OCCUPIED' | 'BOOKED_SOON';
  activeBookingId: string | null;
  /** Optionally include the current booking row for richer client rendering. */
  booking?: {
    id: string;
    courseCode: string;
    startTime: string;
    endTime: string;
    userId: string;
    studentCount: number;
  } | null;
};

export function emitHallUpdate(
  io: IOServer,
  universityId: string,
  payload: HallUpdatePayload
): void {
  io.to(`halls:${universityId}`).emit('hall:update', payload);
}

export function emitHallBookedSoon(
  io: IOServer,
  universityId: string,
  payload: { hallId: string; bookingId: string; startsAt: string }
): void {
  io.to(`halls:${universityId}`).emit('hall:booked_soon', payload);
}

// ── Swap emitters (used in Phase 9g) ──

export function emitSwapNew(
  io: IOServer,
  targetUserId: string,
  payload: unknown
): void {
  io.to(`user:${targetUserId}`).emit('swap:new', payload);
}

export function emitSwapAccepted(
  io: IOServer,
  requesterUserId: string,
  payload: unknown
): void {
  io.to(`user:${requesterUserId}`).emit('swap:accepted', payload);
}

export function emitSwapRejected(
  io: IOServer,
  requesterUserId: string,
  payload: unknown
): void {
  io.to(`user:${requesterUserId}`).emit('swap:rejected', payload);
}