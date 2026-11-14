import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

/**
 * Connect to the backend Socket.io server using the stored JWT.
 * Returns a singleton. Call `disconnectSocket()` on logout.
 */
export function connectSocket(): Socket {
  if (socket?.connected) return socket;

  const token = localStorage.getItem('freehall_token');
  if (!token) {
    throw new Error('Cannot connect socket — no token');
  }

  // Vite proxy handles /socket.io → http://localhost:4000/socket.io
  const baseURL = import.meta.env.VITE_API_URL || window.location.origin;

  socket = io(baseURL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}