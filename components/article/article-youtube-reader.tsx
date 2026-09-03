'use client'

import { useRef, useState } from 'react'

import { ReadonlyEditor } from '@/components/article/readonly-editor'

type ReaderLabels = {
  videoTitle: string
  timestampHint: string
  nowPlaying: string
}

export function ArticleYouTubeReader({
  content,
  title,
  videoId,
  labels,
}: {
  content: Record<string, unknown>
  title: string
  videoId: string
  labels: ReaderLabels
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [activeTimestamp, setActiveTimestamp] = useState<string | null>(null)

  const seekTo = (seconds: number, label: string) => {
    const playerWindow = iframeRef.current?.contentWindow

    if (!playerWindow) return

    playerWindow.postMessage(
      JSON.stringify({
        event: 'command',
        func: 'seekTo',
        args: [seconds, true],
      }),
      'https://www.youtube.com',
    )
    playerWindow.postMessage(
      JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
      'https://www.youtube.com',
    )
    setActiveTimestamp(label)
  }

  return (
    <div
      data-sticky-youtube-reader
      className="space-y-6 lg:grid lg:h-[calc(100dvh-1rem)] lg:grid-cols-2 lg:items-stretch lg:gap-6 lg:space-y-0"
    >
      <section className="sticky top-2 z-30 overflow-hidden rounded-[28px] border border-border bg-black shadow-xl lg:static lg:flex lg:h-full lg:items-center">
        <div className="aspect-video w-full">
          <iframe
            ref={(node) => {
              iframeRef.current = node
              if (node && !node.getAttribute('src')) {
                const origin = encodeURIComponent(window.location.origin)
                node.src = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&playsinline=1&rel=0&origin=${origin}`
              }
            }}
            className="h-full w-full"
            title={`${title} — ${labels.videoTitle}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </section>

      <div className="space-y-6 lg:h-full lg:overflow-y-auto lg:overscroll-contain lg:rounded-[28px] lg:border lg:border-border lg:bg-surface lg:p-6 lg:shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
          <p>{labels.timestampHint}</p>
          {activeTimestamp ? (
            <span
              aria-live="polite"
              className="rounded-full bg-brand-soft px-3 py-1 font-semibold text-brand-strong"
            >
              {labels.nowPlaying} {activeTimestamp}
            </span>
          ) : null}
        </div>

        <ReadonlyEditor content={content} onTimestampClick={seekTo} />
      </div>
    </div>
  )
}
