'use client'

import { useMemo, useState } from 'react'

import { MusicCard } from '@/components/ui/music-card'
import {
  AutocompleteInput,
  type AutocompleteOption,
} from '@/components/ui/autocomplete-input'
import { SectionHeading } from '@/components/ui/section-heading'
import type { MusicItem } from '@/lib/types'

type SupportedLocale = 'zh' | 'en' | 'ja'

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

function buildTopFilters(values: string[]) {
  const counts = new Map<string, number>()

  for (const value of values) {
    const normalized = value.trim()
    if (!normalized) {
      continue
    }

    counts.set(normalized, (counts.get(normalized) ?? 0) + 1)
  }

  return [...counts.entries()]
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1]
      }

      const leftKey = normalizeText(left[0])
      const rightKey = normalizeText(right[0])

      if (leftKey < rightKey) {
        return -1
      }

      if (leftKey > rightKey) {
        return 1
      }

      if (left[0] < right[0]) {
        return -1
      }

      if (left[0] > right[0]) {
        return 1
      }

      return 0
    })
    .slice(0, 5)
    .map(([value, count]) => ({ value, count }))
}

export function HomePageShell({
  lang,
  dict,
  music,
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

  const topArtists = useMemo(
    () => buildTopFilters(music.map((item) => item.artist)),
    [music],
  )
  const topGenres = useMemo(
    () => buildTopFilters(music.map((item) => item.genre)),
    [music],
  )

  const suggestions = useMemo<AutocompleteOption[]>(() => {
    const keyword = normalizeText(draftQuery)
    if (!keyword) {
      return []
    }

    const unique = new Map<string, AutocompleteOption>()

    for (const item of music) {
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
  }, [copy.suggestionArtist, copy.suggestionSong, draftQuery, music])

  const filteredMusic = useMemo(() => {
    const keyword = normalizeText(query)

    return music.filter((item) => {
      const matchesQuery =
        keyword.length === 0 ||
        normalizeText(item.title).includes(keyword) ||
        normalizeText(item.artist).includes(keyword)

      const matchesArtist =
        !selectedArtist || normalizeText(item.artist) === normalizeText(selectedArtist)

      const matchesGenre =
        !selectedGenre || normalizeText(item.genre) === normalizeText(selectedGenre)

      return matchesQuery && matchesArtist && matchesGenre
    })
  }, [music, query, selectedArtist, selectedGenre])

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

      <section className="space-y-5 px-1 sm:px-0">
        <div className="relative">
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
            {copy.results} · {copy.resultCount(filteredMusic.length)}
          </p>
        </div>
        {filteredMusic.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredMusic.map((item) => (
              <MusicCard key={item.id} item={item} locale={lang} />
            ))}
          </div>
        ) : (
          <div className="glass-panel rounded-[28px] border border-border px-6 py-8 text-sm text-muted">
            {copy.noResults}
          </div>
        )}
      </section>
    </div>
  )
}
