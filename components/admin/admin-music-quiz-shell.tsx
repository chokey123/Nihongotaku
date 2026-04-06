'use client'

import { useEffect, useState } from 'react'

import { useAuth } from '@/components/providers/auth-provider'
import { AdminMusicQuizForm } from '@/components/admin/admin-music-quiz-form'
import { backendService } from '@/lib/services/backend-service'
import type { Dictionary } from '@/lib/i18n'
import type { Locale, MusicItem, VocabItem } from '@/lib/types'

interface QuizSelectionEntry {
  key: string
  lineId: string
  lineTimeLabel: string
  lineJapanese: string
  vocab: VocabItem
}

export function AdminMusicQuizShell({
  musicId,
  locale,
  dict,
  scope = 'admin',
}: {
  musicId: string
  locale: Locale
  dict: Dictionary
  scope?: 'admin' | 'upload'
}) {
  const { user, isLoading } = useAuth()
  const copy = dict.status
  const [item, setItem] = useState<MusicItem | null>(null)
  const [entries, setEntries] = useState<QuizSelectionEntry[]>([])
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'not-found' | 'error'>(
    'loading',
  )

  useEffect(() => {
    if (isLoading || !user || (scope === 'admin' && user.role !== 'admin')) {
      return
    }

    let isMounted = true

    backendService
      .getMusicQuizSelection(musicId, { includeUnpublished: true })
      .then((selection) => {
        if (!isMounted) return
        if (!selection) {
          setStatus('not-found')
          return
        }

        if (
          scope === 'upload' &&
          user.role !== 'admin' &&
          selection.music.createdBy !== user.id
        ) {
          setStatus('not-found')
          return
        }

        setItem(selection.music)
        setEntries(selection.vocabEntries)
        setSelectedKeys(selection.selectedKeys)
        setStatus('ready')
      })
      .catch(() => {
        if (!isMounted) return
        setStatus('error')
      })

    return () => {
      isMounted = false
    }
  }, [isLoading, musicId, scope, user])

  if (isLoading || status === 'loading') {
    return (
        <div className="glass-panel rounded-[32px] border border-border p-6 text-sm text-muted">
        {copy.loadingQuizSetup}
      </div>
    )
  }

  if (status === 'not-found' || !item) {
    return (
        <div className="glass-panel rounded-[32px] border border-border p-6 text-sm text-muted">
        {copy.musicNotFound}
      </div>
    )
  }

  if (status === 'error') {
    return (
        <div className="glass-panel rounded-[32px] border border-border p-6 text-sm text-red-600">
        {copy.failedQuizSetup}
      </div>
    )
  }

  return (
    <AdminMusicQuizForm
      item={item}
      entries={entries}
      initialSelectedKeys={selectedKeys}
      locale={locale}
    />
  )
}
