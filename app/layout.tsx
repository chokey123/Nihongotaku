import type { Metadata } from 'next'
import Script from 'next/script'

import { getSiteUrl, siteName } from '@/lib/seo'

import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: `${siteName} - 日語歌詞與 JPOP 日語學習`,
    template: `%s | ${siteName}`,
  },
  description:
    '本站收錄日語歌曲歌詞、中文翻譯、單字卡與測驗，讓你用 JPOP 輕鬆學日語。',
  keywords: [
    '日語歌詞',
    '日文歌詞',
    'JPOP 歌詞',
    '日語歌曲',
    '日本歌曲歌詞',
    '用歌學日語',
    '日語單字',
    '歌詞翻譯',
  ],
  applicationName: siteName,
  verification: {
    google: 'e8Sreb47LDg3PN5dQrzvNHh0_AtjpS-vRv4-OmJvMy0',
  },
  openGraph: {
    type: 'website',
    siteName,
    locale: 'zh_TW',
    title: `${siteName} - 日語歌詞與 JPOP 日語學習`,
    description:
      '搜尋日語歌曲歌詞、中文翻譯與單字解析，用你喜歡的 JPOP 學日語。',
    url: getSiteUrl(),
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteName} - 日語歌詞與 JPOP 日語學習`,
    description:
      '搜尋日語歌曲歌詞、中文翻譯與單字解析，用你喜歡的 JPOP 學日語。',
  },
  alternates: {
    canonical: '/',
    languages: {
      ja: '/ja/home',
      en: '/en/home',
      'zh-TW': '/zh/home',
    },
  },
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
