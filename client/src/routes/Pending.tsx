import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useAuth } from '../stores/auth';

export function PendingPage() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F6F8]">
      <header className="bg-[#111827] text-white">
        <div className="mx-auto max-w-md px-6 py-8">
          <h1 className="text-3xl font-bold tracking-tight">FreeHall</h1>
          <p className="mt-1 text-sm text-white/70">Account pending verification.</p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-6 py-8">
        <div className="rounded-lg border border-[#DCE1E7] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#1F2937]">
            Awaiting Super Admin approval
          </h2>
          <p className="mt-2 text-sm text-[#6B7280]">
            {user?.fullName ? `Hi ${user.fullName}, ` : ''}
            your account is currently under review. Once a Super Admin verifies your CC
            status, you'll be able to sign in and see live hall availability.
          </p>
          <div className="mt-4 rounded-md bg-[#FEF3C7] px-3 py-2 text-sm text-[#92400E]">
            Matricule: <strong>{user?.matricule ?? '—'}</strong>
          </div>
          <div className="mt-6 flex gap-3">
            <Button variant="secondary" fullWidth onClick={logout}>
              Sign out
            </Button>
            <Link to="/login" className="block w-full">
              <Button fullWidth>Back to login</Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}