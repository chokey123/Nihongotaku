import type { Metadata } from 'next'

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
      <body>{children}</body>
    </html>
  )
}
