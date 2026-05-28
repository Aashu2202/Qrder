import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Qrder KDS',
  description: 'Kitchen Display System',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0b0b0e',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
        <Toaster position="top-right" theme="dark" richColors />
      </body>
    </html>
  );
}
