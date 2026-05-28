import type { Metadata } from 'next';
import { Providers } from './providers';
import { ThemeProvider, themeInitScript } from '@/components/theme-provider';
import { Toaster } from 'sonner';
import './globals.css';

export const metadata: Metadata = {
  title: 'Qrder · Admin',
  description: 'Restaurant management dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Prevent flash of incorrect theme on initial paint */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeProvider>
          <Providers>{children}</Providers>
          <Toaster
            position="top-right"
            theme="system"
            richColors
            closeButton
            toastOptions={{
              style: {
                border: '1px solid rgb(var(--border))',
                background: 'rgb(var(--card))',
                color: 'rgb(var(--fg))',
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
