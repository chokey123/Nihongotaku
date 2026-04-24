'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type UIEvent } from 'react'
import Link from 'next/link'

import type { Dictionary } from '@/lib/i18n'
import type {
  Locale,
  LocalizedText,
  MusicItem,
  MusicSearchPage,
  MusicVocabItem,
} from '@/lib/types'
import { MusicCard } from '@/components/ui/music-card'

interface YoutubePlayer {
  destroy: () => void
  getCurrentTime: () => number
  pauseVideo: () => void
  playVideo: () => void
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
  const [isPlaying, setIsPlaying] = useState(false)
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
      setIsPlaying(false)
      startPolling()
      syncCurrentTime(event.target)
    }

    const handleStateChange = (event: YoutubePlayerEvent) => {
      if (!window.YT) return

      if (event.data === window.YT.PlayerState.PLAYING) {
        setIsPlaying(true)
        syncCurrentTime(event.target)
        return
      }

      if (
        event.data === window.YT.PlayerState.PAUSED ||
        event.data === window.YT.PlayerState.ENDED ||
        event.data === window.YT.PlayerState.CUED
      ) {
        setIsPlaying(false)
        syncCurrentTime(event.target)
      }

      if (event.data === window.YT.PlayerState.BUFFERING) {
        syncCurrentTime(event.target)
      }
    }

    const mountPlayer = () => {
      if (!window.YT?.Player) return

      stopPolling()
      playerRef.current?.destroy()
      playerRef.current = new window.YT.Player('music-player-frame', {
        height: '480',
        width: '1080',
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

  const togglePlayPause = () => {
    const player = playerRef.current
    if (!player) return

    try {
      if (isPlaying) {
        player.pauseVideo()
        setIsPlaying(false)
        return
      }

      player.playVideo()
      setIsPlaying(true)
    } catch {
      return
    }
  }

  const play = () => {
    const player = playerRef.current
    if (!player) return

    try {
      player.playVideo()
      setIsPlaying(true)
    } catch {
      return
    }
  }

  return {
    currentMs,
    hasTimelineStarted,
    isPlaying,
    play,
    seekToMs,
    togglePlayPause,
  }
}

function getLocalizedText(value: LocalizedText, locale: Locale) {
  return value[locale] ?? value.zh ?? value.en ?? value.ja ?? ''
}

function getExternalHref(value: string) {
  const trimmed = value.trim()

  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed

  return `https://${trimmed}`
}

function getWishPromptCopy(locale: Locale) {
  if (locale === 'en') {
    return {
      title: 'Want another song?',
      action: 'Make a wish',
    }
  }

  if (locale === 'ja') {
    return {
      title: '次に聴きたい曲はありますか？',
      action: 'リクエストする',
    }
  }

  return {
    title: '還想聽別的歌？',
    action: '去許願',
  }
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

const recommendedCopy = {
  zh: {
    eyebrow: '推薦觀看',
    title: '查看更多日語歌曲',
    description: '優先推薦同曲風，沒有的話就從最新發布裡挑給你。',
  },
  en: {
    eyebrow: 'Recommended',
    title: 'Try these next',
    description:
      'Genre matches come first, then the latest published songs fill the list.',
  },
  ja: {
    eyebrow: 'おすすめ',
    title: '次に聴くならこちら',
    description:
      'まず同じジャンルから選び、足りない分は最新公開曲からおすすめします。',
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

const MUSIC_RAIL_BATCH_SIZE = 6
const RELATED_MUSIC_FETCH_LIMIT = 24
const RECOMMENDED_MUSIC_LIMIT = 12

function MusicRail({
  eyebrow,
  title,
  description,
  items,
  locale,
  isLoading = false,
  emptyMessage,
}: {
  eyebrow: string
  title: string
  description?: string
  items: MusicItem[]
  locale: Locale
  isLoading?: boolean
  emptyMessage?: string
}) {
  const [visibleCount, setVisibleCount] = useState(MUSIC_RAIL_BATCH_SIZE)

  const visibleItems = useMemo(
    () => items.slice(0, visibleCount),
    [items, visibleCount],
  )

  const handleScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      const container = event.currentTarget
      const remaining =
        container.scrollWidth - container.clientWidth - container.scrollLeft

      if (remaining > 80 || visibleCount >= items.length) {
        return
      }

      setVisibleCount((current) =>
        Math.min(current + MUSIC_RAIL_BATCH_SIZE, items.length),
      )
    },
    [items.length, visibleCount],
  )

  return (
    <section className="min-w-0 space-y-5 overflow-hidden border-t border-border pt-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-strong">
          {eyebrow}
        </p>
        <h2 className="mt-2 font-heading text-2xl font-bold tracking-tight">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 text-sm text-muted">{description}</p>
        ) : null}
      </div>
      {isLoading ? (
        <div className="flex min-w-0 gap-5 overflow-x-auto pb-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`music-rail-loading-${index}`}
              className="h-[316px] w-[280px] shrink-0 rounded-[22px] border border-border/80 bg-surface p-4 shadow-sm sm:w-[320px] lg:w-[340px]"
            >
              <div className="h-1/2 rounded-[16px] bg-brand-soft/30" />
              <div className="mt-4 space-y-3">
                <div className="h-4 w-24 rounded-full bg-border/70" />
                <div className="h-6 w-3/4 rounded-full bg-border/70" />
                <div className="h-4 w-2/3 rounded-full bg-border/60" />
                <div className="h-4 w-20 rounded-full bg-border/50" />
              </div>
            </div>
          ))}
        </div>
      ) : visibleItems.length > 0 ? (
        <div
          className="flex min-w-0 gap-5 overflow-x-auto pb-3"
          onScroll={handleScroll}
        >
          {visibleItems.map((music) => (
            <div
              key={music.id}
              className="h-[316px] w-[280px] shrink-0 sm:h-[316px] sm:w-[320px] lg:h-[316px] lg:w-[340px]"
            >
              <MusicCard item={music} locale={locale} fixedSplit />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex h-[140px] items-center rounded-[20px] border border-dashed border-border bg-surface/60 px-5 text-sm text-muted">
          {emptyMessage ?? 'No music available yet.'}
        </div>
      )}
    </section>
  )
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
  const wishPromptCopy = getWishPromptCopy(locale)
  const {
    currentMs,
    hasTimelineStarted,
    isPlaying,
    play,
    seekToMs,
    togglePlayPause,
  } = useYoutubePlayer(item.youtubeId)
  const lyricsContainerRef = useRef<HTMLDivElement | null>(null)
  const lyricLineRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const playerShellRef = useRef<HTMLDivElement | null>(null)
  const vocabReviewRef = useRef<HTMLElement | null>(null)
  const relatedMusicTriggerRef = useRef<HTMLDivElement | null>(null)
  const vocabScrollRef = useRef<HTMLDivElement | null>(null)
  const controlsFadeTimeoutRef = useRef<number | null>(null)
  const [selectedReviewVocabIds, setSelectedReviewVocabIds] = useState<
    string[]
  >([])
  const [playerInteractionActive, setPlayerInteractionActive] = useState(false)
  const [sameArtistMusic, setSameArtistMusic] = useState<MusicItem[]>([])
  const [recommendedMusic, setRecommendedMusic] = useState<MusicItem[]>([])
  const [shouldLoadRelatedMusic, setShouldLoadRelatedMusic] = useState(false)
  const [hasLoadedRelatedMusic, setHasLoadedRelatedMusic] = useState(false)
  const [vocabScrollState, setVocabScrollState] = useState({
    canScrollLeft: false,
    canScrollRight: false,
  })
  const playerControlsVisible = !isPlaying || playerInteractionActive

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
  const lyricById = useMemo(
    () => new Map(item.lyrics.map((line) => [line.id, line])),
    [item.lyrics],
  )
  const defaultReviewVocabs = useMemo(() => {
    const byDifficulty = {
      hard: item.vocab.filter((vocab) => vocab.difficulty === 'hard'),
      intermediate: item.vocab.filter(
        (vocab) => vocab.difficulty === 'intermediate',
      ),
      beginner: item.vocab.filter((vocab) => vocab.difficulty === 'beginner'),
    }

    return [
      ...byDifficulty.hard,
      ...byDifficulty.intermediate,
      ...byDifficulty.beginner,
    ].slice(0, 10)
  }, [item.vocab])
  const selectedReviewVocabs = useMemo(() => {
    const vocabById = new Map(item.vocab.map((vocab) => [vocab.id, vocab]))

    return selectedReviewVocabIds
      .map((id) => vocabById.get(id))
      .filter((vocab): vocab is MusicVocabItem => Boolean(vocab))
  }, [item.vocab, selectedReviewVocabIds])
  const reviewVocabs =
    selectedReviewVocabs.length > 0 ? selectedReviewVocabs : defaultReviewVocabs
  const hasUserSelectedReviewVocabs = selectedReviewVocabs.length > 0
  // Keep the old below-player vocab panel parked while vocab lives on the video.
  const showInlineVocabPanel = false
  const isRoomyVocabPanel =
    selectedLineVocabs.length > 0 && selectedLineVocabs.length <= 4
  const activeLineIndex = activeLine
    ? item.lyrics.findIndex((line) => line.id === activeLine.id)
    : -1
  const canSeekPreviousLine = activeLineIndex > 0
  const canSeekNextLine =
    item.lyrics.length > 0 && activeLineIndex < item.lyrics.length - 1

  const toggleReviewVocab = (vocabId: string) => {
    setSelectedReviewVocabIds((current) =>
      current.includes(vocabId)
        ? current.filter((id) => id !== vocabId)
        : [...current, vocabId],
    )
  }

  const seekRelativeLine = (direction: 'previous' | 'next') => {
    if (item.lyrics.length === 0) return

    const nextIndex =
      direction === 'previous'
        ? Math.max(0, activeLineIndex - 1)
        : activeLineIndex === -1
          ? 0
          : Math.min(item.lyrics.length - 1, activeLineIndex + 1)
    const nextLine = item.lyrics[nextIndex]

    if (nextLine) {
      seekToMs(nextLine.atMs)
    }
  }

  const playLyricLine = (lineAtMs: number) => {
    seekToMs(lineAtMs)
    play()
    document
      .getElementById('music-player-frame')
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

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

  useEffect(() => {
    const trigger = relatedMusicTriggerRef.current

    if (!trigger || shouldLoadRelatedMusic) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) {
          return
        }

        setShouldLoadRelatedMusic(true)
        observer.disconnect()
      },
      {
        rootMargin: '0px 0px 320px 0px',
        threshold: 0.01,
      },
    )

    observer.observe(trigger)

    return () => {
      observer.disconnect()
    }
  }, [shouldLoadRelatedMusic])

  useEffect(() => {
    if (!shouldLoadRelatedMusic || hasLoadedRelatedMusic) {
      return
    }

    let cancelled = false

    const fetchMusicPage = async (params: URLSearchParams) => {
      const response = await fetch(`/api/music?${params.toString()}`, {
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch music page: ${response.status}`)
      }

      return (await response.json()) as MusicSearchPage
    }

    const loadRelatedMusic = async () => {
      try {
        const sameArtistParams = new URLSearchParams({
          artist: item.artist,
          limit: String(RELATED_MUSIC_FETCH_LIMIT),
        })
        const latestParams = new URLSearchParams({
          limit: String(RELATED_MUSIC_FETCH_LIMIT),
        })

        const requests: [
          Promise<MusicSearchPage>,
          Promise<MusicSearchPage>,
          Promise<MusicSearchPage>,
        ] = [
          fetchMusicPage(sameArtistParams),
          item.genre
            ? fetchMusicPage(
                new URLSearchParams({
                  genre: item.genre,
                  limit: String(RELATED_MUSIC_FETCH_LIMIT),
                }),
              )
            : Promise.resolve({
                items: [],
                total: 0,
                offset: 0,
                limit: RELATED_MUSIC_FETCH_LIMIT,
                hasMore: false,
              }),
          fetchMusicPage(latestParams),
        ]

        const [sameArtistPage, sameGenrePage, latestPage] =
          await Promise.all(requests)

        if (cancelled) {
          return
        }

        const nextSameArtistMusic = sameArtistPage.items
          .filter((entry) => entry.id !== item.id)
          .slice(0, RELATED_MUSIC_FETCH_LIMIT)

        const excludedMusicIds = new Set([
          item.id,
          ...nextSameArtistMusic.map((entry) => entry.id),
        ])

        const nextRecommendedMusic = [
          ...sameGenrePage.items.filter((entry) => !excludedMusicIds.has(entry.id)),
          ...latestPage.items.filter((entry) => !excludedMusicIds.has(entry.id)),
        ]
          .filter(
            (entry, index, array) =>
              array.findIndex((candidate) => candidate.id === entry.id) === index,
          )
          .slice(0, RECOMMENDED_MUSIC_LIMIT)

        setSameArtistMusic(nextSameArtistMusic)
        setRecommendedMusic(nextRecommendedMusic)
      } catch {
        if (!cancelled) {
          setSameArtistMusic([])
          setRecommendedMusic([])
        }
      } finally {
        if (!cancelled) {
          setHasLoadedRelatedMusic(true)
        }
      }
    }

    void loadRelatedMusic()

    return () => {
      cancelled = true
    }
  }, [hasLoadedRelatedMusic, item.artist, item.genre, item.id, shouldLoadRelatedMusic])

  useEffect(() => {
    const shell = playerShellRef.current

    if (!shell) {
      return
    }

    const hideControls = () => {
      if (controlsFadeTimeoutRef.current !== null) {
        window.clearTimeout(controlsFadeTimeoutRef.current)
        controlsFadeTimeoutRef.current = null
      }

      setPlayerInteractionActive(false)
    }

    const showControls = () => {
      setPlayerInteractionActive(true)

      if (controlsFadeTimeoutRef.current !== null) {
        window.clearTimeout(controlsFadeTimeoutRef.current)
      }

      controlsFadeTimeoutRef.current = window.setTimeout(() => {
        setPlayerInteractionActive(false)
        controlsFadeTimeoutRef.current = null
      }, 3200)
    }

    const handlePointerDown = () => {
      showControls()
    }

    const handleTouchStart = () => {
      showControls()
    }

    const handleClick = () => {
      showControls()
    }

    const handleFocusIn = () => {
      showControls()
    }

    const handleDocumentClick = (event: MouseEvent) => {
      if (shell.contains(event.target as Node | null)) {
        showControls()
        return
      }

      hideControls()
    }

    const handleWindowBlur = () => {
      window.setTimeout(() => {
        const activeElement = document.activeElement

        if (activeElement instanceof HTMLIFrameElement) {
          showControls()
        }
      }, 0)
    }

    const iframe = shell.querySelector('iframe')

    shell.addEventListener('pointerdown', handlePointerDown)
    shell.addEventListener('touchstart', handleTouchStart, { passive: true })
    shell.addEventListener('click', handleClick)
    shell.addEventListener('focusin', handleFocusIn)
    document.addEventListener('click', handleDocumentClick, true)
    window.addEventListener('blur', handleWindowBlur)
    iframe?.addEventListener('focus', handleFocusIn)

    return () => {
      shell.removeEventListener('pointerdown', handlePointerDown)
      shell.removeEventListener('touchstart', handleTouchStart)
      shell.removeEventListener('click', handleClick)
      shell.removeEventListener('focusin', handleFocusIn)
      document.removeEventListener('click', handleDocumentClick, true)
      window.removeEventListener('blur', handleWindowBlur)
      iframe?.removeEventListener('focus', handleFocusIn)

      hideControls()
    }
  }, [])

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
        <section className="flex min-w-0 flex-col overflow-hidden">
          <div className="mb-4 flex items-end gap-4">
            <div>
              <p className="text-sm text-muted">{item.artist}</p>
              <h1 className="font-heading text-3xl font-bold tracking-tight">
                {item.title}
              </h1>
            </div>
            <div className="hidden">
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
          {item.lyricsSourceText || item.lyricsSourceUrl ? (
            <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
              <span
                className="h-8 w-1 rounded-full bg-brand"
                aria-hidden="true"
              />
              <span className="font-semibold text-foreground">
                {locale === 'en'
                  ? 'Lyrics source'
                  : locale === 'ja'
                    ? '歌詞の出典'
                    : '歌詞來源'}
              </span>
              {item.lyricsSourceText ? (
                <span className="font-medium">{item.lyricsSourceText}</span>
              ) : null}
              {item.lyricsSourceUrl ? (
                <a
                  href={getExternalHref(item.lyricsSourceUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-brand-strong underline decoration-brand/40 underline-offset-4 transition hover:text-brand"
                >
                  {locale === 'en'
                    ? 'Open source'
                    : locale === 'ja'
                      ? '出典を開く'
                      : '查看來源'}
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M7 17 17 7" />
                    <path d="M9 7h8v8" />
                  </svg>
                </a>
              ) : null}
            </div>
          ) : null}
          <div className="mb-2 flex justify-end text-md font-semibold text-muted">
            <span>
              已加入 {selectedReviewVocabs.length} 個單詞到
              <button
                type="button"
                onClick={() =>
                  vocabReviewRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                  })
                }
                className="ml-1 font-bold text-brand-strong underline decoration-brand/40 underline-offset-4 transition hover:text-brand"
              >
                回顧
              </button>
            </span>
          </div>
          <div
            ref={playerShellRef}
            className="relative mx-auto w-full max-w-4xl overflow-hidden rounded-[26px] border border-border lg:max-w-[1280px]"
          >
            <div id="music-player-frame" className="aspect-video w-full" />
            {selectedLineVocabs.length > 0 ? (
              <div className="pointer-events-none absolute left-2 top-[42%] z-20 flex max-h-[58%] max-w-[56%] -translate-y-1/2 flex-col gap-1.5 overflow-hidden px-1 py-1 sm:left-4 sm:top-[44%] sm:max-h-[60%] sm:max-w-[292px]">
                {selectedLineVocabs.map((vocab) => {
                  const overlayMeaning = getLocalizedText(vocab.meaning, 'zh')
                  const isSelectedForReview = selectedReviewVocabIds.includes(
                    vocab.id,
                  )

                  return (
                    <button
                      type="button"
                      key={vocab.id}
                      onClick={(event) => {
                        event.stopPropagation()
                        toggleReviewVocab(vocab.id)
                      }}
                      aria-label={`${isSelectedForReview ? 'Remove' : 'Add'} ${vocab.word} ${isSelectedForReview ? 'from' : 'to'} vocab review`}
                      title="點一下加入單詞回顧"
                      className={`pointer-events-auto relative w-full rounded-[12px] border border-white/15 border-l-2 border-l-brand py-1.5 pl-2.5 pr-7 text-left shadow-[0_6px_22px_rgba(0,0,0,0.14)] backdrop-blur-[2px] transition hover:-translate-y-0.5 hover:border-brand/70 hover:bg-neutral-900/38 focus:outline-none focus:ring-2 focus:ring-brand/70 ${
                        isSelectedForReview
                          ? 'bg-neutral-950/45 ring-1 ring-brand/60'
                          : 'bg-neutral-900/20'
                      }`}
                    >
                      <span className="absolute right-1.5 top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand/90 text-white shadow-sm transition hover:bg-brand">
                        {isSelectedForReview ? (
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            className="h-3.5 w-3.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="m5 12 4 4L19 6" />
                          </svg>
                        ) : (
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            className="h-3.5 w-3.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M12 5v14" />
                            <path d="M5 12h14" />
                          </svg>
                        )}
                      </span>
                      {false ? (
                        <span>{isSelectedForReview ? '已加入' : '點選'}</span>
                      ) : null}
                      {vocab.furigana ? (
                        <p className="break-words text-[10px] font-semibold leading-tight text-white/82 [text-shadow:0_1px_3px_rgba(0,0,0,0.65)] sm:text-[11px]">
                          {vocab.furigana}
                        </p>
                      ) : null}
                      <p className="break-words font-heading text-sm font-bold leading-tight text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.72)] sm:text-base">
                        {vocab.word}
                      </p>
                      {overlayMeaning ? (
                        <p className="mt-0.5 break-words text-[11px] font-bold leading-snug text-brand [text-shadow:0_1px_3px_rgba(0,0,0,0.7)] sm:text-xs">
                          {overlayMeaning}
                        </p>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            ) : null}
            {activeLine ? (
              <div
                className={`pointer-events-none absolute inset-x-3 z-10 flex justify-center px-2 transition-all duration-300 sm:inset-x-6 ${
                  playerControlsVisible
                    ? 'bottom-[22%] sm:bottom-[20%]'
                    : 'bottom-[7%] sm:bottom-[6%]'
                }`}
              >
                <div className="max-w-[92%] rounded-[14px] border border-white/10 border-l-2 border-l-brand bg-black/28 px-4 py-2.5 text-center backdrop-blur-[2px]">
                  <p className="text-base font-semibold leading-snug text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.8)] sm:text-xl">
                    {activeLine.japanese}
                  </p>
                  {getLocalizedText(activeLine.translation, locale) ? (
                    <p className="mt-1 text-base leading-snug text-white/90 [text-shadow:0_1px_4px_rgba(0,0,0,0.8)] sm:text-xl">
                      {getLocalizedText(activeLine.translation, locale)}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
          <div className="mt-3 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => seekRelativeLine('previous')}
              disabled={!canSeekPreviousLine}
              aria-label="上一句"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-foreground shadow-sm transition hover:border-brand hover:text-brand-strong disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-border disabled:hover:text-foreground"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 20V4" />
                <path d="m15 19-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={togglePlayPause}
              aria-label={isPlaying ? '暫停' : '開始'}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-brand text-white shadow-sm transition hover:bg-brand-strong hover:shadow-md"
            >
              {isPlaying ? (
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="currentColor"
                >
                  <path d="M7 5h4v14H7z" />
                  <path d="M13 5h4v14h-4z" />
                </svg>
              ) : (
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="ml-0.5 h-5 w-5"
                  fill="currentColor"
                >
                  <path d="m8 5 11 7-11 7z" />
                </svg>
              )}
            </button>
            <button
              type="button"
              onClick={() => seekRelativeLine('next')}
              disabled={!canSeekNextLine}
              aria-label="下一句"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-foreground shadow-sm transition hover:border-brand hover:text-brand-strong disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-border disabled:hover:text-foreground"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 4v16" />
                <path d="m9 5 7 7-7 7" />
              </svg>
            </button>
          </div>
          {showInlineVocabPanel ? (
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
                      const wordClass = isRoomyVocabPanel
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
                      const furiganaClass = isRoomyVocabPanel
                        ? density === 'tiny'
                          ? 'text-[10px]'
                          : 'text-xs'
                        : density === 'tiny'
                          ? 'text-[10px]'
                          : density === 'compact'
                            ? 'text-[11px]'
                            : 'text-xs'
                      const bodyClass = isRoomyVocabPanel
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
                      const bodyGap =
                        density === 'normal' ? 'gap-0.5' : 'gap-px'
                      const cardWidth = isRoomyVocabPanel
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
                            <p
                              className={`break-words text-muted ${bodyClass}`}
                            >
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
          ) : null}
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
                  className={`group min-w-0 max-w-full cursor-pointer select-text rounded-[18px] border p-3 text-left transition ${
                    isActive
                      ? 'border-brand bg-brand-soft shadow-sm'
                      : 'border-border bg-surface hover:border-brand'
                  }`}
                >
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-brand-strong">
                      {line.timeLabel}
                      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-brand/40 text-brand-strong opacity-70 transition group-hover:translate-x-0.5 group-hover:opacity-100">
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 24 24"
                          className="h-2.5 w-2.5"
                          fill="currentColor"
                        >
                          <path d="m8 5 11 7-11 7z" />
                        </svg>
                      </span>
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

        {reviewVocabs.length > 0 || showQuizLink ? (
          <section
            ref={vocabReviewRef}
            className="min-w-0 scroll-mt-6 space-y-4 overflow-hidden border-t border-border pt-8"
          >
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-strong">
                  Vocab Review
                </p>
                <h2 className="mt-1 font-heading text-2xl font-bold tracking-tight">
                  單詞回顧
                </h2>
              </div>
              {showQuizLink ? (
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <span className="text-sm font-semibold text-muted">
                    學會了嗎？
                  </span>
                  <Link
                    href={`/${locale}/music/quiz/${item.id}`}
                    className="rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-strong hover:shadow-md dark:text-white"
                  >
                    <button className="text-white">{dict.sections.quiz}</button>
                  </Link>
                </div>
              ) : null}
            </div>
            <p className="text-xs font-medium text-muted">
              {hasUserSelectedReviewVocabs
                ? '你選擇的單詞'
                : '未點選單詞，系統推薦'}
            </p>
            {reviewVocabs.length > 0 ? (
              <div className="flex min-w-0 gap-3 overflow-x-auto pb-3">
                {reviewVocabs.map((vocab) => {
                  const sourceLyric = lyricById.get(vocab.lineId)
                  const meaning = getLocalizedText(vocab.meaning, 'zh')
                  const lyricTranslation = sourceLyric
                    ? getLocalizedText(sourceLyric.translation, locale)
                    : ''

                  return (
                    <article
                      key={vocab.id}
                      className="flex w-[260px] shrink-0 flex-col rounded-[14px] border border-border bg-surface p-4 shadow-sm sm:w-[300px]"
                    >
                      <div>
                        <p className="text-xs font-semibold text-muted">
                          {vocab.furigana}
                        </p>
                        <h3 className="mt-1 break-words font-heading text-2xl font-bold leading-tight">
                          {vocab.word}
                        </h3>
                      </div>
                      {meaning ? (
                        <p className="mt-3 break-words text-base font-bold leading-snug text-brand-strong">
                          {meaning}
                        </p>
                      ) : null}
                      {sourceLyric ? (
                        <button
                          type="button"
                          onClick={() => playLyricLine(sourceLyric.atMs)}
                          className="group mt-4 w-full space-y-2 border-t border-border pt-3 text-left transition hover:border-brand hover:text-brand-strong focus:outline-none focus:ring-2 focus:ring-brand/70"
                        >
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-strong">
                            {sourceLyric.timeLabel}
                            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-brand/40 text-brand-strong opacity-70 transition group-hover:translate-x-0.5 group-hover:opacity-100">
                              <svg
                                aria-hidden="true"
                                viewBox="0 0 24 24"
                                className="h-2.5 w-2.5"
                                fill="currentColor"
                              >
                                <path d="m8 5 11 7-11 7z" />
                              </svg>
                            </span>
                          </span>
                          <p className="break-words text-sm font-semibold leading-relaxed text-foreground">
                            {sourceLyric.japanese}
                          </p>
                          {lyricTranslation ? (
                            <p className="break-words text-sm leading-relaxed text-muted">
                              {lyricTranslation}
                            </p>
                          ) : null}
                        </button>
                      ) : null}
                    </article>
                  )
                })}
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
      <div ref={relatedMusicTriggerRef} className="h-px w-full" aria-hidden="true" />
      <MusicRail
        eyebrow={sameArtistCopy[locale].eyebrow}
        title={sameArtistCopy[locale].title(item.artist)}
        description={sameArtistCopy[locale].description}
        items={sameArtistMusic}
        locale={locale}
        isLoading={!hasLoadedRelatedMusic}
        emptyMessage={
          locale === 'en'
            ? `No more songs from ${item.artist} yet.`
            : locale === 'ja'
              ? `${item.artist} の他の曲はまだありません。`
              : `暫時沒有更多 ${item.artist} 的歌曲。`
        }
      />
      <MusicRail
        eyebrow={recommendedCopy[locale].eyebrow}
        title={recommendedCopy[locale].title}
        items={recommendedMusic}
        locale={locale}
        isLoading={!hasLoadedRelatedMusic}
        emptyMessage={
          locale === 'en'
            ? 'No recommendations available yet.'
            : locale === 'ja'
              ? 'おすすめの楽曲はまだありません。'
            : '暫時沒有推薦歌曲。'
        }
      />
      {hasLoadedRelatedMusic ? (
        <section className="border-t border-border pt-8">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] border border-brand/15 bg-brand-soft/10 px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-brand-strong">
                {wishPromptCopy.title}
              </p>
              <p className="mt-1 text-sm text-muted">
                {locale === 'en'
                  ? 'Tell us what you want to learn next.'
                  : locale === 'ja'
                    ? '次に学びたい曲を教えてください。'
                    : '把你想學的歌告訴我們。'}
              </p>
            </div>
            <Link
              href={`/${locale}/wish`}
              className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-strong"
            >
              {wishPromptCopy.action}
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  )
}
