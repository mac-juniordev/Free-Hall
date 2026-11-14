import { useAuth } from '../stores/auth';

export function DashboardPage() {
  const user = useAuth((s) => s.user);

  return (
    <div className="min-h-screen bg-[#F4F6F8]">
      <header className="bg-[#111827] text-white">
        <div className="mx-auto max-w-3xl px-6 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">FreeHall</h1>
            <p className="text-xs text-white/70">
              {user?.fullName} · {user?.matricule}
            </p>
          </div>
          <button
            onClick={() => useAuth.getState().logout()}
            className="text-sm text-white/80 hover:text-white"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="rounded-lg border border-[#DCE1E7] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#1F2937]">
            Welcome, {user?.fullName?.split(' ')[0]}
          </h2>
          <p className="mt-2 text-sm text-[#6B7280]">
            The live hall board lands here in Phase F2. Everything is wired: auth,
            protected routing, socket, and API client. Next we build the hall list,
            filters, and claim flow.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded border border-[#DCE1E7] p-3">
              <div className="text-[#6B7280]">Role</div>
              <div className="font-medium">{user?.role}</div>
            </div>
            <div className="rounded border border-[#DCE1E7] p-3">
              <div className="text-[#6B7280]">Status</div>
              <div className="font-medium">{user?.status}</div>
            </div>
            <div className="rounded border border-[#DCE1E7] p-3">
              <div className="text-[#6B7280]">Department</div>
              <div className="font-medium">{user?.department}</div>
            </div>
            <div className="rounded border border-[#DCE1E7] p-3">
              <div className="text-[#6B7280]">Level</div>
              <div className="font-medium">{user?.level}</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}