'use client'

import { useEffect, useMemo, useState } from 'react'

import { useAuth } from '@/components/providers/auth-provider'
import { MusicCard } from '@/components/ui/music-card'
import { backendService } from '@/lib/services/backend-service'
import type { Dictionary } from '@/lib/i18n'
import type { MusicItem, WishRequestItem } from '@/lib/types'

function extractYoutubeId(value: string) {
  const normalized = value.trim()

  if (!normalized) return ''
  if (!normalized.includes('http')) return normalized

  try {
    const url = new URL(normalized)

    if (url.hostname.includes('youtu.be')) {
      return url.pathname.replace('/', '')
    }

    return url.searchParams.get('v') ?? ''
  } catch {
    return ''
  }
}

function buildWishMusicCardItems(items: WishRequestItem[]): MusicItem[] {
  return items.map((item, index) => ({
    id: item.id,
    title: item.title,
    artist: item.artist,
    genre: item.genre,
    favorite: false,
    thumbnailLabel: item.title,
    palette: {
      from: index % 2 === 0 ? '#ffd8c7' : '#c4e0ff',
      to: index % 2 === 0 ? '#ff8f70' : '#6b9cff',
      accent: '#ffffff',
    },
    youtubeId: extractYoutubeId(item.url),
    sourceUrl: item.url,
    lyrics: [],
    vocab: [],
    quizVocabKeys: [],
  }))
}

export function MyWishesSection({
  dict,
  locale,
}: {
  dict: Dictionary
  locale: string
}) {
  const { user, isLoading } = useAuth()
  const [items, setItems] = useState<WishRequestItem[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    'idle',
  )

  useEffect(() => {
    if (isLoading) {
      return
    }

    if (!user) {
      return
    }

    let isMounted = true
    Promise.resolve().then(() => {
      if (isMounted) {
        setStatus('loading')
      }
    })

    backendService
      .getWishRequests({ ownerId: user.id })
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
  }, [isLoading, user])

  useEffect(() => {
    if (!user) {
      return
    }

    const refreshWishes = () => {
      backendService
        .getWishRequests({ ownerId: user.id })
        .then((nextItems) => {
          setItems(nextItems)
          setStatus('ready')
        })
        .catch(() => {
          setStatus('error')
        })
    }

    window.addEventListener(
      'nihongotaku:wish-created',
      refreshWishes as EventListener,
    )

    return () => {
      window.removeEventListener(
        'nihongotaku:wish-created',
        refreshWishes as EventListener,
      )
    }
  }, [user])

  const cardItems = useMemo(() => buildWishMusicCardItems(items), [items])

  if (!user || status === 'idle') {
    return null
  }

  return (
    <section className="space-y-6">
      <h2 className="font-heading text-2xl font-bold">
        {locale === 'en' ? 'My Wishes' : locale === 'ja' ? 'わたしの願い' : '我的許願'}
      </h2>
      {status === 'loading' ? (
        <div className="glass-panel rounded-[32px] border border-border p-6 text-sm text-muted">
          {dict.status.loading}
        </div>
      ) : status === 'error' ? (
        <div className="glass-panel rounded-[32px] border border-border p-6 text-sm text-red-600">
          {locale === 'en'
            ? 'Failed to load your wishes.'
            : locale === 'ja'
              ? '願い一覧の読み込みに失敗しました。'
              : '載入你的許願失敗。'}
        </div>
      ) : cardItems.length === 0 ? (
        <div className="glass-panel rounded-[32px] border border-border p-6 text-sm text-muted">
          {locale === 'en'
            ? 'You have not wished for any songs yet.'
            : locale === 'ja'
              ? 'まだ許願した曲はありません。'
              : '你還沒有許願任何歌曲。'}
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {cardItems.map((item) => (
            <MusicCard
              key={item.id}
              item={item}
              locale={locale}
              disableLink
            />
          ))}
        </div>
      )}
    </section>
  )
}
