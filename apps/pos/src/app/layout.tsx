import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';
import { Providers } from './providers';
import { ThemeProvider, themeInitScript } from '@/components/theme-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Qrder POS',
  description: 'Waiter and cashier workstation',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeProvider>
          <Providers>{children}</Providers>
          <Toaster position="top-right" theme="system" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
