
import { useEffect, useRef } from 'react';
import { connectSocket, disconnectSocket } from '../lib/socket';
import type { Socket } from 'socket.io-client';

export type HallUpdatePayload = {
  hallId: string;
  liveStatus: 'FREE' | 'OCCUPIED' | 'BOOKED_SOON';
  activeBookingId: string | null;
  booking?: {
    id: string;
    courseCode: string;
    startTime: string;
    endTime: string;
    userId: string;
    studentCount: number;
  } | null;
};

export type BookedSoonPayload = {
  hallId: string;
  bookingId: string;
  startsAt: string;
};

export type SwapNewPayload = {
  swapId: string;
  requesterBooking: {
    id: string;
    hallName: string;
    courseCode: string;
    studentCount: number;
    userFullName: string;
  };
  targetBooking: {
    id: string;
    hallName: string;
    courseCode: string;
    studentCount: number;
    userFullName: string;
  };
};

export type SwapAcceptedPayload = {
  swapId: string;
};

export type SwapRejectedPayload = {
  swapId: string;
};

type Handlers = {
  onHallUpdate?: (payload: HallUpdatePayload) => void;
  onBookedSoon?: (payload: BookedSoonPayload) => void;
  onSwapNew?: (payload: SwapNewPayload) => void;
  onSwapAccepted?: (payload: SwapAcceptedPayload) => void;
  onSwapRejected?: (payload: SwapRejectedPayload) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
};

export function useSocket(handlers: Handlers = {}) {
  const handlersRef = useRef<Handlers>(handlers);

  // Update handlers after rendering without reconnecting the socket.
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  // Connect socket once and register event listeners.
  useEffect(() => {
    let socket: Socket;

    try {
      socket = connectSocket();
    } catch {
      return;
    }

    const handleConnect = () => {
      handlersRef.current.onConnect?.();
    };

    const handleDisconnect = () => {
      handlersRef.current.onDisconnect?.();
    };

    const handleHallUpdate = (p: HallUpdatePayload) => {
      handlersRef.current.onHallUpdate?.(p);
    };

    const handleBookedSoon = (p: BookedSoonPayload) => {
      handlersRef.current.onBookedSoon?.(p);
    };

    const handleSwapNew = (p: SwapNewPayload) => {
      handlersRef.current.onSwapNew?.(p);
    };

    const handleSwapAccepted = (p: SwapAcceptedPayload) => {
      handlersRef.current.onSwapAccepted?.(p);
    };

    const handleSwapRejected = (p: SwapRejectedPayload) => {
      handlersRef.current.onSwapRejected?.(p);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('hall:update', handleHallUpdate);
    socket.on('hall:booked_soon', handleBookedSoon);
    socket.on('swap:new', handleSwapNew);
    socket.on('swap:accepted', handleSwapAccepted);
    socket.on('swap:rejected', handleSwapRejected);

    // Handle an already-connected socket.
    if (socket.connected) {
      handlersRef.current.onConnect?.();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('hall:update', handleHallUpdate);
      socket.off('hall:booked_soon', handleBookedSoon);
      socket.off('swap:new', handleSwapNew);
      socket.off('swap:accepted', handleSwapAccepted);
      socket.off('swap:rejected', handleSwapRejected);

      disconnectSocket();
    };
  }, []);
}
