import { useEffect, useState } from 'react';
import type {FormEvent} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { api, extractError } from '../lib/api';
import type { RegisterResponse, University } from '../types/api';
import { Check, X } from 'lucide-react';

const passwordChecks = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'One number', test: (p: string) => /\d/.test(p) },
];

export function RegisterPage() {
  const navigate = useNavigate();
  const [universities, setUniversities] = useState<University[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<RegisterResponse | null>(null);

  const [form, setForm] = useState({
    universityId: '',
    fullName: '',
    matricule: '',
    email: '',
    department: '',
    level: 'Level 300',
    role: 'cc' as 'cc' | 'assistant',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    api
      .get<{ universities: University[] }>('/api/auth/universities')
      .then((r) => {
        setUniversities(r.data.universities);
        if (r.data.universities[0]) {
          setForm((f) => ({ ...f, universityId: r.data.universities[0].id }));
        }
      })
      .catch((err) => setError(extractError(err)));
  }, []);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { data } = await api.post<RegisterResponse>('/api/auth/register', form);
      setSuccess(data);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen flex-col bg-[#F4F6F8]">
        <header className="bg-[#111827] text-white">
          <div className="mx-auto max-w-md px-6 py-8">
            <h1 className="text-3xl font-bold tracking-tight">FreeHall</h1>
            <p className="mt-1 text-sm text-white/70">Registration received.</p>
          </div>
        </header>
        <main className="mx-auto w-full max-w-md flex-1 px-6 py-8">
          <div className="rounded-lg border border-[#DCE1E7] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#1F2937]">
              Awaiting verification
            </h2>
            <p className="mt-2 text-sm text-[#6B7280]">
              Thanks, {success.user.fullName}. A Super Admin will verify your CC status
              shortly. You can log in once approved.
            </p>
            <div className="mt-4 rounded-md bg-[#FEF3C7] px-3 py-2 text-sm text-[#92400E]">
              Matricule: <strong>{success.user.matricule}</strong>
            </div>
            <Button
              fullWidth
              className="mt-6"
              onClick={() => navigate('/login', { replace: true })}
            >
              Back to login
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F6F8]">
      <header className="bg-[#111827] text-white">
        <div className="mx-auto max-w-md px-6 py-8">
          <h1 className="text-3xl font-bold tracking-tight">FreeHall</h1>
          <p className="mt-1 text-sm text-white/70">
            Register as a Class Coordinator.
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-6 py-8">
        <div className="rounded-lg border border-[#DCE1E7] bg-white p-6 shadow-sm">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#1F2937]">
                University
              </label>
              <select
                value={form.universityId}
                onChange={(e) => update('universityId', e.target.value)}
                className="h-10 w-full rounded-md border border-[#DCE1E7] bg-white px-3 text-sm text-[#1F2937] focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                required
              >
                {universities.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.shortCode})
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Full name"
              value={form.fullName}
              onChange={(e) => update('fullName', e.target.value)}
              required
            />
            <Input
              label="Matricule"
              placeholder="UBa23E0001"
              value={form.matricule}
              onChange={(e) => update('matricule', e.target.value)}
              autoCapitalize="characters"
              required
            />
            <Input
              label="Gmail address"
              type="email"
              placeholder="you@gmail.com"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              required
            />
            <Input
              label="Department"
              placeholder="Software Engineering"
              value={form.department}
              onChange={(e) => update('department', e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#1F2937]">
                  Level
                </label>
                <select
                  value={form.level}
                  onChange={(e) => update('level', e.target.value)}
                  className="h-10 w-full rounded-md border border-[#DCE1E7] bg-white px-3 text-sm text-[#1F2937] focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                >
                  <option>Level 100</option>
                  <option>Level 200</option>
                  <option>Level 300</option>
                  <option>Level 400</option>
                  <option>Level 500</option>
                  <option>Masters</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#1F2937]">
                  Role
                </label>
                <select
                  value={form.role}
                  onChange={(e) => update('role', e.target.value as 'cc' | 'assistant')}
                  className="h-10 w-full rounded-md border border-[#DCE1E7] bg-white px-3 text-sm text-[#1F2937] focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                >
                  <option value="cc">CC</option>
                  <option value="assistant">Assistant CC</option>
                </select>
              </div>
            </div>

            <Input
              label="Password"
              type="password"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              required
            />

            {form.password && (
              <ul className="space-y-1 text-xs">
                {passwordChecks.map((check) => {
                  const ok = check.test(form.password);
                  return (
                    <li
                      key={check.label}
                      className={ok ? 'flex items-center gap-2 text-green-700' : 'flex items-center gap-2 text-[#6B7280]'}
                    >
                      {ok ? <Check size={14} /> : <X size={14} />} {check.label}
                    </li>
                  );
                })}
              </ul>
            )}

            <Input
              label="Confirm password"
              type="password"
              value={form.confirmPassword}
              onChange={(e) => update('confirmPassword', e.target.value)}
              error={
                form.confirmPassword && form.confirmPassword !== form.password
                  ? 'Passwords do not match'
                  : undefined
              }
              required
            />

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button type="submit" fullWidth size="lg" loading={submitting}>
              Create account
            </Button>
          </form>

          <div className="mt-6 border-t border-[#DCE1E7] pt-4 text-sm">
            <p className="text-[#6B7280]">
              Already registered?{' '}
              <Link to="/login" className="font-medium text-[#0F766E] hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}