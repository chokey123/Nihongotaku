import type { Metadata } from 'next'
import Script from 'next/script'

import './globals.css'

export const metadata: Metadata = {
  title: 'Nihongotaku',
  description:
    'Learn Japanese with JPOP through a playful minimalist interface.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh" suppressHydrationWarning>
      <body>
        <Script id="theme-init" strategy="beforeInteractive">{`
          (() => {
            const storageKey = 'nihongotaku-theme';
            const stored = window.localStorage.getItem(storageKey);
            const theme =
              stored === 'dark' || stored === 'light'
                ? stored
                : window.matchMedia('(prefers-color-scheme: dark)').matches
                  ? 'dark'
                  : 'light';

            document.documentElement.classList.toggle('dark', theme === 'dark');
            document.documentElement.style.colorScheme = theme;
          })();
        `}</Script>
        {children}
      </body>
    </html>
  )
}
