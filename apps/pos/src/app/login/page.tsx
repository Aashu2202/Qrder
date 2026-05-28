'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Sparkles, ArrowRight, Mail, Lock, Building2 } from 'lucide-react';
import { apiFetch, type ApiError } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { Button } from '@/components/ui/button';
import type { AuthUser } from '@/lib/types';

export default function PosLoginPage() {
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
      <div className="pointer-events-none absolute -top-40 -left-32 h-[28rem] w-[28rem] rounded-full bg-brand-300/30 blur-3xl dark:bg-brand-500/15" />
      <div className="pointer-events-none absolute -bottom-40 -right-32 h-[28rem] w-[28rem] rounded-full bg-amber-200/30 blur-3xl dark:bg-violet-500/15" />

      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-md space-y-5 rounded-3xl border border-zinc-200/60 bg-white/80 p-8 shadow-2xl backdrop-blur-xl dark:border-zinc-800/60 dark:bg-zinc-900/70"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-lg shadow-brand-600/40">
            <Building2 size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Qrder POS</h1>
            <p className="text-sm text-zinc-500 mt-0.5 flex items-center gap-1">
              <Sparkles size={12} /> Waiter & cashier workstation
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="email" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Email
          </label>
          <div className="relative">
            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              id="email"
              className="w-full h-12 rounded-xl border border-zinc-200 bg-white pl-10 pr-3 text-base text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
              type="email"
              placeholder="cashier@restaurant.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Password
          </label>
          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              id="password"
              className="w-full h-12 rounded-xl border border-zinc-200 bg-white pl-10 pr-12 text-base text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
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
              className="absolute right-3 top-1/2 -translate-y-1/2 grid h-8 w-8 place-items-center rounded text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {err && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300"
          >
            {err}
          </motion.div>
        )}

        <Button
          type="submit"
          variant="gradient"
          size="lg"
          loading={busy}
          rightIcon={!busy ? <ArrowRight size={16} /> : undefined}
          className="w-full rounded-xl"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </motion.form>
    </main>
  );
}
