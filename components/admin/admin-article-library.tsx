'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

import type { ArticleItem } from '@/lib/types'

export function AdminArticleLibrary({
  items,
  locale,
  searchPlaceholder,
  newLabel,
  publishedLabel,
  draftLabel,
}: {
  items: ArticleItem[]
  locale: string
  searchPlaceholder: string
  newLabel: string
  publishedLabel: string
  draftLabel: string
}) {
  const [query, setQuery] = useState('')

  const filteredItems = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return items

    return items.filter((item) =>
      [item.title, item.artist, item.type].some((value) =>
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
        <Link
          href={`/${locale}/admin/article/new`}
          className="rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white"
        >
          {newLabel}
        </Link>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filteredItems.map((item) => (
          <Link
            key={item.id}
            href={`/${locale}/admin/article/${item.id}`}
            className="glass-panel group flex flex-col overflow-hidden rounded-[28px] border border-border transition hover:-translate-y-1 hover:border-brand"
          >
            <div className="relative h-48 overflow-hidden">
              {item.thumbnailUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.thumbnailUrl}
                    alt={item.title}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-transparent" />
                </>
              ) : (
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(135deg, ${item.palette.from}, ${item.palette.to})`,
                  }}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.35),transparent_28%)]" />
                </div>
              )}
              <div className="absolute right-4 top-4 rounded-full bg-white/24 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                {item.isPublished ? publishedLabel : draftLabel}
              </div>
            </div>
            <div className="space-y-2 p-4">
              <div className="flex items-center gap-2 text-xs text-muted">
                <span className="rounded-full bg-brand-soft px-3 py-1 font-semibold text-brand-strong">
                  {item.type}
                </span>
                <span>{item.artist}</span>
              </div>
              <h3 className="font-heading text-xl font-bold tracking-tight">
                {item.title}
              </h3>
              <p className="line-clamp-2 text-sm text-muted">{item.excerpt}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
