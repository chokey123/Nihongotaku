'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { MusicCard } from '@/components/ui/music-card'
import {
  AutocompleteInput,
  type AutocompleteOption,
} from '@/components/ui/autocomplete-input'
import { SectionHeading } from '@/components/ui/section-heading'
import type { MusicFilterOption, MusicItem, MusicSearchPage } from '@/lib/types'

type SupportedLocale = 'zh' | 'en' | 'ja'

const MUSIC_PAGE_SIZE = 6
const FILTER_PAGE_SIZE = 5

const homeShellCopy = {
  zh: {
    eyebrow: '01',
    searchPlaceholder: '搜索歌名或歌手',
    searchButton: '搜索',
    artistFilter: '歌手筛选',
    genreFilter: '风格筛选',
    clearAll: '清除筛选',
    results: '搜索结果',
    resultCount: (count: number) => `共 ${count} 首歌曲`,
    noResults: '没有符合当前搜索与筛选条件的歌曲。',
    suggestionArtist: '歌手',
    suggestionSong: '歌曲',
  },
  en: {
    eyebrow: '01',
    searchPlaceholder: 'Search song title or artist',
    searchButton: 'Search',
    artistFilter: 'Artist filter',
    genreFilter: 'Genre filter',
    clearAll: 'Clear filters',
    results: 'Results',
    resultCount: (count: number) => `${count} songs found`,
    noResults: 'No songs match the current search and filters.',
    suggestionArtist: 'Artist',
    suggestionSong: 'Song',
  },
  ja: {
    eyebrow: '01',
    searchPlaceholder: '曲名またはアーティストで検索',
    searchButton: '検索',
    artistFilter: 'アーティスト絞り込み',
    genreFilter: 'ジャンル絞り込み',
    clearAll: '絞り込み解除',
    results: '検索結果',
    resultCount: (count: number) => `${count}曲`,
    noResults: '現在の検索条件に一致する曲がありません。',
    suggestionArtist: 'アーティスト',
    suggestionSong: '楽曲',
  },
} as const

function normalizeText(value: string) {
  return value.trim().toLowerCase()
}

export function HomePageShell({
  lang,
  dict,
  music,
  musicTotal,
  artistFilterOptions,
  genreFilterOptions,
}: {
  lang: string
  dict: {
    slogan: string
    pages: {
      homeIntro: string
      homeMusicDescription: string
    }
    sections: {
      songLibrary: string
    }
  }
  music: MusicItem[]
  musicTotal: number
  artistFilterOptions: MusicFilterOption[]
  genreFilterOptions: MusicFilterOption[]
}) {
  const locale: SupportedLocale =
    lang === 'zh' || lang === 'en' || lang === 'ja' ? lang : 'zh'
  const copy = homeShellCopy[locale]
  const appliedFilterLabels = {
    search: locale === 'en' ? 'Search' : locale === 'ja' ? '検索' : '搜尋',
    artist: locale === 'en' ? 'Artist' : locale === 'ja' ? 'アーティスト' : '歌手',
    genre: locale === 'en' ? 'Genre' : locale === 'ja' ? 'ジャンル' : '曲風',
  }
  const [draftQuery, setDraftQuery] = useState('')
  const [query, setQuery] = useState('')
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null)
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null)
  const [visibleMusic, setVisibleMusic] = useState(music)
  const [totalMusic, setTotalMusic] = useState(musicTotal)
  const [visibleArtistFilterCount, setVisibleArtistFilterCount] =
    useState(FILTER_PAGE_SIZE)
  const [visibleGenreFilterCount, setVisibleGenreFilterCount] =
    useState(FILTER_PAGE_SIZE)
  const [isRefreshingMusic, setIsRefreshingMusic] = useState(false)
  const [isLoadingMoreMusic, setIsLoadingMoreMusic] = useState(false)
  const hasMountedRef = useRef(false)
  const requestIdRef = useRef(0)
  const loadMoreRequestIdRef = useRef(0)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  const topArtists = useMemo(
    () => artistFilterOptions.slice(0, visibleArtistFilterCount),
    [artistFilterOptions, visibleArtistFilterCount],
  )
  const topGenres = useMemo(
    () => genreFilterOptions.slice(0, visibleGenreFilterCount),
    [genreFilterOptions, visibleGenreFilterCount],
  )
  const hasMoreArtists = visibleArtistFilterCount < artistFilterOptions.length
  const hasMoreGenres = visibleGenreFilterCount < genreFilterOptions.length
  const moreLabel =
    locale === 'en' ? 'More' : locale === 'ja' ? 'もっと' : '更多'

  const suggestions = useMemo<AutocompleteOption[]>(() => {
    const keyword = normalizeText(draftQuery)
    if (!keyword) {
      return []
    }

    const unique = new Map<string, AutocompleteOption>()

    for (const item of visibleMusic) {
      if (
        normalizeText(item.artist).includes(keyword) &&
        !unique.has(`artist:${item.artist}`)
      ) {
        unique.set(`artist:${item.artist}`, {
          key: `artist:${item.artist}`,
          value: item.artist,
          meta: copy.suggestionArtist,
        })
      }

      if (
        normalizeText(item.title).includes(keyword) &&
        !unique.has(`song:${item.title}`)
      ) {
        unique.set(`song:${item.title}`, {
          key: `song:${item.title}`,
          value: item.title,
          meta: copy.suggestionSong,
        })
      }

      if (unique.size >= 5) {
        break
      }
    }

    return [...unique.values()]
  }, [copy.suggestionArtist, copy.suggestionSong, draftQuery, visibleMusic])

  const loadMusicPage = useCallback(
    async (offset: number) => {
      const params = new URLSearchParams({
        limit: String(MUSIC_PAGE_SIZE),
        offset: String(offset),
      })
      const trimmedQuery = query.trim()

      if (trimmedQuery) {
        params.set('q', trimmedQuery)
      }

      if (selectedArtist) {
        params.set('artist', selectedArtist)
      }

      if (selectedGenre) {
        params.set('genre', selectedGenre)
      }

      const response = await fetch(`/api/music?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Failed to load music')
      }

      return (await response.json()) as MusicSearchPage
    },
    [query, selectedArtist, selectedGenre],
  )

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true
      return
    }

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    loadMoreRequestIdRef.current += 1

    const timeoutId = window.setTimeout(() => {
      setIsRefreshingMusic(true)
      setIsLoadingMoreMusic(false)

      loadMusicPage(0)
        .then((page) => {
          if (requestIdRef.current !== requestId) {
            return
          }

          setVisibleMusic(page.items)
          setTotalMusic(page.total)
        })
        .catch(() => {
          if (requestIdRef.current === requestId) {
            setVisibleMusic([])
            setTotalMusic(0)
          }
        })
        .finally(() => {
          if (requestIdRef.current === requestId) {
            setIsRefreshingMusic(false)
          }
        })
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [loadMusicPage])

  const hasMoreMusic = visibleMusic.length < totalMusic

  const loadMoreMusic = useCallback(() => {
    if (isRefreshingMusic || isLoadingMoreMusic || !hasMoreMusic) {
      return
    }

    const requestId = requestIdRef.current
    const loadMoreRequestId = loadMoreRequestIdRef.current + 1
    loadMoreRequestIdRef.current = loadMoreRequestId
    setIsLoadingMoreMusic(true)
    loadMusicPage(visibleMusic.length)
      .then((page) => {
        if (requestIdRef.current !== requestId) {
          return
        }

        setVisibleMusic((current) => {
          const existingIds = new Set(current.map((item) => item.id))
          const nextItems = page.items.filter((item) => !existingIds.has(item.id))
          return [...current, ...nextItems]
        })
        setTotalMusic(page.total)
      })
      .finally(() => {
        if (loadMoreRequestIdRef.current === loadMoreRequestId) {
          setIsLoadingMoreMusic(false)
        }
      })
  }, [
    hasMoreMusic,
    isLoadingMoreMusic,
    isRefreshingMusic,
    loadMusicPage,
    visibleMusic.length,
  ])

  useEffect(() => {
    const target = loadMoreRef.current
    if (!target) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMoreMusic()
        }
      },
      { rootMargin: '360px 0px' },
    )

    observer.observe(target)

    return () => {
      observer.disconnect()
    }
  }, [loadMoreMusic])

  const appliedFilters = useMemo(
    () =>
      [
        query
          ? { label: appliedFilterLabels.search, value: query.trim() }
          : null,
        selectedArtist
          ? { label: appliedFilterLabels.artist, value: selectedArtist }
          : null,
        selectedGenre
          ? { label: appliedFilterLabels.genre, value: selectedGenre }
          : null,
      ].filter((entry): entry is { label: string; value: string } =>
        Boolean(entry?.value),
      ),
    [appliedFilterLabels.artist, appliedFilterLabels.genre, appliedFilterLabels.search, query, selectedArtist, selectedGenre],
  )

  return (
    <div className="space-y-10 pb-10">
      <section className="glass-panel relative overflow-hidden rounded-[36px] border border-border px-6 py-10 sm:px-10">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-brand-soft blur-3xl" />
        <div className="relative max-w-4xl space-y-4">
          <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl">
            {dict.slogan}
          </h1>
          <p className="max-w-2xl text-lg text-muted">{dict.pages.homeIntro}</p>
        </div>
      </section>

      <div className="sticky top-0 z-30 -mx-1 px-1 pb-2 pt-2 backdrop-blur">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            setQuery(draftQuery)
          }}
        >
          <AutocompleteInput
            type="search"
            value={draftQuery}
            suggestions={suggestions}
            placeholder={copy.searchPlaceholder}
            suppressHydrationWarning
            onValueChange={setDraftQuery}
            onSelect={(option) => {
              setDraftQuery(option.value)
              setQuery(option.value)
            }}
            onCommit={(nextValue) => {
              setQuery(nextValue)
            }}
            wrapperClassName="flex w-full items-center gap-3 rounded-[24px] border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-border dark:bg-surface"
            inputClassName="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-foreground dark:placeholder:text-muted"
            trailing={
              <button
                type="submit"
                className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white"
              >
                {copy.searchButton}
              </button>
            }
          />
        </form>
      </div>

      <section className="space-y-5 px-1 sm:px-0">
        {appliedFilters.length > 0 ? (
          <div className="flex flex-wrap gap-2 text-xs text-muted">
            {appliedFilters.map((filter) => (
              <span
                key={`${filter.label}:${filter.value}`}
                className="rounded-full border border-border/70 bg-surface px-3 py-1"
              >
                {filter.label}: {filter.value}
              </span>
            ))}
          </div>
        ) : null}

        <div className="space-y-4 border-t border-border/70 pt-4">
          <div className="grid gap-3 md:grid-cols-[8rem_minmax(0,1fr)] md:items-start">
            <div className="pt-2 text-sm font-semibold text-muted">
              {copy.artistFilter}
            </div>
            <div className="flex flex-wrap gap-2">
              {topArtists.map((artist) => {
                const isActive =
                  normalizeText(selectedArtist ?? '') === normalizeText(artist.value)

                return (
                  <button
                    key={artist.value}
                    type="button"
                    onClick={() =>
                      setSelectedArtist((current) =>
                        current && normalizeText(current) === normalizeText(artist.value)
                          ? null
                          : artist.value,
                      )
                    }
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      isActive
                        ? 'border-brand bg-brand-soft text-brand-strong'
                        : 'border-border bg-surface text-muted hover:border-brand hover:text-brand-strong'
                    }`}
                  >
                    {artist.value} ({artist.count})
                  </button>
                )
              })}
              {hasMoreArtists ? (
                <button
                  type="button"
                  onClick={() =>
                    setVisibleArtistFilterCount((current) =>
                      Math.min(current + FILTER_PAGE_SIZE, artistFilterOptions.length),
                    )
                  }
                  className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-muted transition hover:border-brand hover:text-brand-strong"
                >
                  {moreLabel}
                </button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[8rem_minmax(0,1fr)] md:items-start">
            <div className="pt-2 text-sm font-semibold text-muted">
              {copy.genreFilter}
            </div>
            <div className="flex flex-wrap gap-2">
              {topGenres.map((genre) => {
                const isActive =
                  normalizeText(selectedGenre ?? '') === normalizeText(genre.value)

                return (
                  <button
                    key={genre.value}
                    type="button"
                    onClick={() =>
                      setSelectedGenre((current) =>
                        current && normalizeText(current) === normalizeText(genre.value)
                          ? null
                          : genre.value,
                      )
                    }
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      isActive
                        ? 'border-brand bg-brand-soft text-brand-strong'
                        : 'border-border bg-surface text-muted hover:border-brand hover:text-brand-strong'
                    }`}
                  >
                    {genre.value} ({genre.count})
                  </button>
                )
              })}
              {hasMoreGenres ? (
                <button
                  type="button"
                  onClick={() =>
                    setVisibleGenreFilterCount((current) =>
                      Math.min(current + FILTER_PAGE_SIZE, genreFilterOptions.length),
                    )
                  }
                  className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-muted transition hover:border-brand hover:text-brand-strong"
                >
                  {moreLabel}
                </button>
              ) : null}
            </div>
          </div>

          {(query || selectedArtist || selectedGenre) ? (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setDraftQuery('')
                  setQuery('')
                  setSelectedArtist(null)
                  setSelectedGenre(null)
                }}
                className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-muted transition hover:border-brand hover:text-brand-strong"
              >
                {copy.clearAll}
              </button>
            </div>
          ) : null}
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeading
          eyebrow={copy.eyebrow}
          title={dict.sections.songLibrary}
          description={dict.pages.homeMusicDescription}
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-muted">
            {copy.results} · {copy.resultCount(totalMusic)}
          </p>
        </div>
        {visibleMusic.length > 0 ? (
          <div
            className={`grid gap-5 transition-opacity md:grid-cols-2 xl:grid-cols-3 ${
              isRefreshingMusic ? 'opacity-60' : 'opacity-100'
            }`}
          >
            {visibleMusic.map((item) => (
              <MusicCard key={item.id} item={item} locale={lang} />
            ))}
          </div>
        ) : (
          <div className="glass-panel rounded-[28px] border border-border px-6 py-8 text-sm text-muted">
            {copy.noResults}
          </div>
        )}
        <div ref={loadMoreRef} className="h-8" aria-hidden="true" />
        {isLoadingMoreMusic ? (
          <p className="text-center text-sm font-medium text-muted">
            {locale === 'en' ? 'Loading more songs...' : 'Loading more music...'}
          </p>
        ) : null}
      </section>
    </div>
  )
}
