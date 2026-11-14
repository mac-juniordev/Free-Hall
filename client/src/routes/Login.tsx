import { useState } from 'react';
import type {FormEvent} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useAuth } from '../stores/auth';
import { extractError } from '../lib/api';
import { Eye, EyeOff } from 'lucide-react';

export function LoginPage() {
  const [matricule, setMatricule] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuth((s) => s.login);
  const navigate = useNavigate();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(matricule.trim(), password);
      if (user.status === 'pending') {
        navigate('/pending', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F6F8]">
      {/* Brand header */}
      <header className="bg-[#111827] text-white">
        <div className="mx-auto max-w-md px-6 py-8">
          <h1 className="text-3xl font-bold tracking-tight">FreeHall</h1>
          <p className="mt-1 text-sm text-white/70">
            Find a hall before the lecturer arrives.
          </p>
        </div>
      </header>

      {/* Form */}
      <main className="mx-auto w-full max-w-md flex-1 px-6 py-8">
        <div className="rounded-lg border border-[#DCE1E7] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#1F2937]">Welcome back</h2>
          <p className="mt-1 text-sm text-[#6B7280]">
            Sign in with your matricule to see live hall availability.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <Input
              label="Matricule"
              name="matricule"
              placeholder="UBa23E0001"
              value={matricule}
              onChange={(e) => setMatricule(e.target.value)}
              autoComplete="username"
              autoCapitalize="characters"
              required
            />

            <div className="relative">
              <Input
                label="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-8 text-[#6B7280] hover:text-[#1F2937]"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button type="submit" fullWidth size="lg" loading={loading}>
              Sign in
            </Button>
          </form>

          <div className="mt-6 border-t border-[#DCE1E7] pt-4 text-sm">
            <p className="text-[#6B7280]">
              New CC?{' '}
              <Link to="/register" className="font-medium text-[#0F766E] hover:underline">
                Register here
              </Link>
            </p>
            <p className="mt-2">
              <Link to="/forgot-password" className="text-[#6B7280] hover:underline">
                Forgot password?
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}