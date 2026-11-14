import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useAuth } from '../stores/auth';

export function SuspendedPage() {
  const logout = useAuth((s) => s.logout);

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F6F8]">
      <header className="bg-[#111827] text-white">
        <div className="mx-auto max-w-md px-6 py-8">
          <h1 className="text-3xl font-bold tracking-tight">FreeHall</h1>
          <p className="mt-1 text-sm text-white/70">Account suspended.</p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-6 py-8">
        <div className="rounded-lg border border-[#DCE1E7] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#1F2937]">
            Your account is suspended
          </h2>
          <p className="mt-2 text-sm text-[#6B7280]">
            A Super Admin has suspended this account. Please contact the FreeHall team
            or your department representative to request reinstatement.
          </p>
          <div className="mt-4 rounded-md bg-[#FEE2E2] px-3 py-2 text-sm text-[#991B1B]">
            If you believe this is an error, reach out via the WhatsApp group where you
            got your registration link.
          </div>
          <div className="mt-6 space-y-2">
            <button
              onClick={logout}
              className="w-full rounded-md border border-[#DCE1E7] bg-white px-4 py-2.5 text-sm font-medium text-[#1F2937] hover:bg-[#F4F6F8]"
            >
              Sign out
            </button>
            <Link to="/login" className="block">
              <Button fullWidth>Back to login</Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}