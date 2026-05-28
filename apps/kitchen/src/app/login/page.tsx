'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ChefHat, ArrowRight, Mail, Lock } from 'lucide-react';
import { useAuth, type AuthUser } from '@/store/auth';
import { apiFetch, type ApiError } from '@/lib/api';

export default function KdsLoginPage() {
  const router = useRouter();
  const setSession = useAuth((s) => s.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const data = await apiFetch<{ accessToken: string; user: AuthUser }>('/v1/auth/login', {
        method: 'POST',
        json: { email, password },
      });
      setSession(data.accessToken, data.user);
      router.replace('/');
    } catch (e) {
      const ae = e as ApiError;
      setErr(ae.detail ?? ae.title ?? 'Login failed');
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen grid place-items-center p-6 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[28rem] w-[28rem] rounded-full bg-violet-500/15 blur-3xl" />

      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-sm space-y-5 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-7 shadow-2xl"
      >
        <div className="flex items-center gap-3 mb-1">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-lg shadow-brand-600/40">
            <ChefHat size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Kitchen Display</h1>
            <p className="text-xs" style={{ color: 'var(--color-kds-muted)' }}>
              Sign in to start cooking
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="email" className="text-xs font-medium text-zinc-300">
            Email
          </label>
          <div className="relative">
            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              id="email"
              className="w-full h-11 rounded-lg border border-white/10 bg-black/40 pl-9 pr-3 text-sm text-white placeholder:text-zinc-500 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
              type="email"
              placeholder="cook@restaurant.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-xs font-medium text-zinc-300">
            Password
          </label>
          <div className="relative">
            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              id="password"
              className="w-full h-11 rounded-lg border border-white/10 bg-black/40 pl-9 pr-10 text-sm text-white placeholder:text-zinc-500 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded text-zinc-500 hover:text-zinc-200"
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {err && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300"
          >
            {err}
          </motion.div>
        )}

        <button
          disabled={busy}
          className="w-full h-11 inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 text-white text-sm font-semibold shadow-lg shadow-brand-600/30 hover:shadow-xl hover:shadow-brand-600/40 transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {busy ? 'Signing in…' : (
            <>
              Sign in <ArrowRight size={15} />
            </>
          )}
        </button>
      </motion.form>
    </main>
  );
}
