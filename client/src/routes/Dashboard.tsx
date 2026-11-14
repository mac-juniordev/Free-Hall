import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../stores/auth';
import { useNavigate } from 'react-router-dom';
import { HallCard } from '../components/HallCard';
import { FilterBar, type TierFilter } from '../components/FilterBar';
import { ClaimDrawer } from '../components/ClaimDrawer';
import { ActiveBookingBanner } from '../components/ActiveBookingBanner';
import { SwapRequestModal } from '../components/SwapRequestModal';
import { Layout } from '../components/Layout';
import { fetchHalls, fetchMyBookings, releaseBooking } from '../lib/api-halls';
import { fetchMySwaps } from '../lib/api-swaps';
import {
  useSocket,
  type HallUpdatePayload,
  type SwapNewPayload,
  type SwapAcceptedPayload,
  type SwapRejectedPayload,
} from '../hooks/useSocket';
import { extractError } from '../lib/api';
import { playNotificationChime, playAcceptedChime } from '../lib/sound';
import type { Booking, Hall } from '../types/api';
import { CheckCircle2, X, Building2, Users, Clock, ArrowLeftRight } from 'lucide-react';
import clsx from 'clsx';

type Toast = { kind: 'success' | 'warning' | 'swap'; text: string };

type ModalMode =
  | { type: 'from-hall'; targetBookingId: string; targetHallName: string }
  | { type: 'from-booking'; requesterBookingId: string }
  | null;

export function DashboardPage() {
  const user = useAuth((s) => s.user);
  const navigate = useNavigate();

  const [halls, setHalls] = useState<Hall[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [allActiveBookings, setAllActiveBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [socketLive, setSocketLive] = useState(false);

  const [tier, setTier] = useState<TierFilter>('all');
  const [zone, setZone] = useState<string | undefined>(undefined);

  const [claimingHall, setClaimingHall] = useState<Hall | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [endingId, setEndingId] = useState<string | null>(null);

  const [swapModal, setSwapModal] = useState<ModalMode>(null);
  const [swapTargets, setSwapTargets] = useState<Booking[]>([]);

  const activeBooking = myBookings.find((b) => b.status === 'active');

  async function loadAll(showLoader = true) {
    if (showLoader) setLoading(true);
    else setRefreshing(true);
    setError('');
    try {
      const [hallsData, bookingsData] = await Promise.all([
        fetchHalls(),
        fetchMyBookings(),
      ]);
      setHalls(hallsData);
      setMyBookings(bookingsData);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useSocket({
    onConnect: () => setSocketLive(true),
    onDisconnect: () => setSocketLive(false),
    onHallUpdate: (payload: HallUpdatePayload) => {
      setHalls((prev) =>
        prev.map((h) =>
          h.id === payload.hallId
            ? {
                ...h,
                liveStatus: payload.liveStatus,
                activeBookingId: payload.activeBookingId,
              }
            : h
        )
      );
    },
    onSwapNew: (payload: SwapNewPayload) => {
      playNotificationChime();
      setToast({
        kind: 'swap',
        text: `${payload.requesterBooking.userFullName} wants to swap ${payload.requesterBooking.hallName} → ${payload.targetBooking.hallName}`,
      });
    },
    onSwapAccepted: (_payload: SwapAcceptedPayload) => {
      playAcceptedChime();
      setToast({ kind: 'success', text: 'Your swap request was accepted!' });
      void loadAll(false);
    },
    onSwapRejected: (_payload: SwapRejectedPayload) => {
      setToast({ kind: 'warning', text: 'Your swap request was declined.' });
    },
  });

  const filtered = useMemo(() => {
    return halls.filter((h) => {
      if (tier !== 'all' && h.capacityTier !== tier) return false;
      if (zone && h.zone !== zone) return false;
      return true;
    });
  }, [halls, tier, zone]);

  const zones = useMemo(
    () => Array.from(new Set(halls.map((h) => h.zone))).sort(),
    [halls]
  );

  const stats = useMemo(() => {
    const free = halls.filter((h) => h.liveStatus === 'FREE').length;
    const occupied = halls.filter((h) => h.liveStatus === 'OCCUPIED').length;
    const soon = halls.filter((h) => h.liveStatus === 'BOOKED_SOON').length;
    return { free, occupied, soon, total: halls.length };
  }, [halls]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  async function handleEndClass() {
    if (!activeBooking) return;
    setEndingId(activeBooking.id);
    try {
      await releaseBooking(activeBooking.id);
      setToast({ kind: 'success', text: 'Hall freed. Others can claim it now.' });
      await loadAll(false);
    } catch (err) {
      setToast({ kind: 'warning', text: extractError(err) });
    } finally {
      setEndingId(null);
    }
  }

  function handleClaimSuccess(result: { warning: string | null }) {
    if (result.warning) {
      setToast({ kind: 'warning', text: result.warning });
    } else {
      setToast({ kind: 'success', text: 'Hall claimed. Happy teaching!' });
    }
    void loadAll(false);
  }

  // Entry point A — from an occupied hall card
  async function openSwapFromHall(hall: Hall) {
    if (!hall.activeBookingId) {
      setToast({ kind: 'warning', text: 'This hall has no active booking to swap with.' });
      return;
    }
    // Fetch all active bookings so we can show target details
    try {
      const all = await fetchAllActiveBookingsForHall(hall.id, hall.activeBookingId);
      setSwapTargets(all);
      setSwapModal({
        type: 'from-hall',
        targetBookingId: hall.activeBookingId,
        targetHallName: hall.name,
      });
    } catch (err) {
      setToast({ kind: 'warning', text: extractError(err) });
    }
  }

  // Entry point B — from the active booking banner
  async function openSwapFromBooking() {
    if (!activeBooking) return;
    try {
      const all = await fetchAllActiveBookingsForHall(null, null);
      setSwapTargets(all);
      setSwapModal({ type: 'from-booking', requesterBookingId: activeBooking.id });
    } catch (err) {
      setToast({ kind: 'warning', text: extractError(err) });
    }
  }

  // Helper — pulls "all active bookings" by scanning the hall list's activeBookingIds
  // and reading /api/bookings/mine for the current user (the /api/halls endpoint
  // returns activeBookingId per hall; we need the booking row itself).
  async function fetchAllActiveBookingsForHall(
    _hallId: string | null,
    _bookingId: string | null
  ): Promise<Booking[]> {
    // Fetch fresh hall list — this populates activeBookingId fields
    const [hallsData, my] = await Promise.all([fetchHalls(), fetchMyBookings()]);

    // Build a map of active bookings on the board
    const bookingsMap = new Map<string, Booking>();
    for (const b of my) bookingsMap.set(b.id, b);

    // Since we don't have a bulk endpoint, construct synthetic Booking rows
    // from hall metadata for OTHER users' active bookings
    const others: Booking[] = [];
    for (const h of hallsData) {
      if (h.liveStatus === 'OCCUPIED' && h.activeBookingId && !bookingsMap.has(h.activeBookingId)) {
        others.push({
          id: h.activeBookingId,
          universityId: h.universityId,
          hallId: h.id,
          hallName: h.name,
          userId: '',
          courseCode: '',
          studentCount: 0,
          bookingType: 'instant',
          isCheckedIn: true,
          startTime: h.createdAt,
          endTime: h.createdAt,
          status: 'active',
          createdAt: h.createdAt,
        });
      }
    }

    return [...my.filter((b) => b.status === 'active' || b.status === 'upcoming'), ...others];
  }

  async function refreshSwaps() {
    try {
      const data = await fetchMySwaps();
      if (data.incoming.some((s) => s.status === 'pending')) {
        playNotificationChime();
      }
    } catch {
      /* silent */
    }
  }

  return (
    <Layout
      socketLive={socketLive}
      title={`Welcome, ${user?.fullName?.split(' ')[0] ?? 'CC'}`}
      subtitle={`${user?.department} · ${user?.level}`}
      primaryAction={{
        label: refreshing ? 'Refreshing…' : 'Refresh',
        onClick: () => {
          void loadAll(false);
          void refreshSwaps();
        },
      }}
    >
      {activeBooking && (
        <div className="mb-5">
          <ActiveBookingBanner
            booking={activeBooking}
            onEndClass={handleEndClass}
            ending={endingId === activeBooking.id}
          />
          <button
            onClick={openSwapFromBooking}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[#0F766E] hover:underline"
          >
            <ArrowLeftRight size={12} />
            Find a bigger hall — request a swap
          </button>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<Building2 size={18} />} label="Total halls" value={stats.total} tone="neutral" />
        <StatCard icon={<CheckCircle2 size={18} />} label="Free now" value={stats.free} tone="free" />
        <StatCard icon={<Clock size={18} />} label="Occupied" value={stats.occupied} tone="occupied" />
        <StatCard icon={<Users size={18} />} label="Booked soon" value={stats.soon} tone="soon" />
      </div>

      <div className="mb-5 rounded-lg border border-[#DCE1E7] bg-white p-4 shadow-sm">
        <FilterBar
          tier={tier}
          onTierChange={setTier}
          zone={zone}
          zones={zones}
          onZoneChange={setZone}
        />
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-lg border border-[#DCE1E7] bg-white" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-[#DCE1E7] bg-white p-10 text-center shadow-sm">
          <p className="text-sm text-[#6B7280]">
            {halls.length === 0 ? 'No halls yet for your university.' : 'No halls match your filters.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((hall) => (
            <HallCard
              key={hall.id}
              hall={hall}
              onClaim={setClaimingHall}
              onViewActive={activeBooking ? openSwapFromHall : undefined}
            />
          ))}
        </div>
      )}

      {toast && (
        <div className="fixed inset-x-0 bottom-20 z-50 mx-auto max-w-md px-4 lg:bottom-4">
          <div
            className={clsx(
              'flex items-start gap-2 rounded-lg px-4 py-3 shadow-lg',
              toast.kind === 'success' && 'border border-green-200 bg-green-50',
              toast.kind === 'warning' && 'border border-amber-200 bg-amber-50',
              toast.kind === 'swap' && 'border border-[#0F766E] bg-[#F0FDFA]'
            )}
          >
            {toast.kind === 'swap' ? (
              <ArrowLeftRight size={18} className="shrink-0 text-[#0F766E]" />
            ) : toast.kind === 'success' ? (
              <CheckCircle2 size={18} className="shrink-0 text-green-700" />
            ) : (
              <X size={18} className="shrink-0 text-amber-700" />
            )}
            <p className="flex-1 text-sm text-[#1F2937]">{toast.text}</p>
            {toast.kind === 'swap' && (
              <button
                onClick={() => navigate('/swaps')}
                className="shrink-0 text-xs font-medium text-[#0F766E] hover:underline"
              >
                View
              </button>
            )}
            <button onClick={() => setToast(null)} className="text-[#6B7280]" aria-label="Dismiss">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <ClaimDrawer
        hall={claimingHall}
        onClose={() => setClaimingHall(null)}
        onSuccess={handleClaimSuccess}
      />

      <SwapRequestModal
        open={!!swapModal}
        mode={swapModal}
        myBookings={myBookings.filter((b) => b.status === 'active' || b.status === 'upcoming')}
        allActiveBookings={swapTargets}
        onClose={() => setSwapModal(null)}
        onSuccess={() => {
          setToast({ kind: 'success', text: 'Swap request sent.' });
          void loadAll(false);
        }}
      />
    </Layout>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: 'neutral' | 'free' | 'occupied' | 'soon';
}) {
  const tones = {
    neutral: 'border-[#DCE1E7] bg-white text-[#1F2937]',
    free: 'border-[#16A34A]/20 bg-[#DCFCE7] text-[#166534]',
    occupied: 'border-[#DC2626]/20 bg-[#FEE2E2] text-[#991B1B]',
    soon: 'border-[#D97706]/20 bg-[#FEF3C7] text-[#92400E]',
  } as const;
  return (
    <div className={clsx('rounded-lg border p-3 shadow-sm', tones[tone])}>
      <div className="flex items-center gap-2 text-xs opacity-80">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}