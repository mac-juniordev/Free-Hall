import { Server as IOServer, Socket } from 'socket.io';

/**
 * Hall Board socket wiring. Full implementation lands in Phase 10 when
 * bookings exist. For now we provide the room subscription primitive that
 * the client already expects.
 */
export function attachHallBoard(io: IOServer, socket: Socket) {
  socket.on('halls:join', (universityId: string) => {
    socket.join(`halls:${universityId}`);
  });

  socket.on('halls:leave', (universityId: string) => {
    socket.leave(`halls:${universityId}`);
  });

  socket.on('disconnect', () => {
    // rooms auto-cleaned by socket.io
  });
}

/** Emit a hall-board update to everyone watching a given university. */
export function emitHallUpdate(io: IOServer, universityId: string, payload: unknown) {
  io.to(`halls:${universityId}`).emit('halls:update', payload);
}