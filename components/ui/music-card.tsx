'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'

import { startNavigationFeedback } from '@/components/providers/navigation-feedback'
import type { MusicItem } from '@/lib/types'
import { useYoutubeThumbnail } from '@/components/ui/use-youtube-thumbnail'

const learnableVocabBadgeLabel = {
  zh: (count: number) => `${count}單詞`,
  ja: (count: number) => `${count}単語`,
  en: (count: number) => `${count} vocab`,
} as const

export function MusicCard({
  item,
  locale,
  href,
  metaBadge,
  disableLink = false,
}: {
  item: MusicItem
  locale: string
  href?: string
  metaBadge?: string
  disableLink?: boolean
}) {
  const router = useRouter()
  const thumbnailUrl = useYoutubeThumbnail(item.youtubeId)
  const normalizedLocale =
    locale === 'zh' || locale === 'ja' || locale === 'en' ? locale : 'zh'
  const learnableVocabCount = new Set(
    item.vocab.map((entry) => entry.word.trim().toLowerCase()).filter(Boolean),
  ).size
  const resolvedMetaBadge =
    metaBadge ??
    (learnableVocabCount > 0
      ? learnableVocabBadgeLabel[normalizedLocale](learnableVocabCount)
      : undefined)
  const detailHref = href ?? `/${locale}/music/${item.id}`
  const quizHref = `/${locale}/music/quiz/${item.id}`
  const canOpenQuizFromBadge = !metaBadge && learnableVocabCount > 0

  const content = (
    <>
      <div className="relative h-48 overflow-hidden">
        {thumbnailUrl ? (
          <>
            <Image
              src={thumbnailUrl}
              alt={`${item.title} thumbnail`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
          </>
        ) : (
          <>
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(135deg, ${item.palette.from}, ${item.palette.to})`,
              }}
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.35),transparent_28%)]" />
          </>
        )}
      </div>
      <div className="space-y-2 p-4">
        <p className="text-sm font-medium text-muted">{item.artist}</p>
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-heading text-xl font-bold tracking-tight">
            {item.title}
          </h3>
          <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-strong">
            {item.genre}
          </span>
        </div>
        {resolvedMetaBadge ? (
          canOpenQuizFromBadge ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                startNavigationFeedback()
                router.push(quizHref)
              }}
              className="text-left text-xs font-semibold text-brand-strong transition hover:text-brand"
            >
              {resolvedMetaBadge}
            </button>
          ) : (
            <p className="text-xs font-semibold text-brand-strong">
              {resolvedMetaBadge}
            </p>
          )
        ) : null}
      </div>
    </>
  )

  if (disableLink) {
    return (
      <article className="glass-panel flex flex-col overflow-hidden rounded-[28px] border border-border">
        {content}
      </article>
    )
  }

  return (
    <article
      role="link"
      tabIndex={0}
      onClick={() => {
        startNavigationFeedback()
        router.push(detailHref)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          startNavigationFeedback()
          router.push(detailHref)
        }
      }}
      className="glass-panel group flex flex-col overflow-hidden rounded-[28px] border border-border transition hover:-translate-y-1 hover:border-brand"
    >
      {content}
    </article>
  )
}
