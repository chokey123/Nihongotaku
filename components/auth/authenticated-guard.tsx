'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'

import { useAuth } from '@/components/providers/auth-provider'

export function AuthenticatedGuard({
  children,
  hint,
}: {
  children: React.ReactNode
  hint: string
}) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const locale = pathname.split('/')[1] || 'zh'
  const loadingLabel =
    locale === 'en' ? 'Loading...' : locale === 'ja' ? '読み込み中...' : '載入中...'

  useEffect(() => {
    if (isLoading) return

    if (!user) {
      router.replace(`/${locale}/login`)
    }
  }, [isLoading, locale, router, user])

  if (isLoading) {
    return (
      <div className="glass-panel rounded-[32px] border border-border p-8">
        <p className="font-heading text-2xl font-bold">{loadingLabel}</p>
        <p className="mt-3 text-muted">{hint}</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return <>{children}</>
}
