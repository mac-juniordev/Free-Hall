import { Server as HttpServer } from 'http';
import { Server as IOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { attachHallBoard } from './hallBoard';

let io: IOServer | null = null;

export function initSockets(httpServer: HttpServer) {
  io = new IOServer(httpServer, {
    cors: { origin: env.CLIENT_ORIGIN, credentials: true },
  });

  io.use((socket, next) => {
    try {
      const token =
        (socket.handshake.auth?.token as string | undefined) ??
        (socket.handshake.headers.authorization ?? '').toString().replace(/^Bearer /, '');
      if (!token) return next(new Error('Missing token'));
      const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string };
      (socket.data as any).userId = payload.sub;
      next();
    } catch (e) {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    logger.info({ socketId: socket.id }, 'Socket connected');
    attachHallBoard(io!, socket);
  });

  return io;
}

export function getIo(): IOServer {
  if (!io) throw new Error('Socket.io not initialized yet');
  return io;
}