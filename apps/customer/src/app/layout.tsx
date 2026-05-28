import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';
import { Providers } from './providers';
import { ThemeProvider, themeInitScript } from '@/components/theme-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Order',
  description: 'Scan, browse, order — no waiter needed.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafafa' },
    { media: '(prefers-color-scheme: dark)', color: '#09090b' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Prevent theme flash before React boots */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeProvider>
          <Providers>{children}</Providers>
          <Toaster position="top-center" theme="system" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
