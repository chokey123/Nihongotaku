'use client'

import { useEffect, useMemo, useState } from 'react'

import { useAuth } from '@/components/providers/auth-provider'
import { backendService } from '@/lib/services/backend-service'
import type { Locale, MusicItem } from '@/lib/types'

export type MusicEditFlowSource = 'admin' | 'upload'

type EditableMusicStatus =
  | 'loading'
  | 'ready'
  | 'not-found'
  | 'error'
  | 'locked'

function resolveMusicFlowSource(
  preferredSource: string | undefined,
  isAdmin: boolean,
): MusicEditFlowSource {
  if (preferredSource === 'upload') {
    return 'upload'
  }

  if (preferredSource === 'admin' && isAdmin) {
    return 'admin'
  }

  return isAdmin ? 'admin' : 'upload'
}

export function useEditableMusicEntry({
  id,
  locale,
  preferredSource,
}: {
  id: string
  locale: Locale
  preferredSource?: string
}) {
  const { user, isLoading } = useAuth()
  const [music, setMusic] = useState<MusicItem | null>(null)
  const [status, setStatus] = useState<EditableMusicStatus>('loading')

  const flowSource = useMemo(
    () => resolveMusicFlowSource(preferredSource, user?.role === 'admin'),
    [preferredSource, user?.role],
  )

  useEffect(() => {
    if (isLoading || !user) {
      return
    }

    let isMounted = true

    backendService
      .getMusicById(id, { includeUnpublished: true })
      .then((item) => {
        if (!isMounted) {
          return
        }

        if (!item) {
          setStatus('not-found')
          return
        }

        if (user.role !== 'admin' && item.createdBy !== user.id) {
          setStatus('not-found')
          return
        }

        if (user.role !== 'admin' && item.isPublished) {
          setStatus('locked')
          return
        }

        setMusic(item)
        setStatus('ready')
      })
      .catch(() => {
        if (!isMounted) {
          return
        }

        setStatus('error')
      })

    return () => {
      isMounted = false
    }
  }, [id, isLoading, user])

  return {
    flowSource,
    isAuthLoading: isLoading,
    locale,
    music,
    setMusic,
    status,
    user,
    editHref: `/${locale}/${flowSource}/music/${id}`,
    lyricsHref: `/${locale}/music/lyrics/${id}?from=${flowSource}`,
    timelineHref: `/${locale}/music/timeline/${id}?from=${flowSource}`,
  }
}
