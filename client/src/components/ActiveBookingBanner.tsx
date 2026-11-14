
import { useEffect, useState } from 'react';
import type { Booking } from '../types/api';
import { Clock, LogOut } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';

type ActiveBookingBannerProps = {
  booking: Booking;
  onEndClass: () => void;
  ending?: boolean;
};

export function ActiveBookingBanner({
  booking,
  onEndClass,
  ending,
}: ActiveBookingBannerProps) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const t = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(t);
  }, []);

  const remaining =
    now !== null
      ? new Date(booking.endTime).getTime() - now
      : null;

  const timeLabel =
    remaining === null
      ? 'Calculating...'
      : remaining > 0
        ? `${formatDistanceToNowStrict(
            new Date(booking.endTime),
            { addSuffix: false }
          )} left`
        : 'Time is up';

  const start = new Date(booking.startTime).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const end = new Date(booking.endTime).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="rounded-lg border border-[#0F766E] bg-[#F0FDFA] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[#0F766E] px-2 py-0.5 text-[10px] font-bold tracking-wider text-white">
              ACTIVE
            </span>

            <span className="inline-flex items-center gap-1 text-xs font-medium text-[#0F766E]">
              <Clock size={12} />
              {timeLabel}
            </span>
          </div>

          <h3 className="mt-2 text-base font-semibold text-[#1F2937]">
            {booking.hallName} · {booking.courseCode}
          </h3>

          <p className="text-xs text-[#6B7280]">
            {booking.studentCount} students · {start} – {end}
          </p>
        </div>

        <button
          onClick={onEndClass}
          disabled={ending}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          <LogOut size={12} />
          {ending ? 'Ending…' : 'End class'}
        </button>
      </div>
    </div>
  );
}
