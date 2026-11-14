import {useState } from 'react';
import  type {ReactNode} from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../stores/auth';
import {
  LayoutDashboard,
  Calendar,
  ArrowLeftRight,
  LogOut,
  Menu,
  X,
  Wifi,
  WifiOff,
  User,
} from 'lucide-react';
import clsx from 'clsx';

type LayoutProps = {
  children: ReactNode;
  socketLive?: boolean;
  title: string;
  subtitle?: string;
  primaryAction?: { label: string; onClick: () => void };
};

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/bookings', label: 'My Bookings', icon: Calendar },
  { to: '/swaps', label: 'Swaps', icon: ArrowLeftRight },
];

export function Layout({
  children,
  socketLive,
  title,
  subtitle,
  primaryAction,
}: LayoutProps) {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-[#F4F6F8]">
      {/* ─── Top nav (sticky) ─── */}
      <header className="sticky top-0 z-40 border-b border-[#111827] bg-[#111827] text-white shadow-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 lg:px-6">
          {/* Left: brand + mobile menu toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="rounded-md p-1.5 text-white/80 hover:bg-white/10 lg:hidden"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#0F766E] text-sm font-bold">
                F
              </div>
              <span className="text-base font-semibold tracking-tight">FreeHall</span>
            </div>

            {socketLive !== undefined && (
              <span
                className={clsx(
                  'hidden items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium sm:inline-flex',
                  socketLive
                    ? 'bg-green-500/20 text-green-300'
                    : 'bg-red-500/20 text-red-300'
                )}
              >
                {socketLive ? <Wifi size={10} /> : <WifiOff size={10} />}
                {socketLive ? 'LIVE' : 'OFFLINE'}
              </span>
            )}
          </div>

          {/* Center: desktop nav */}
          <nav className="hidden items-center gap-1 lg:flex">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                      isActive
                        ? 'bg-white/10 text-white'
                        : 'text-white/70 hover:bg-white/5 hover:text-white'
                    )
                  }
                >
                  <Icon size={16} />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          {/* Right: user menu */}
          <div className="flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <div className="text-xs font-medium text-white">{user?.fullName}</div>
              <div className="text-[10px] text-white/60">{user?.matricule}</div>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-md p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* Mobile nav drawer */}
        {mobileMenuOpen && (
          <nav className="border-t border-white/10 bg-[#111827] px-4 py-2 lg:hidden">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm',
                      isActive
                        ? 'bg-white/10 text-white'
                        : 'text-white/70 hover:bg-white/5 hover:text-white'
                    )
                  }
                >
                  <Icon size={18} />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        )}
      </header>

      {/* ─── Body: sidebar (desktop) + main content ─── */}
      <div className="mx-auto flex max-w-7xl">
        {/* Desktop sidebar */}
        <aside className="hidden w-56 shrink-0 border-r border-[#DCE1E7] bg-white lg:block">
          <div className="sticky top-14 p-4">
            <div className="mb-4 px-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">
                Menu
              </div>
            </div>
            <nav className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      clsx(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                        isActive
                          ? 'bg-[#0F766E]/10 font-medium text-[#0F766E]'
                          : 'text-[#1F2937] hover:bg-[#F4F6F8]'
                      )
                    }
                  >
                    <Icon size={18} />
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>

            <div className="mt-8 rounded-md border border-[#DCE1E7] p-3">
              <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                <User size={14} />
                <span className="capitalize">{user?.role}</span>
              </div>
              <div className="mt-1 text-xs font-medium text-[#1F2937]">
                {user?.department}
              </div>
              <div className="text-xs text-[#6B7280]">{user?.level}</div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1 px-4 py-6 pb-24 lg:px-6 lg:pb-8">
          {/* Page header */}
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold tracking-tight text-[#1F2937]">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-1 text-sm text-[#6B7280]">{subtitle}</p>
              )}
            </div>
            {primaryAction && (
              <button
                onClick={primaryAction.onClick}
                className="shrink-0 rounded-md bg-[#0F766E] px-4 py-2 text-sm font-medium text-white hover:bg-[#0d6760]"
              >
                {primaryAction.label}
              </button>
            )}
          </div>

          {children}
        </main>
      </div>

      {/* ─── Mobile bottom nav ─── */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#DCE1E7] bg-white lg:hidden">
        <div className="mx-auto flex max-w-md items-center justify-around">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  clsx(
                    'flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors',
                    isActive ? 'text-[#0F766E]' : 'text-[#6B7280]'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                    {item.label}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}