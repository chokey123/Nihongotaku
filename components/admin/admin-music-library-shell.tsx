'use client'

import { useEffect, useState } from 'react'

import { useAuth } from '@/components/providers/auth-provider'
import { AdminMusicLibrary } from '@/components/admin/admin-music-library'
import { backendService } from '@/lib/services/backend-service'
import type { MusicItem } from '@/lib/types'

export function AdminMusicLibraryShell({
  locale,
  mode,
  searchPlaceholder,
  loadingLabel,
  errorLabel,
  newLabel,
  publishedLabel,
  draftLabel,
  quizLabel,
}: {
  locale: string
  mode: 'music' | 'quiz'
  searchPlaceholder: string
  loadingLabel: string
  errorLabel: string
  newLabel: string
  publishedLabel: string
  draftLabel: string
  quizLabel: string
}) {
  const { user, isLoading } = useAuth()
  const [items, setItems] = useState<MusicItem[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    if (isLoading || user?.role !== 'admin') {
      return
    }

    let isMounted = true

    backendService
      .searchMusic('', { includeUnpublished: true })
      .then((nextItems) => {
        if (!isMounted) return
        setItems(nextItems)
        setStatus('ready')
      })
      .catch(() => {
        if (!isMounted) return
        setStatus('error')
      })

    return () => {
      isMounted = false
    }
  }, [isLoading, user?.role])

  if (isLoading || status === 'loading') {
    return (
        <div className="glass-panel rounded-[32px] border border-border p-6 text-sm text-muted">
        {loadingLabel}
      </div>
    )
  }

  if (status === 'error') {
    return (
        <div className="glass-panel rounded-[32px] border border-border p-6 text-sm text-red-600">
        {errorLabel}
      </div>
    )
  }

  return (
    <AdminMusicLibrary
      items={items}
      locale={locale}
      mode={mode}
      searchPlaceholder={searchPlaceholder}
      newLabel={newLabel}
      publishedLabel={publishedLabel}
      draftLabel={draftLabel}
      quizLabel={quizLabel}
    />
  )
}
