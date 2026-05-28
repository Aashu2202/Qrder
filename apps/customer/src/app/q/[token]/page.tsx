import { notFound } from 'next/navigation';
import { apiBase } from '@/lib/api';
import type { PublicMenu, PublicResolve } from '@/lib/types';
import { MenuView } from './menu-view';

interface PageProps {
  params: Promise<{ token: string }>;
}

async function loadInitial(token: string): Promise<{ resolved: PublicResolve; menu: PublicMenu } | null> {
  const [resolveRes, menuRes] = await Promise.all([
    fetch(`${apiBase}/q/${token}`, { cache: 'no-store' }),
    fetch(`${apiBase}/q/${token}/menu`, { cache: 'no-store' }),
  ]);
  if (!resolveRes.ok || !menuRes.ok) return null;
  return {
    resolved: (await resolveRes.json()) as PublicResolve,
    menu: (await menuRes.json()) as PublicMenu,
  };
}

export default async function QrMenuPage({ params }: PageProps) {
  const { token } = await params;
  const initial = await loadInitial(token);
  if (!initial) notFound();
  return <MenuView token={token} resolved={initial.resolved} initialMenu={initial.menu} />;
}
