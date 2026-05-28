'use client';

import { motion } from 'framer-motion';
import { QrCode, Sparkles } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen grid place-items-center p-6 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-brand-300/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-amber-200/30 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 max-w-md w-full text-center space-y-6"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          className="mx-auto h-20 w-20 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 grid place-items-center text-white shadow-xl"
        >
          <QrCode size={36} strokeWidth={1.75} />
        </motion.div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Scan a QR to start
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-xs mx-auto">
            This page opens when you scan a Qrder QR sticker at a restaurant table. No app, no wait.
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
          <Sparkles size={12} />
          Powered by Qrder
        </div>
      </motion.div>
    </main>
  );
}
