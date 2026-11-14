import type { Hall, HallLiveStatus } from '../types/api';
import { Users, Clock, CheckCircle2, MapPin } from 'lucide-react';
import clsx from 'clsx';

type HallCardProps = {
  hall: Hall;
  onClaim: (hall: Hall) => void;
  onViewActive?: (hall: Hall) => void;
};

const STATUS_STYLE: Record<
  HallLiveStatus,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  FREE: {
    label: 'FREE',
    bg: 'bg-[#DCFCE7]',
    text: 'text-[#166534]',
    border: 'border-l-[#16A34A]',
    dot: 'bg-[#16A34A]',
  },
  OCCUPIED: {
    label: 'OCCUPIED',
    bg: 'bg-[#FEE2E2]',
    text: 'text-[#991B1B]',
    border: 'border-l-[#DC2626]',
    dot: 'bg-[#DC2626]',
  },
  BOOKED_SOON: {
    label: 'BOOKED SOON',
    bg: 'bg-[#FEF3C7]',
    text: 'text-[#92400E]',
    border: 'border-l-[#D97706]',
    dot: 'bg-[#D97706]',
  },
};

export function HallCard({ hall, onClaim, onViewActive }: HallCardProps) {
  const style = STATUS_STYLE[hall.liveStatus];
  const isFree = hall.liveStatus === 'FREE';

  return (
    <div
      className={clsx(
        'flex h-full flex-col rounded-lg border border-[#DCE1E7] border-l-4 bg-white shadow-sm transition-all hover:shadow-md',
        style.border
      )}
    >
      <div className="flex-1 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold text-[#1F2937]">
              {hall.name}
            </h3>
            <div className="mt-1 flex items-center gap-1 text-xs text-[#6B7280]">
              <MapPin size={12} />
              <span className="truncate">{hall.zone}</span>
            </div>
          </div>
          <span
            className={clsx(
              'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider',
              style.bg,
              style.text
            )}
          >
            <span className={clsx('h-1.5 w-1.5 rounded-full', style.dot)} />
            {style.label}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-md bg-[#F4F6F8] px-2.5 py-2">
            <div className="text-[10px] font-medium uppercase tracking-wide text-[#6B7280]">
              Capacity
            </div>
            <div className="mt-0.5 flex items-center gap-1 text-xs font-medium text-[#1F2937]">
              <Users size={12} />
              {hall.approxCapacityRange}
            </div>
          </div>
          <div className="rounded-md bg-[#F4F6F8] px-2.5 py-2">
            <div className="text-[10px] font-medium uppercase tracking-wide text-[#6B7280]">
              Tier
            </div>
            <div className="mt-0.5 text-xs font-medium capitalize text-[#1F2937]">
              {hall.capacityTier}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-[#DCE1E7] p-3">
        {isFree ? (
          <button
            onClick={() => onClaim(hall)}
            className="w-full rounded-md bg-[#0F766E] px-4 py-2 text-sm font-medium text-white hover:bg-[#0d6760]"
          >
            Claim now
          </button>
        ) : hall.liveStatus === 'OCCUPIED' && onViewActive ? (
          <button
            onClick={() => onViewActive(hall)}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-[#DCE1E7] bg-white px-4 py-2 text-sm font-medium text-[#1F2937] hover:bg-[#F4F6F8]"
          >
            <Clock size={14} />
            View class
          </button>
        ) : (
          <button
            disabled
            className="inline-flex w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-md border border-[#DCE1E7] bg-[#F4F6F8] px-4 py-2 text-sm font-medium text-[#6B7280]"
          >
            <CheckCircle2 size={14} />
            Booked soon
          </button>
        )}
      </div>
    </div>
  );
}