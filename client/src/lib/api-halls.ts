import { api } from './api';
import type { Booking, Hall } from '../types/api';

export type HallFilters = {
  zone?: string;
  tier?: 'small' | 'medium' | 'large' | 'amphi';
};

export async function fetchHalls(filters: HallFilters = {}): Promise<Hall[]> {
  const params = new URLSearchParams();
  if (filters.zone) params.set('zone', filters.zone);
  if (filters.tier) params.set('tier', filters.tier);
  const qs = params.toString();
  const { data } = await api.get<{ halls: Hall[] }>(`/api/halls${qs ? `?${qs}` : ''}`);
  return data.halls;
}

export type ClaimInput = {
  hallId: string;
  courseCode: string;
  studentCount: number;
  durationMin: number;
};

export async function claimHall(
  input: ClaimInput
): Promise<{ booking: Booking; warning: string | null }> {
  const { data } = await api.post<{ booking: Booking; warning: string | null }>(
    '/api/bookings/claim',
    input
  );
  return data;
}

export async function releaseBooking(bookingId: string): Promise<Booking> {
  const { data } = await api.post<{ booking: Booking }>(
    `/api/bookings/${bookingId}/release`
  );
  return data.booking;
}

export async function fetchMyBookings(): Promise<Booking[]> {
  const { data } = await api.get<{ bookings: Booking[] }>('/api/bookings/mine');
  return data.bookings;
}