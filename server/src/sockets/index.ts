import { Server as HttpServer } from 'http';
import { Server as IOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { attachHallBoard } from './hallBoard';

let io: IOServer | null = null;

type JwtPayload = { sub: string };

/**
 * Boot Socket.io on the same HTTP server as Express.
 * Handshake: client must pass `auth.token` (the same JWT from /api/auth/login).
 */
export function initSockets(httpServer: HttpServer): IOServer {
  io = new IOServer(httpServer, {
    cors: { origin: env.CLIENT_ORIGIN, credentials: true },
    // Ping every 25s — keeps Android/iOS PWA sockets alive through network idling
    pingInterval: 25_000,
    pingTimeout: 20_000,
  });

  io.use((socket, next) => {
    try {
      const rawToken =
        (socket.handshake.auth?.token as string | undefined) ??
        (socket.handshake.headers.authorization ?? '').toString().replace(/^Bearer /, '');

      if (!rawToken) return next(new Error('UNAUTHORIZED: missing token'));

      let payload: JwtPayload;
      try {
        payload = jwt.verify(rawToken, env.JWT_SECRET) as JwtPayload;
      } catch {
        return next(new Error('UNAUTHORIZED: invalid or expired token'));
      }

      (socket.data as { userId?: string }).userId = payload.sub;
      next();
    } catch (err) {
      logger.error({ err }, 'Socket auth error');
      next(new Error('UNAUTHORIZED'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket.data as { userId?: string }).userId;
    logger.info({ socketId: socket.id, userId }, 'Socket connected');

    // Personal room — swaps and other user-specific notifications
    if (userId) {
      void socket.join(`user:${userId}`);
    }

    attachHallBoard(io!, socket);

    socket.on('disconnect', (reason) => {
      logger.info({ socketId: socket.id, userId, reason }, 'Socket disconnected');
    });
  });

  return io;
}

export function getIo(): IOServer {
  if (!io) throw new Error('Socket.io not initialized yet');
  return io;
}

export function isIoReady(): boolean {
  return io !== null;
}