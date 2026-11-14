import { useEffect, useMemo, useState } from 'react';
import { X, ArrowLeftRight, Check } from 'lucide-react';
import type { Booking } from '../types/api';
import { createSwap } from '../lib/api-swaps';
import { extractError } from '../lib/api';
import { Button } from './ui/Button';
import clsx from 'clsx';

type Mode =
  | { type: 'from-hall'; targetBookingId: string; targetHallName: string }
  | { type: 'from-booking'; requesterBookingId: string };

type SwapRequestModalProps = {
  open: boolean;
  mode: Mode | null;
  myBookings: Booking[]; // CC's own active + upcoming bookings
  allActiveBookings?: Booking[]; // Other users' active bookings (fetched on demand)
  onClose: () => void;
  onSuccess: () => void;
};

export function SwapRequestModal({
  open,
  mode,
  myBookings,
  allActiveBookings = [],
  onClose,
  onSuccess,
}: SwapRequestModalProps) {
  const [selectedRequester, setSelectedRequester] = useState<string>('');
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !mode) return;
    setError('');

    if (mode.type === 'from-hall') {
      // Pre-select the target; user picks which of THEIR bookings to offer
      setSelectedTarget(mode.targetBookingId);
      const eligible = myBookings.find(
        (b) =>
          b.status === 'active' &&
          b.hallId !== mode.targetBookingId &&
          b.studentCount > 0
      );
      setSelectedRequester(eligible?.id ?? myBookings[0]?.id ?? '');
    } else {
      // Pre-select their booking; user picks which target hall
      setSelectedRequester(mode.requesterBookingId);
      const eligible = allActiveBookings.find(
        (b) => b.id !== mode.requesterBookingId
      );
      setSelectedTarget(eligible?.id ?? '');
    }
  }, [open, mode, myBookings, allActiveBookings]);

  const requesterBooking = useMemo(
    () => myBookings.find((b) => b.id === selectedRequester),
    [myBookings, selectedRequester]
  );
  const targetBooking = useMemo(
    () => allActiveBookings.find((b) => b.id === selectedTarget),
    [allActiveBookings, selectedTarget]
  );

  if (!open || !mode) return null;

  async function handleSubmit() {
    if (!selectedRequester || !selectedTarget) {
      setError('Please select both bookings');
      return;
    }
    if (requesterBooking && requesterBooking.studentCount <= (targetBooking?.studentCount ?? 0)) {
      setError('Your class must be larger than the target class to request a swap');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await createSwap({
        requesterBookingId: selectedRequester,
        targetBookingId: selectedTarget,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} aria-hidden />
      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white shadow-2xl lg:inset-x-auto lg:left-1/2 lg:bottom-auto lg:top-1/2 lg:max-w-lg lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-2xl">
        <div className="p-5">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#1F2937]">Request swap</h2>
              <p className="text-xs text-[#6B7280]">
                Trade your class into a bigger (or better-located) hall.
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded p-1 text-[#6B7280] hover:bg-[#F4F6F8]"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          {/* Your booking (requester) */}
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
              You offer
            </label>
            {myBookings.length === 0 ? (
              <p className="rounded-md border border-[#FEF3C7] bg-[#FEF3C7] px-3 py-2 text-xs text-[#92400E]">
                You need an active booking to request a swap.
              </p>
            ) : (
              <div className="space-y-2">
                {myBookings.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setSelectedRequester(b.id)}
                    className={clsx(
                      'flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left',
                      selectedRequester === b.id
                        ? 'border-[#0F766E] bg-[#F0FDFA]'
                        : 'border-[#DCE1E7] hover:bg-[#F4F6F8]'
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-[#1F2937]">
                        {b.hallName} · {b.courseCode}
                      </div>
                      <div className="text-xs text-[#6B7280]">
                        {b.studentCount} students
                      </div>
                    </div>
                    {selectedRequester === b.id && (
                      <Check size={16} className="shrink-0 text-[#0F766E]" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Target booking */}
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
              You want
            </label>
            {allActiveBookings.length === 0 ? (
              <p className="rounded-md border border-[#DCE1E7] bg-[#F4F6F8] px-3 py-2 text-xs text-[#6B7280]">
                {mode.type === 'from-hall'
                  ? 'Target hall locked from card.'
                  : 'No active bookings available to swap with right now.'}
              </p>
            ) : (
              <div className="space-y-2">
                {allActiveBookings
                  .filter((b) => b.id !== selectedRequester)
                  .map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setSelectedTarget(b.id)}
                      className={clsx(
                        'flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left',
                        selectedTarget === b.id
                          ? 'border-[#0F766E] bg-[#F0FDFA]'
                          : 'border-[#DCE1E7] hover:bg-[#F4F6F8]'
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-[#1F2937]">
                          {b.hallName} · {b.courseCode}
                        </div>
                        <div className="text-xs text-[#6B7280]">
                          {b.studentCount} students
                        </div>
                      </div>
                      {selectedTarget === b.id && (
                        <Check size={16} className="shrink-0 text-[#0F766E]" />
                      )}
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Preview */}
          {requesterBooking && targetBooking && (
            <div className="mb-4 rounded-md border border-[#DCE1E7] bg-[#F4F6F8] p-3">
              <div className="flex items-center justify-center gap-2 text-xs text-[#6B7280]">
                <span className="font-medium text-[#1F2937]">{requesterBooking.hallName}</span>
                <ArrowLeftRight size={14} />
                <span className="font-medium text-[#1F2937]">{targetBooking.hallName}</span>
              </div>
              <div className="mt-1 text-center text-[10px] text-[#6B7280]">
                Your {requesterBooking.studentCount} students would move into a{' '}
                {targetBooking.studentCount}-capacity hall
              </div>
            </div>
          )}

          {error && (
            <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <Button
            fullWidth
            size="lg"
            loading={submitting}
            onClick={handleSubmit}
            disabled={!selectedRequester || !selectedTarget}
          >
            Send swap request
          </Button>
        </div>
      </div>
    </>
  );
}