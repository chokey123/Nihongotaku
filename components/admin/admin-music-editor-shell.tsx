'use client'

import { useEffect, useState } from 'react'

import { AdminMusicForm } from '@/components/admin/admin-music-form'
import { useAuth } from '@/components/providers/auth-provider'
import { backendService } from '@/lib/services/backend-service'
import type { Dictionary } from '@/lib/i18n'
import type { Locale, MusicItem } from '@/lib/types'

export function AdminMusicEditorShell({
  dict,
  locale,
  mode,
  musicId,
  scope = 'admin',
  basePath = 'admin',
}: {
  dict: Dictionary
  locale: Locale
  mode: 'create' | 'edit'
  musicId?: string
  scope?: 'admin' | 'upload'
  basePath?: 'admin' | 'upload'
}) {
  const { user, isLoading } = useAuth()
  const copy = dict.status
  const [music, setMusic] = useState<MusicItem | undefined>()
  const [status, setStatus] = useState<'loading' | 'ready' | 'not-found' | 'error'>(
    mode === 'edit' ? 'loading' : 'ready',
  )

  useEffect(() => {
    if (
      mode !== 'edit' ||
      !musicId ||
      isLoading ||
      !user ||
      (scope === 'admin' && user.role !== 'admin')
    ) {
      return
    }

    let isMounted = true

    backendService
      .getMusicById(musicId, { includeUnpublished: true })
      .then((item) => {
        if (!isMounted) return

        if (!item) {
          setStatus('not-found')
          return
        }

        if (scope === 'upload' && user.role !== 'admin' && item.createdBy !== user.id) {
          setStatus('not-found')
          return
        }

        setMusic(item)
        setStatus('ready')
      })
      .catch(() => {
        if (!isMounted) return
        setStatus('error')
      })

    return () => {
      isMounted = false
    }
  }, [isLoading, mode, musicId, scope, user])

  if (isLoading || status === 'loading') {
    return (
      <div className="glass-panel rounded-[32px] border border-border p-6 text-sm text-muted">
        {copy.loadingMusicEntry}
      </div>
    )
  }

  if (status === 'not-found') {
    return (
      <div className="glass-panel rounded-[32px] border border-border p-6 text-sm text-muted">
        {copy.musicNotFound}
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="glass-panel rounded-[32px] border border-border p-6 text-sm text-red-600">
        {copy.failedMusicEntry}
      </div>
    )
  }

  return (
    <AdminMusicForm
      dict={dict}
      initialMusic={music}
      mode={mode}
      initialLocale={locale}
      basePath={basePath}
      canPublish={Boolean(user)}
    />
  )
}
