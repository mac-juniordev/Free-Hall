
import { useEffect, useState, useCallback } from 'react';
import { Layout } from '../components/Layout';
import {
  acceptSwap,
  fetchMySwaps,
  rejectSwap,
  type Swap,
} from '../lib/api-swaps';
import { extractError } from '../lib/api';
import { ArrowLeftRight, Check, X, Users } from 'lucide-react';
import { Button } from '../components/ui/Button';
import clsx from 'clsx';

type Toast = {
  kind: 'success' | 'warning';
  text: string;
};

export function SwapsPage() {
  const [incoming, setIncoming] = useState<Swap[]>([]);
  const [outgoing, setOutgoing] = useState<Swap[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState('');
  const [actingId, setActingId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  // Fetch swaps from API.
  const fetchSwaps = useCallback(async () => {
    const data = await fetchMySwaps();

    setIncoming(
      data.incoming.filter((s) => s.status === 'pending')
    );

    setOutgoing(data.outgoing);
  }, []);

  // Initial API request.
  useEffect(() => {
    let cancelled = false;

    fetchMySwaps()
      .then((data) => {
        if (cancelled) return;

        setIncoming(
          data.incoming.filter((s) => s.status === 'pending')
        );

        setOutgoing(data.outgoing);
        setError('');
      })
      .catch((err) => {
        if (!cancelled) {
          setError(extractError(err));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Manual refresh.
  const load = useCallback(async () => {
    setRefreshing(true);
    setError('');

    try {
      await fetchSwaps();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setRefreshing(false);
    }
  }, [fetchSwaps]);

  // Automatically dismiss toast.
  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => {
      setToast(null);
    }, 4000);

    return () => clearTimeout(timer);
  }, [toast]);

  // Accept swap.
  async function handleAccept(swap: Swap) {
    setActingId(swap.id);

    try {
      await acceptSwap(swap.id);

      setToast({
        kind: 'success',
        text: 'Swap accepted — halls exchanged!',
      });

      await fetchSwaps();
    } catch (err) {
      setToast({
        kind: 'warning',
        text: extractError(err),
      });
    } finally {
      setActingId(null);
    }
  }

  // Reject swap.
  async function handleReject(swap: Swap) {
    setActingId(swap.id);

    try {
      await rejectSwap(swap.id);

      setToast({
        kind: 'success',
        text: 'Swap declined.',
      });

      await fetchSwaps();
    } catch (err) {
      setToast({
        kind: 'warning',
        text: extractError(err),
      });
    } finally {
      setActingId(null);
    }
  }

  return (
    <Layout
      title="Swaps"
      subtitle="Trade halls with other CCs on campus"
      primaryAction={{
        label: refreshing ? 'Refreshing…' : 'Refresh',
        onClick: () => void load(),
      }}
    >
      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-lg border border-[#DCE1E7] bg-white"
            />
          ))}
        </div>
      ) : (
        <>
          {/* Incoming requests */}
          <section className="mb-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#6B7280]">
              Incoming requests{' '}
              {incoming.length > 0 && `(${incoming.length})`}
            </h2>

            {incoming.length === 0 ? (
              <div className="rounded-lg border border-[#DCE1E7] bg-white p-8 text-center shadow-sm">
                <ArrowLeftRight
                  size={24}
                  className="mx-auto text-[#DCE1E7]"
                />

                <p className="mt-2 text-sm text-[#6B7280]">
                  No incoming swap requests right now.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {incoming.map((swap) => (
                  <SwapCard
                    key={swap.id}
                    swap={swap}
                    variant="incoming"
                    actingId={actingId}
                    onAccept={() => handleAccept(swap)}
                    onReject={() => handleReject(swap)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Outgoing requests */}
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#6B7280]">
              Outgoing requests
            </h2>

            {outgoing.length === 0 ? (
              <div className="rounded-lg border border-[#DCE1E7] bg-white p-8 text-center shadow-sm">
                <ArrowLeftRight
                  size={24}
                  className="mx-auto text-[#DCE1E7]"
                />

                <p className="mt-2 text-sm text-[#6B7280]">
                  You haven't requested any swaps yet.
                </p>

                <p className="mt-1 text-xs text-[#6B7280]">
                  From a Dashboard hall card, tap a busy hall with a
                  smaller class and choose{' '}
                  <strong>Request swap</strong>.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {outgoing.map((swap) => (
                  <SwapCard
                    key={swap.id}
                    swap={swap}
                    variant="outgoing"
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed inset-x-0 bottom-20 z-50 mx-auto max-w-md px-4 lg:bottom-4">
          <div
            className={clsx(
              'flex items-start gap-2 rounded-lg px-4 py-3 shadow-lg',
              toast.kind === 'success'
                ? 'border border-green-200 bg-green-50'
                : 'border border-amber-200 bg-amber-50'
            )}
          >
            <p className="flex-1 text-sm text-[#1F2937]">
              {toast.text}
            </p>

            <button
              onClick={() => setToast(null)}
              aria-label="Dismiss"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}

function SwapCard({
  swap,
  variant,
  actingId,
  onAccept,
  onReject,
}: {
  swap: Swap;
  variant: 'incoming' | 'outgoing';
  actingId?: string | null;
  onAccept?: () => void;
  onReject?: () => void;
}) {
  const busy = actingId === swap.id;

  const statusBadge = {
    pending: 'bg-[#FEF3C7] text-[#92400E]',
    accepted: 'bg-[#DCFCE7] text-[#166534]',
    rejected: 'bg-[#FEE2E2] text-[#991B1B]',
    expired: 'bg-[#E5E7EB] text-[#6B7280]',
  }[swap.status];

  return (
    <div className="rounded-lg border border-[#DCE1E7] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span
          className={clsx(
            'rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase',
            statusBadge
          )}
        >
          {swap.status}
        </span>

        <span className="text-[10px] text-[#6B7280]">
          {new Date(swap.createdAt).toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <BookingInfo
          label={variant === 'incoming' ? 'They offer' : 'You offer'}
          hallName={swap.requesterBooking.hallName}
          courseCode={swap.requesterBooking.courseCode}
          students={swap.requesterBooking.studentCount}
          fullName={swap.requesterBooking.userFullName}
          highlight
        />

        <BookingInfo
          label={variant === 'incoming' ? 'They want' : 'You want'}
          hallName={swap.targetBooking.hallName}
          courseCode={swap.targetBooking.courseCode}
          students={swap.targetBooking.studentCount}
          fullName={swap.targetBooking.userFullName}
        />
      </div>

      {variant === 'incoming' &&
        swap.status === 'pending' &&
        onAccept &&
        onReject && (
          <div className="mt-4 flex gap-2">
            <Button
              variant="secondary"
              fullWidth
              onClick={onReject}
              disabled={busy}
              size="md"
            >
              <X size={16} className="mr-1" />
              Decline
            </Button>

            <Button
              fullWidth
              onClick={onAccept}
              loading={busy}
              size="md"
              disabled={busy}
            >
              <Check size={16} className="mr-1" />
              Accept
            </Button>
          </div>
        )}
    </div>
  );
}

function BookingInfo({
  label,
  hallName,
  courseCode,
  students,
  fullName,
  highlight,
}: {
  label: string;
  hallName: string;
  courseCode: string;
  students: number;
  fullName: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={clsx(
        'rounded-md p-3',
        highlight
          ? 'border border-[#0F766E]/20 bg-[#F0FDFA]'
          : 'border border-[#DCE1E7] bg-white'
      )}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
        {label}
      </div>

      <div className="mt-1 text-sm font-semibold text-[#1F2937]">
        {hallName}
      </div>

      <div className="mt-0.5 text-xs text-[#6B7280]">
        {courseCode} · {fullName}
      </div>

      <div className="mt-1 flex items-center gap-1 text-xs text-[#6B7280]">
        <Users size={12} />
        {students} students
      </div>
    </div>
  );
}
