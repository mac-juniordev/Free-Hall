import { api } from './api';
import type { Booking } from '../types/api';

export type SwapBookingInfo = {
  id: string;
  hallId: string;
  hallName: string;
  courseCode: string;
  studentCount: number;
  userId: string;
  userFullName: string;
  startTime: string;
  endTime: string;
};

export type Swap = {
  id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  createdAt: string;
  requesterBooking: SwapBookingInfo;
  targetBooking: SwapBookingInfo;
};

export type CreateSwapInput = {
  requesterBookingId: string;
  targetBookingId: string;
};

export async function createSwap(input: CreateSwapInput): Promise<Swap> {
  const { data } = await api.post<{ swap: Swap }>('/api/swaps', input);
  return data.swap;
}

export async function acceptSwap(swapId: string): Promise<Swap> {
  const { data } = await api.post<{ swap: Swap }>(`/api/swaps/${swapId}/accept`);
  return data.swap;
}

export async function rejectSwap(swapId: string): Promise<Swap> {
  const { data } = await api.post<{ swap: Swap }>(`/api/swaps/${swapId}/reject`);
  return data.swap;
}

export async function fetchMySwaps(): Promise<{
  incoming: Swap[];
  outgoing: Swap[];
}> {
  const { data } = await api.get<{ incoming: Swap[]; outgoing: Swap[] }>(
    '/api/swaps/mine'
  );
  return data;
}

// Reuses existing /api/bookings/mine — imported here for convenience
export async function fetchMyBookingsForSwap(): Promise<Booking[]> {
  const { data } = await api.get<{ bookings: Booking[] }>('/api/bookings/mine');
  return data.bookings;
}