'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

import type { MusicItem } from '@/lib/types'
import { useYoutubeThumbnail } from '@/components/ui/use-youtube-thumbnail'

function AdminMusicLibraryCard({
  item,
  href,
  mode,
  quizLabel,
  publishedLabel,
  draftLabel,
}: {
  item: MusicItem
  href: string
  mode: 'music' | 'quiz'
  quizLabel: string
  publishedLabel: string
  draftLabel: string
}) {
  const thumbnailUrl = useYoutubeThumbnail(item.youtubeId)

  return (
    <Link
      href={href}
      className="glass-panel group flex flex-col overflow-hidden rounded-[28px] border border-border transition hover:-translate-y-1 hover:border-brand"
    >
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
        <div className="absolute bottom-4 left-4 rounded-full bg-white/28 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
          {item.thumbnailLabel}
        </div>
        {mode === 'quiz' ? (
          <div className="absolute right-4 top-4 rounded-full bg-white/24 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
            {item.quizVocabKeys.length} {quizLabel}
          </div>
        ) : (
          <div className="absolute right-4 top-4 rounded-full bg-white/24 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
            {item.isPublished ? publishedLabel : draftLabel}
          </div>
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
      </div>
    </Link>
  )
}

export function AdminMusicLibrary({
  items,
  locale,
  mode,
  searchPlaceholder,
  newLabel,
  publishedLabel,
  draftLabel,
  quizLabel,
}: {
  items: MusicItem[]
  locale: string
  mode: 'music' | 'quiz'
  searchPlaceholder: string
  newLabel: string
  publishedLabel: string
  draftLabel: string
  quizLabel: string
}) {
  const [query, setQuery] = useState('')

  const filteredItems = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return items

    return items.filter((item) =>
      [item.title, item.artist, item.genre].some((value) =>
        value.toLowerCase().includes(keyword),
      ),
    )
  }, [items, query])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchPlaceholder}
          className="w-full max-w-2xl rounded-full border border-border bg-surface px-5 py-3 text-sm outline-none transition focus:border-brand"
        />
        {mode === 'music' ? (
          <Link
            href={`/${locale}/admin/music/new`}
            className="rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white"
          >
            {newLabel}
          </Link>
        ) : null}
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filteredItems.map((item) => {
          const href =
            mode === 'music'
              ? `/${locale}/admin/music/${item.id}`
              : `/${locale}/admin/music/quiz/${item.id}`

          return (
            <AdminMusicLibraryCard
              key={item.id}
              item={item}
              href={href}
              mode={mode}
              quizLabel={quizLabel}
              publishedLabel={publishedLabel}
              draftLabel={draftLabel}
            />
          )
        })}
      </div>
    </div>
  )
}
