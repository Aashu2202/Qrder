'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginInput, type LoginInput } from '@qrder/shared';
import { apiFetch, type ApiError } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Sparkles, ArrowRight, Mail, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    tenantId: string;
    branchId: string | null;
    permissions: string[];
  };
}

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginInput),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginInput) => {
    setServerError(null);
    try {
      const data = await apiFetch<LoginResponse>('/v1/auth/login', {
        method: 'POST',
        json: values,
      });
      setSession(data.accessToken, data.user);
      router.push('/overview');
    } catch (err) {
      const apiErr = err as ApiError;
      setServerError(apiErr.detail ?? apiErr.title ?? 'Login failed');
    }
  };

  return (
    <main className="min-h-screen grid lg:grid-cols-2">
      <motion.aside
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="hidden lg:flex relative items-center justify-center overflow-hidden bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 text-white"
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 -right-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-amber-300/20 blur-3xl" />
        </div>
        <div className="relative z-10 max-w-md p-12">
          <div className="flex items-center gap-3 mb-12">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 backdrop-blur ring-1 ring-white/20">
              <Sparkles size={20} />
            </div>
            <span className="text-2xl font-bold tracking-tight">Qrder</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight leading-tight">
            Run your restaurant{' '}
            <span className="bg-gradient-to-r from-amber-200 to-orange-100 bg-clip-text text-transparent">
              like a SaaS.
            </span>
          </h1>
          <p className="mt-4 text-lg text-white/80 leading-relaxed">
            QR-first ordering, real-time kitchen, instant POS, payments, analytics —
            everything your team needs in one place.
          </p>

          <div className="mt-12 space-y-3">
            <Feature label="Diners scan, order, and pay without a waiter" />
            <Feature label="Live kitchen tickets in under 500ms" />
            <Feature label="Built-in Razorpay, multi-language menu" />
            <Feature label="Per-branch staff, audit logs, role-based access" />
          </div>
        </div>
      </motion.aside>

      <section className="flex items-center justify-center px-6 py-12 bg-white dark:bg-zinc-950">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="w-full max-w-sm"
        >
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 text-white">
              <Sparkles size={14} />
            </div>
            <span className="font-semibold tracking-tight text-lg">Qrder</span>
          </div>

          <div className="space-y-1.5 mb-8">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Welcome back
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Sign in to your dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
              >
                Email
              </label>
              <div className="relative">
                <Mail
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  className="w-full h-10 rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
              >
                Password
              </label>
              <div className="relative">
                <Lock
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full h-10 rounded-lg border border-zinc-200 bg-white pl-9 pr-10 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                  {...register('password')}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500">{errors.password.message}</p>
              )}
            </div>

            {serverError && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300"
              >
                {serverError}
              </motion.div>
            )}

            <Button
              type="submit"
              variant="gradient"
              size="lg"
              loading={isSubmitting}
              rightIcon={!isSubmitting ? <ArrowRight size={16} /> : undefined}
              className="w-full"
            >
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-6 text-xs text-zinc-500 text-center">
            Trouble signing in? Ask your tenant owner to reset your password.
          </p>
        </motion.div>
      </section>
    </main>
  );
}

function Feature({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2.5 text-sm text-white/90">
      <span className="grid h-5 w-5 place-items-center rounded-full bg-white/15">
        <svg
          width="11"
          height="11"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="4 11 8 15 16 5" />
        </svg>
      </span>
      {label}
    </div>
  );
}
