import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { fetchMyBookings } from '../lib/api-halls';
import { extractError } from '../lib/api';
import type { Booking } from '../types/api';
import { Calendar, Clock, MapPin } from 'lucide-react';
import clsx from 'clsx';

export function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMyBookings()
      .then(setBookings)
      .catch((err) => setError(extractError(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout
      title="My Bookings"
      subtitle="Your active and upcoming hall reservations"
    >
      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-lg border border-[#DCE1E7] bg-white"
            />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="rounded-lg border border-[#DCE1E7] bg-white p-10 text-center shadow-sm">
          <Calendar size={32} className="mx-auto text-[#DCE1E7]" />
          <p className="mt-3 text-sm text-[#6B7280]">
            You have no active or upcoming bookings.
          </p>
          <p className="mt-1 text-xs text-[#6B7280]">
            Claim a free hall from the Dashboard.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <BookingRow key={b.id} booking={b} />
          ))}
        </div>
      )}
    </Layout>
  );
}

function BookingRow({ booking }: { booking: Booking }) {
  const start = new Date(booking.startTime).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const end = new Date(booking.endTime).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="rounded-lg border border-[#DCE1E7] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={clsx(
                'rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide',
                booking.status === 'active'
                  ? 'bg-[#0F766E] text-white'
                  : 'bg-[#FEF3C7] text-[#92400E]'
              )}
            >
              {booking.status.toUpperCase()}
            </span>
            <span className="text-xs font-medium text-[#1F2937]">
              {booking.courseCode}
            </span>
          </div>
          <h3 className="mt-1.5 truncate text-base font-semibold text-[#1F2937]">
            {booking.hallName}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6B7280]">
            <span className="inline-flex items-center gap-1">
              <Clock size={12} /> {start} – {end}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin size={12} /> {booking.studentCount} students
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}