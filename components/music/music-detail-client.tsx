'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'

import type { Dictionary } from '@/lib/i18n'
import type { Locale, LocalizedText, MusicItem } from '@/lib/types'
import { MusicCard } from '@/components/ui/music-card'

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
  const [hasTimelineStarted, setHasTimelineStarted] = useState(false)
  const playerRef = useRef<YoutubePlayer | null>(null)
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    const syncCurrentTime = (player: YoutubePlayer) => {
      try {
        const seconds = player.getCurrentTime()
        if (Number.isFinite(seconds)) {
          const nextMs = Math.floor(seconds * 1000)
          setCurrentMs(nextMs)
          if (nextMs > 0) {
            setHasTimelineStarted(true)
          }
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
      setHasTimelineStarted(false)
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
      setHasTimelineStarted(true)
    } catch {
      return
    }
  }

  return { currentMs, hasTimelineStarted, seekToMs }
}

function getLocalizedText(value: LocalizedText, locale: Locale) {
  return value[locale] ?? value.zh ?? value.en ?? value.ja ?? ''
}

function getVocabCardDensity({
  word,
  furigana,
  meaning,
  example,
  exampleTranslation,
}: {
  word: string
  furigana: string
  meaning: string
  example: string
  exampleTranslation: string
}) {
  const contentLength =
    word.length +
    furigana.length +
    meaning.length +
    example.length +
    exampleTranslation.length

  if (
    contentLength > 118 ||
    example.length > 48 ||
    exampleTranslation.length > 48
  ) {
    return 'tiny'
  }

  if (
    contentLength > 76 ||
    example.length > 32 ||
    exampleTranslation.length > 32
  ) {
    return 'compact'
  }

  return 'normal'
}

const sameArtistCopy = {
  zh: {
    eyebrow: '同歌手',
    title: (artist: string) => `${artist} 的更多歌曲`,
    description: '繼續聽同一位歌手的其他歌曲。',
  },
  en: {
    eyebrow: 'Same artist',
    title: (artist: string) => `More music by ${artist}`,
    description: 'Keep listening to more songs from this artist.',
  },
  ja: {
    eyebrow: '同じアーティスト',
    title: (artist: string) => `${artist} の他の曲`,
    description: '同じアーティストの曲を続けて聴けます。',
  },
} as const

const vocabPanelCopy = {
  zh: {
    notStarted: '歌曲還沒開始，單詞卡會跟著歌詞顯示。',
    noVocab: '這句歌詞目前沒有指定單詞卡。',
  },
  en: {
    notStarted:
      'The song has not started yet. Vocab cards will follow the lyrics.',
    noVocab: 'No vocab cards are assigned to this lyric line yet.',
  },
  ja: {
    notStarted:
      '曲はまだ始まっていません。単語カードは歌詞に合わせて表示されます。',
    noVocab: 'この歌詞にはまだ単語カードがありません。',
  },
} as const

export function MusicDetailClient({
  item,
  dict,
  locale,
  showQuizLink = true,
  sameArtistMusic = [],
}: {
  item: MusicItem
  dict: Dictionary
  locale: Locale
  showQuizLink?: boolean
  sameArtistMusic?: MusicItem[]
}) {
  const { currentMs, hasTimelineStarted, seekToMs } = useYoutubePlayer(
    item.youtubeId,
  )
  const lyricsContainerRef = useRef<HTMLDivElement | null>(null)
  const lyricLineRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const vocabScrollRef = useRef<HTMLDivElement | null>(null)
  const [vocabScrollState, setVocabScrollState] = useState({
    canScrollLeft: false,
    canScrollRight: false,
  })

  const activeLine = useMemo(() => {
    if (!hasTimelineStarted || item.lyrics.length === 0) {
      return null
    }

    const firstLine = item.lyrics[0]
    if (!firstLine || currentMs < firstLine.atMs) {
      return null
    }

    return (
      [...item.lyrics].reverse().find((line) => currentMs >= line.atMs) ?? null
    )
  }, [currentMs, hasTimelineStarted, item.lyrics])

  const selectedLine = activeLine
  const selectedLineVocabs = selectedLine
    ? item.vocab.filter((vocab) => vocab.lineId === selectedLine.id)
    : []
  const isSparseVocabPanel =
    selectedLineVocabs.length > 0 && selectedLineVocabs.length <= 2

  useEffect(() => {
    const container = lyricsContainerRef.current
    const activeCard = activeLine ? lyricLineRefs.current[activeLine.id] : null

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

  const syncVocabScrollState = useCallback(() => {
    const container = vocabScrollRef.current

    if (!container) {
      return
    }

    const maxScrollLeft = container.scrollWidth - container.clientWidth

    setVocabScrollState({
      canScrollLeft: container.scrollLeft > 1,
      canScrollRight: maxScrollLeft - container.scrollLeft > 1,
    })
  }, [])

  useEffect(() => {
    const container = vocabScrollRef.current

    if (!container) {
      return
    }

    container.scrollTo({ left: 0 })
    const frameId = window.requestAnimationFrame(syncVocabScrollState)

    return () => window.cancelAnimationFrame(frameId)
  }, [activeLine?.id, selectedLineVocabs.length, syncVocabScrollState])

  const scrollVocabCards = (direction: 'left' | 'right') => {
    const container = vocabScrollRef.current
    if (!container) return

    const cards = Array.from(container.children).filter(
      (child): child is HTMLElement => child instanceof HTMLElement,
    )
    if (cards.length === 0) return

    const maxScrollLeft = container.scrollWidth - container.clientWidth
    const currentIndex =
      container.scrollLeft <= 1
        ? 0
        : maxScrollLeft - container.scrollLeft <= 1
          ? cards.length - 1
          : cards.reduce((closestIndex, card, index) => {
              const visibleCenter =
                container.scrollLeft + container.clientWidth / 2
              const closestCard = cards[closestIndex]
              const cardCenter = card.offsetLeft + card.offsetWidth / 2
              const closestCenter =
                closestCard.offsetLeft + closestCard.offsetWidth / 2

              return Math.abs(cardCenter - visibleCenter) <
                Math.abs(closestCenter - visibleCenter)
                ? index
                : closestIndex
            }, 0)

    const nextIndex =
      direction === 'left'
        ? Math.max(0, currentIndex - 1)
        : Math.min(cards.length - 1, currentIndex + 1)
    const nextCard = cards[nextIndex]
    const nextLeft =
      nextCard.offsetLeft - (container.clientWidth - nextCard.offsetWidth) / 2

    container.scrollTo({
      left: Math.max(0, Math.min(maxScrollLeft, nextLeft)),
      behavior: 'smooth',
    })

    window.setTimeout(syncVocabScrollState, 260)
  }

  return (
    <div className="min-w-0 overflow-x-hidden space-y-12">
      <div className="min-w-0 space-y-6 overflow-x-hidden">
        <section className="glass-panel flex min-w-0 flex-col overflow-hidden rounded-[28px] border border-border p-4">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm text-muted">{item.artist}</p>
              <h1 className="font-heading text-3xl font-bold tracking-tight">
                {item.title}
              </h1>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {showQuizLink ? (
                <span className="text-sm font-semibold text-muted">
                  學會了嗎？
                </span>
              ) : null}
              {showQuizLink ? (
                <Link
                  href={`/${locale}/music/quiz/${item.id}`}
                  className="rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-strong hover:shadow-md"
                >
                  {dict.sections.quiz}
                </Link>
              ) : null}
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-4xl overflow-hidden rounded-[26px] border border-border lg:max-w-[1280px]">
            <div id="music-player-frame" className="aspect-video w-full" />
            {activeLine ? (
              <div className="pointer-events-none absolute inset-x-3 bottom-[18%] z-10 flex justify-center px-2 sm:inset-x-6 sm:bottom-[16%]">
                <div className="max-w-[92%] text-center">
                  <p className="text-base font-semibold leading-snug text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.8)] sm:text-xl">
                    {activeLine.japanese}
                  </p>
                  {getLocalizedText(activeLine.translation, locale) ? (
                    <p className="mt-1 text-xs leading-snug text-white/90 [text-shadow:0_1px_4px_rgba(0,0,0,0.8)] sm:text-sm">
                      {getLocalizedText(activeLine.translation, locale)}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
          <div className="mt-4 min-w-0 overflow-hidden rounded-[18px] border border-border bg-brand-soft/60 p-2.5 lg:mt-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-heading text-base font-bold">
                {dict.sections.vocab}
              </h2>
              <div className="flex items-center gap-2 text-xs text-muted">
                <span>{selectedLine?.timeLabel}</span>
              </div>
            </div>
            {selectedLineVocabs.length > 0 ? (
              <div className="group/vocab-scroll relative">
                {vocabScrollState.canScrollLeft ? (
                  <button
                    type="button"
                    onClick={() => scrollVocabCards('left')}
                    aria-label="Scroll vocab cards left"
                    className="absolute left-1 top-1/2 z-10 flex h-8 w-5 -translate-y-1/2 items-center justify-center bg-transparent text-2xl font-bold leading-none text-brand-strong opacity-80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] transition hover:scale-110 hover:opacity-100 focus:scale-110 focus:opacity-100"
                  >
                    ‹
                  </button>
                ) : null}
                <div
                  ref={vocabScrollRef}
                  onScroll={syncVocabScrollState}
                  className={`flex h-[136px] min-w-0 items-stretch gap-2 overflow-x-scroll overflow-y-hidden pb-3 [scrollbar-color:rgba(100,116,139,0.45)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-500/45 [&::-webkit-scrollbar-track]:bg-transparent sm:h-[132px] lg:h-[148px] ${
                    selectedLineVocabs.length === 1
                      ? 'justify-start sm:justify-center'
                      : 'justify-start'
                  }`}
                >
                  {selectedLineVocabs.map((vocab) => {
                    const meaning = getLocalizedText(vocab.meaning, locale)
                    const exampleTranslation = getLocalizedText(
                      vocab.exampleTranslation,
                      locale,
                    )
                    const density = getVocabCardDensity({
                      word: vocab.word,
                      furigana: vocab.furigana,
                      meaning,
                      example: vocab.example,
                      exampleTranslation,
                    })
                    const cardPadding = density === 'tiny' ? 'p-1.5' : 'p-2'
                    const wordClass = isSparseVocabPanel
                      ? density === 'tiny'
                        ? 'text-xs leading-tight'
                        : density === 'compact'
                          ? 'text-sm leading-tight'
                          : 'text-base leading-tight'
                      : density === 'tiny'
                        ? 'text-[11px] leading-tight'
                        : density === 'compact'
                          ? 'text-xs leading-tight'
                          : 'text-[15px] leading-tight'
                    const furiganaClass = isSparseVocabPanel
                      ? density === 'tiny'
                        ? 'text-[10px]'
                        : 'text-xs'
                      : density === 'tiny'
                        ? 'text-[10px]'
                        : density === 'compact'
                          ? 'text-[11px]'
                          : 'text-xs'
                    const bodyClass = isSparseVocabPanel
                      ? density === 'tiny'
                        ? 'text-[10px] leading-[1.08]'
                        : density === 'compact'
                          ? 'text-xs leading-tight'
                          : 'text-sm leading-snug'
                      : density === 'tiny'
                        ? 'text-[9px] leading-[1.05]'
                        : density === 'compact'
                          ? 'text-[11px] leading-tight'
                          : 'text-[13px] leading-snug'
                    const bodyGap = density === 'normal' ? 'gap-0.5' : 'gap-px'
                    const cardWidth = isSparseVocabPanel
                      ? selectedLineVocabs.length === 1
                        ? 'w-full max-w-[520px]'
                        : 'w-[min(78vw,420px)]'
                      : 'w-[220px] sm:w-[250px] lg:w-[270px]'

                    return (
                      <article
                        key={vocab.id}
                        className={`flex h-full ${cardWidth} max-sm:min-w-[220px] shrink-0 flex-col overflow-hidden rounded-[12px] bg-surface-strong ${cardPadding}`}
                      >
                        <div className="flex min-w-0 items-start justify-between gap-2">
                          <h3
                            className={`min-w-0 break-words font-heading font-bold ${wordClass}`}
                          >
                            {vocab.word}
                          </h3>
                          <span
                            className={`shrink-0 pt-0.5 text-muted ${furiganaClass}`}
                          >
                            {vocab.furigana}
                          </span>
                        </div>
                        <div
                          className={`mt-1 flex min-h-0 flex-1 flex-col justify-evenly ${bodyGap}`}
                        >
                          <p
                            className={`break-words font-semibold text-brand-strong ${bodyClass}`}
                          >
                            {meaning}
                          </p>
                          <p className={`break-words text-muted ${bodyClass}`}>
                            {vocab.example}
                          </p>
                          {exampleTranslation ? (
                            <p
                              className={`break-words text-muted/80 ${bodyClass}`}
                            >
                              {exampleTranslation}
                            </p>
                          ) : null}
                        </div>
                      </article>
                    )
                  })}
                </div>
                {vocabScrollState.canScrollRight ? (
                  <button
                    type="button"
                    onClick={() => scrollVocabCards('right')}
                    aria-label="Scroll vocab cards right"
                    className="absolute right-1 top-1/2 z-10 flex h-8 w-5 -translate-y-1/2 items-center justify-center bg-transparent text-2xl font-bold leading-none text-brand-strong opacity-80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] transition hover:scale-110 hover:opacity-100 focus:scale-110 focus:opacity-100"
                  >
                    ›
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="flex h-[136px] items-center justify-center rounded-[14px] border border-dashed border-border bg-surface-strong/80 px-4 text-center text-sm font-semibold text-muted sm:h-[132px] lg:h-[148px]">
                {selectedLine
                  ? vocabPanelCopy[locale].noVocab
                  : vocabPanelCopy[locale].notStarted}
              </div>
            )}
          </div>
        </section>

        <section className="glass-panel min-w-0 overflow-hidden rounded-[28px] border border-border p-4">
          <div className="mb-3 flex items-center justify-between gap-4">
            <h2 className="font-heading text-lg font-bold">
              {dict.sections.lyrics}
            </h2>
            <span className="text-xs text-muted">{activeLine?.timeLabel}</span>
          </div>
          <div
            ref={lyricsContainerRef}
            className="flex max-h-[680px] min-w-0 flex-col gap-2.5 overflow-y-auto overflow-x-hidden pr-1"
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
                  className={`min-w-0 max-w-full cursor-pointer select-text rounded-[18px] border p-3 text-left transition ${
                    isActive
                      ? 'border-brand bg-brand-soft shadow-sm'
                      : 'border-border bg-surface hover:border-brand'
                  }`}
                >
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-brand-strong">
                      {line.timeLabel}
                    </span>
                    <span className="text-muted">
                      {
                        item.vocab.filter((vocab) => vocab.lineId === line.id)
                          .length
                      }{' '}
                      {dict.sections.vocab}
                    </span>
                  </div>
                  <p className="break-words font-heading text-base font-bold">
                    {line.japanese}
                  </p>
                  <p className="mt-1.5 break-words text-sm leading-relaxed text-muted">
                    {getLocalizedText(line.translation, locale)}
                  </p>
                </div>
              )
            })}
          </div>
        </section>
      </div>

      {sameArtistMusic.length > 0 ? (
        <section className="min-w-0 space-y-5 overflow-hidden border-t border-border pt-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-strong">
              {sameArtistCopy[locale].eyebrow}
            </p>
            <h2 className="mt-2 font-heading text-2xl font-bold tracking-tight">
              {sameArtistCopy[locale].title(item.artist)}
            </h2>
            <p className="mt-2 text-sm text-muted">
              {sameArtistCopy[locale].description}
            </p>
          </div>
          <div className="flex min-w-0 gap-5 overflow-x-auto pb-3">
            {sameArtistMusic.map((music) => (
              <div
                key={music.id}
                className="w-[280px] shrink-0 sm:w-[320px] lg:w-[340px]"
              >
                <MusicCard item={music} locale={locale} />
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
