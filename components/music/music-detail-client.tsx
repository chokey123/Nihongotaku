'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'

import type { Dictionary } from '@/lib/i18n'
import type { Locale, LocalizedText, MusicItem } from '@/lib/types'

interface YoutubePlayer {
  destroy: () => void
  getCurrentTime: () => number
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void
}

interface YoutubePlayerEvent {
  data?: number
  target: YoutubePlayer
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string,
        config: {
          videoId: string
          height?: string
          width?: string
          playerVars?: Record<string, unknown>
          events?: {
            onReady?: (event: YoutubePlayerEvent) => void
            onStateChange?: (event: YoutubePlayerEvent) => void
          }
        },
      ) => YoutubePlayer
      PlayerState: {
        UNSTARTED: number
        ENDED: number
        PLAYING: number
        PAUSED: number
        BUFFERING: number
        CUED: number
      }
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

function useYoutubePlayer(videoId: string) {
  const [currentMs, setCurrentMs] = useState(0)
  const playerRef = useRef<YoutubePlayer | null>(null)
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    const syncCurrentTime = (player: YoutubePlayer) => {
      try {
        const seconds = player.getCurrentTime()
        if (Number.isFinite(seconds)) {
          setCurrentMs(Math.floor(seconds * 1000))
        }
      } catch {
        return
      }
    }

    const stopPolling = () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    const startPolling = () => {
      stopPolling()

      intervalRef.current = window.setInterval(() => {
        const player = playerRef.current
        if (!player) return
        syncCurrentTime(player)
      }, 300)
    }

    const handleReady = (event: YoutubePlayerEvent) => {
      playerRef.current = event.target
      setCurrentMs(0)
      startPolling()
      syncCurrentTime(event.target)
    }

    const handleStateChange = (event: YoutubePlayerEvent) => {
      if (!window.YT) return

      if (event.data === window.YT.PlayerState.PLAYING) {
        syncCurrentTime(event.target)
        return
      }

      if (
        event.data === window.YT.PlayerState.PAUSED ||
        event.data === window.YT.PlayerState.ENDED ||
        event.data === window.YT.PlayerState.BUFFERING ||
        event.data === window.YT.PlayerState.CUED
      ) {
        syncCurrentTime(event.target)
      }
    }

    const mountPlayer = () => {
      if (!window.YT?.Player) return

      stopPolling()
      playerRef.current?.destroy()
      playerRef.current = new window.YT.Player('music-player-frame', {
        height: '390',
        width: '640',
        videoId,
        playerVars: {
          playsinline: 1,
          rel: 0,
        },
        events: {
          onReady: handleReady,
          onStateChange: handleStateChange,
        },
      })
    }

    if (window.YT?.Player) {
      mountPlayer()
    } else {
      const existing = document.querySelector<HTMLScriptElement>(
        'script[src="https://www.youtube.com/iframe_api"]',
      )

      if (!existing) {
        const script = document.createElement('script')
        script.src = 'https://www.youtube.com/iframe_api'
        const firstScriptTag = document.getElementsByTagName('script')[0]
        if (firstScriptTag?.parentNode) {
          firstScriptTag.parentNode.insertBefore(script, firstScriptTag)
        } else {
          document.body.appendChild(script)
        }
      }

      window.onYouTubeIframeAPIReady = mountPlayer
    }

    return () => {
      stopPolling()
      playerRef.current?.destroy()
      playerRef.current = null
    }
  }, [videoId])

  const seekToMs = (nextMs: number) => {
    const player = playerRef.current
    if (!player) return

    try {
      player.seekTo(nextMs / 1000, true)
      setCurrentMs(nextMs)
    } catch {
      return
    }
  }

  return { currentMs, seekToMs }
}

function getLocalizedText(value: LocalizedText, locale: Locale) {
  return value[locale] ?? value.zh ?? value.en ?? value.ja ?? ''
}

export function MusicDetailClient({
  item,
  dict,
  locale,
  showQuizLink = true,
}: {
  item: MusicItem
  dict: Dictionary
  locale: Locale
  showQuizLink?: boolean
}) {
  const { currentMs, seekToMs } = useYoutubePlayer(item.youtubeId)
  const lyricsContainerRef = useRef<HTMLDivElement | null>(null)
  const lyricLineRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const activeLine = useMemo(() => {
    return (
      [...item.lyrics].reverse().find((line) => currentMs >= line.atMs) ??
      item.lyrics[0]
    )
  }, [currentMs, item.lyrics])

  const selectedLine = activeLine
  const selectedLineVocabs = selectedLine
    ? item.vocab.filter((vocab) => vocab.lineId === selectedLine.id)
    : []

  useEffect(() => {
    const container = lyricsContainerRef.current
    const activeCard = activeLine
      ? lyricLineRefs.current[activeLine.id]
      : null

    if (!container || !activeCard) return

    const containerRect = container.getBoundingClientRect()
    const cardRect = activeCard.getBoundingClientRect()
    const nextScrollTop =
      container.scrollTop +
      (cardRect.top - containerRect.top) -
      container.clientHeight / 2 +
      activeCard.clientHeight / 2

    container.scrollTo({
      top: Math.max(0, nextScrollTop),
      behavior: 'smooth',
    })
  }, [activeLine])

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] xl:grid-cols-[1.28fr_0.72fr]">
      <section className="glass-panel rounded-[32px] border border-border p-5">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted">{item.artist}</p>
            <h1 className="font-heading text-3xl font-bold tracking-tight">
              {item.title}
            </h1>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="rounded-full bg-brand-soft px-4 py-2 text-sm font-semibold text-brand-strong">
              {item.genre}
            </span>
            {showQuizLink ? (
              <Link
                href={`/${locale}/music/quiz/${item.id}`}
                className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold transition hover:border-brand"
              >
                {dict.sections.quiz}
              </Link>
            ) : null}
          </div>
        </div>
        <div className="mx-auto w-full max-w-sm overflow-hidden rounded-[26px] border border-border sm:max-w-xl md:max-w-2xl lg:max-w-none">
          <div
            id="music-player-frame"
            className="aspect-[4/3] w-full sm:aspect-video lg:aspect-[16/9]"
          />
        </div>
        {activeLine ? (
          <div className="mt-4 rounded-[24px] border border-border bg-surface p-4 lg:hidden">
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-brand-strong">
                {activeLine.timeLabel}
              </span>
              <span className="text-muted">{dict.sections.lyrics}</span>
            </div>
            <p className="font-heading text-lg font-bold">{activeLine.japanese}</p>
            <p className="mt-2 text-sm text-muted">
              {getLocalizedText(activeLine.translation, locale)}
            </p>
          </div>
        ) : null}
        <div className="mt-5 rounded-[24px] border border-border bg-brand-soft/60 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-heading text-lg font-bold">
              {dict.sections.vocab}
            </h2>
            <span className="text-sm text-muted">
              {selectedLine?.timeLabel}
            </span>
          </div>
          {selectedLineVocabs.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {selectedLineVocabs.map((vocab) => (
                <article
                  key={vocab.id}
                  className="rounded-[22px] bg-surface-strong p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-heading text-lg font-bold">
                      {vocab.word}
                    </h3>
                    <span className="text-sm text-muted">{vocab.furigana}</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-brand-strong">
                    {getLocalizedText(vocab.meaning, locale)}
                  </p>
                  <p className="mt-3 text-sm text-muted">{vocab.example}</p>
                  {getLocalizedText(vocab.exampleTranslation, locale) ? (
                    <p className="mt-2 text-sm text-muted/80">
                      {getLocalizedText(vocab.exampleTranslation, locale)}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-[22px] border border-dashed border-border bg-surface-strong px-4 py-6 text-sm text-muted">
              {dict.labels.noVocab}
            </div>
          )}
        </div>
      </section>

      <section className="glass-panel rounded-[32px] border border-border p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="font-heading text-xl font-bold">
            {dict.sections.lyrics}
          </h2>
          <span className="text-sm text-muted">{activeLine?.timeLabel}</span>
        </div>
        <div
          ref={lyricsContainerRef}
          className="flex max-h-[760px] flex-col gap-3 overflow-auto pr-1"
        >
          {item.lyrics.map((line) => {
            const isActive = activeLine?.id === line.id

            return (
              <div
                key={line.id}
                ref={(node) => {
                  lyricLineRefs.current[line.id] = node
                }}
                role="button"
                tabIndex={0}
                onClick={() => {
                  const selection = window.getSelection()
                  if (selection && !selection.isCollapsed) {
                    return
                  }

                  seekToMs(line.atMs)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    seekToMs(line.atMs)
                  }
                }}
                className={`cursor-pointer select-text rounded-[24px] border p-4 text-left transition ${
                  isActive
                    ? 'border-brand bg-brand-soft'
                    : 'border-border bg-surface hover:border-brand'
                } ${isActive ? 'translate-x-1 scale-[1.01]' : ''}`}
              >
                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold text-brand-strong">
                    {line.timeLabel}
                  </span>
                  <span className="text-muted">
                    {item.vocab.filter((vocab) => vocab.lineId === line.id).length}{' '}
                    {dict.sections.vocab}
                  </span>
                </div>
                <p className="font-heading text-lg font-bold">
                  {line.japanese}
                </p>
                <p className="mt-2 text-sm text-muted">
                  {getLocalizedText(line.translation, locale)}
                </p>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
