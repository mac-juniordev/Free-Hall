import { lazy, Suspense } from 'react';
import type {ReactNode} from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './stores/auth';
import { LoginPage } from './routes/Login';
import { RegisterPage } from './routes/Register';
import { PendingPage } from './routes/Pending';
// import { SuspendedPage } from './routes/Suspended';
import { DashboardPage } from './routes/Dashboard';
import { BookingsPage } from './routes/Bookings';
// import { SwapsPage } from './routes/Swaps';

const AdminPage = lazy(() =>
  import('./routes/Admin').then((m) => ({ default: m.AdminPage }))
);

const ADMIN_PATH = import.meta.env.VITE_ADMIN_PATH || '/admin-hidden';

function RequireAuth({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  const user = useAuth((s) => s.user);
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  if (user.status === 'pending') return <Navigate to="/pending" replace />;
  return <>{children}</>;
}

function RequireRole({
  role,
  children,
}: {
  role: 'super_admin' | 'cc' | 'assistant';
  children: ReactNode;
}) {
  const user = useAuth((s) => s.user);
  if (!user || user.role !== role) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function RootRedirect() {
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  const user = useAuth((s) => s.user);
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  if (user.status === 'pending') return <Navigate to="/pending" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/pending" element={<PendingPage />} />
        {/* <Route path="/suspended" element={<SuspendedPage />} /> */}

        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <DashboardPage />
            </RequireAuth>
          }
        />
        <Route
          path="/bookings"
          element={
            <RequireAuth>
              <BookingsPage />
            </RequireAuth>
          }
        />
        {/* <Route
          path="/swaps"
          element={
            <RequireAuth>
              <SwapsPage />
            </RequireAuth>
          }
        /> */}

        <Route
          path={ADMIN_PATH}
          element={
            <RequireAuth>
              <RequireRole role="super_admin">
                <Suspense fallback={<div className="p-8">Loading…</div>}>
                  <AdminPage />
                </Suspense>
              </RequireRole>
            </RequireAuth>
          }
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}