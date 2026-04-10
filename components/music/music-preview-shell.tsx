'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { useAuth } from '@/components/providers/auth-provider'
import { MusicDetailClient } from '@/components/music/music-detail-client'
import { backendService } from '@/lib/services/backend-service'
import type { Dictionary } from '@/lib/i18n'
import type { Locale, MusicDraftPayload, MusicItem } from '@/lib/types'

const previewLabels: Record<
  Locale,
  {
    previewTitle: string
    previewHint: string
    publish: string
  }
> = {
  zh: {
    previewTitle: '草稿預覽',
    previewHint: '這是尚未發佈的歌曲預覽，只有建立者可以查看。',
    publish: '發佈',
  },
  en: {
    previewTitle: 'Draft preview',
    previewHint: 'This unpublished song preview is only available to its creator.',
    publish: 'Publish',
  },
  ja: {
    previewTitle: '下書きプレビュー',
    previewHint:
      '未公開の楽曲プレビューです。作成者本人のみ閲覧できます。',
    publish: '公開',
  },
}

function toDraftPayload(item: MusicItem): MusicDraftPayload {
  return {
    sourceUrl: item.sourceUrl ?? `https://youtube.com/watch?v=${item.youtubeId}`,
    title: item.title,
    artist: item.artist,
    genre: item.genre,
    lyrics: item.lyrics,
    vocab: item.vocab,
    quizVocabKeys: item.quizVocabKeys,
  }
}

export function MusicPreviewShell({
  id,
  dict,
  locale,
}: {
  id: string
  dict: Dictionary
  locale: Locale
}) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [music, setMusic] = useState<MusicItem | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'not-found' | 'error'>(
    'loading',
  )
  const [isPublishing, startPublishing] = useTransition()
  const labels = useMemo(() => previewLabels[locale], [locale])

  useEffect(() => {
    if (isLoading) {
      return
    }

    if (!user) {
      router.replace(`/${locale}/home`)
      return
    }

    let isMounted = true

    backendService
      .getMusicById(id, { includeUnpublished: true })
      .then((item) => {
        if (!isMounted) return

        if (!item) {
          setStatus('not-found')
          return
        }

        if (!item.isPublished) {
          if (!item.createdBy || item.createdBy !== user.id) {
            router.replace(`/${locale}/home`)
            return
          }
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
  }, [id, isLoading, locale, router, user])

  if (isLoading || status === 'loading') {
    return (
      <div className="glass-panel rounded-[32px] border border-border p-6 text-sm text-muted">
        {dict.status.loadingMusicEntry}
      </div>
    )
  }

  if (status === 'not-found' || !music) {
    return (
      <div className="glass-panel rounded-[32px] border border-border p-6 text-sm text-muted">
        {dict.status.musicNotFound}
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="glass-panel rounded-[32px] border border-border p-6 text-sm text-red-600">
        {dict.status.failedMusicEntry}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="glass-panel flex flex-wrap items-center justify-between gap-4 rounded-[32px] border border-border p-5">
        <div>
          <h1 className="font-heading text-2xl font-bold">{labels.previewTitle}</h1>
          <p className="mt-1 text-sm text-muted">{labels.previewHint}</p>
        </div>
        {!music.isPublished ? (
          <button
            type="button"
            onClick={() =>
              startPublishing(async () => {
                await backendService.updateMusic(id, toDraftPayload(music), {
                  isPublished: true,
                })
                router.replace(`/${locale}/music/${id}`)
              })
            }
            disabled={isPublishing}
            className="rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white disabled:opacity-70"
          >
            {isPublishing ? '...' : labels.publish}
          </button>
        ) : null}
      </div>
      <MusicDetailClient item={music} dict={dict} locale={locale} />
    </div>
  )
}
