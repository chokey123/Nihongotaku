'use client'

import Link from 'next/link'
import Image from 'next/image'

import type { MusicItem } from '@/lib/types'
import { useYoutubeThumbnail } from '@/components/ui/use-youtube-thumbnail'

export function MusicCard({
  item,
  locale,
  href,
  metaBadge,
}: {
  item: MusicItem
  locale: string
  href?: string
  metaBadge?: string
}) {
  const thumbnailUrl = useYoutubeThumbnail(item.youtubeId)

  return (
    <Link
      href={href ?? `/${locale}/music/${item.id}`}
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
        {/* <div className="absolute bottom-4 left-4 rounded-full bg-white/28 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
          {item.thumbnailLabel}
        </div> */}
        {/* <button
          type="button"
          className="absolute right-4 top-4 rounded-full bg-white/24 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm"
        >
          {item.favorite ? "♥" : "♡"}
        </button> */}
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
        {metaBadge ? (
          <p className="text-xs font-semibold text-brand-strong">{metaBadge}</p>
        ) : null}
      </div>
    </Link>
  )
}
