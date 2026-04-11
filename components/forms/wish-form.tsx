'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'

import {
  AutocompleteInput,
  type AutocompleteOption,
} from '@/components/ui/autocomplete-input'
import { backendService } from '@/lib/services/backend-service'
import type { Dictionary } from '@/lib/i18n'

function isValidYoutubeUrl(value: string) {
  const normalized = value.trim()

  if (!normalized) return false

  try {
    const url = new URL(normalized)
    const hostname = url.hostname.replace(/^www\./, '')

    if (hostname === 'youtu.be') {
      return url.pathname.replace('/', '').trim().length > 0
    }

    if (hostname === 'youtube.com' || hostname.endsWith('.youtube.com')) {
      return (url.searchParams.get('v') ?? '').trim().length > 0
    }

    return false
  } catch {
    return false
  }
}

function getWishCopy(locale: string) {
  if (locale === 'en') {
    return {
      success: 'Wish submitted successfully.',
      fillAll: 'Please complete every field.',
      invalidYoutube: 'Please enter a valid YouTube link.',
      failed: 'Failed to submit wish.',
    }
  }

  if (locale === 'ja') {
    return {
      success: 'リクエストを送信しました。',
      fillAll: 'すべての項目を入力してください。',
      invalidYoutube: '有効な YouTube リンクを入力してください。',
      failed: 'リクエストの送信に失敗しました。',
    }
  }

  return {
    success: '許願已成功送出。',
    fillAll: '請完整填寫所有欄位。',
    invalidYoutube: '請填寫有效的 YouTube 連結。',
    failed: '送出許願失敗。',
  }
}

function normalizeSuggestionKeyword(value: string) {
  return value.trim().toLowerCase()
}

function getClosestSuggestions(input: string, values: string[]) {
  const keyword = normalizeSuggestionKeyword(input)

  if (!keyword) {
    return values.slice(0, 5)
  }

  return values
    .filter((value) => normalizeSuggestionKeyword(value).includes(keyword))
    .sort((left, right) => {
      const leftNormalized = normalizeSuggestionKeyword(left)
      const rightNormalized = normalizeSuggestionKeyword(right)
      const leftStartsWith = leftNormalized.startsWith(keyword) ? 0 : 1
      const rightStartsWith = rightNormalized.startsWith(keyword) ? 0 : 1

      if (leftStartsWith !== rightStartsWith) {
        return leftStartsWith - rightStartsWith
      }

      const leftIndex = leftNormalized.indexOf(keyword)
      const rightIndex = rightNormalized.indexOf(keyword)

      if (leftIndex !== rightIndex) {
        return leftIndex - rightIndex
      }

      return left.localeCompare(right)
    })
    .slice(0, 5)
}

export function WishForm({
  dict,
  locale,
}: {
  dict: Dictionary
  locale: string
}) {
  const [artist, setArtist] = useState('')
  const [title, setTitle] = useState('')
  const [genre, setGenre] = useState('')
  const [url, setUrl] = useState('')
  const [artistSuggestions, setArtistSuggestions] = useState<string[]>([])
  const [genreSuggestions, setGenreSuggestions] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [messageTone, setMessageTone] = useState<'success' | 'error'>('success')
  const [isPending, startTransition] = useTransition()
  const copy = getWishCopy(locale)
  const artistDropdownSuggestions = useMemo<AutocompleteOption[]>(
    () =>
      getClosestSuggestions(artist, artistSuggestions).map((value) => ({
        key: `artist:${value}`,
        value,
      })),
    [artist, artistSuggestions],
  )
  const genreDropdownSuggestions = useMemo<AutocompleteOption[]>(
    () =>
      getClosestSuggestions(genre, genreSuggestions).map((value) => ({
        key: `genre:${value}`,
        value,
      })),
    [genre, genreSuggestions],
  )

  useEffect(() => {
    let isMounted = true

    backendService
      .getMusicFieldSuggestions({ includeUnpublished: true })
      .then((suggestions) => {
        if (!isMounted) return
        setArtistSuggestions(suggestions.artists)
        setGenreSuggestions(suggestions.genres)
      })
      .catch(() => {
        if (!isMounted) return
        setArtistSuggestions([])
        setGenreSuggestions([])
      })

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <form
      className="glass-panel flex flex-col gap-4 rounded-[32px] border border-border p-6"
      autoComplete="off"
      onSubmit={(event) => {
        event.preventDefault()

        startTransition(async () => {
          const nextArtist = artist.trim()
          const nextTitle = title.trim()
          const nextGenre = genre.trim()
          const nextUrl = url.trim()

          if (!nextArtist || !nextTitle || !nextGenre || !nextUrl) {
            setMessage(copy.fillAll)
            setMessageTone('error')
            return
          }

          if (!isValidYoutubeUrl(nextUrl)) {
            setMessage(copy.invalidYoutube)
            setMessageTone('error')
            return
          }

          try {
            await backendService.submitWish({
              artist: nextArtist,
              title: nextTitle,
              genre: nextGenre,
              url: nextUrl,
            })
            setMessage(copy.success)
            setMessageTone('success')
            setArtist('')
            setTitle('')
            setGenre('')
            setUrl('')
            window.dispatchEvent(new CustomEvent('nihongotaku:wish-created'))
          } catch (error) {
            setMessage(error instanceof Error ? error.message : copy.failed)
            setMessageTone('error')
          }
        })
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span>{dict.labels.artist}</span>
          <AutocompleteInput
            name="artist"
            autoComplete="off"
            value={artist}
            onValueChange={setArtist}
            suggestions={artistDropdownSuggestions}
            onSelect={(option) => {
              setArtist(option.value)
            }}
            required
            wrapperClassName="flex w-full items-center rounded-2xl border border-border bg-surface-strong px-4 py-3"
            inputClassName="w-full bg-transparent outline-none"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span>{dict.labels.title}</span>
          <input
            name="title"
            autoComplete="off"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            className="w-full rounded-2xl border border-border bg-surface-strong px-4 py-3 outline-none"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span>{dict.labels.genre}</span>
          <AutocompleteInput
            name="genre"
            autoComplete="off"
            value={genre}
            onValueChange={setGenre}
            suggestions={genreDropdownSuggestions}
            onSelect={(option) => {
              setGenre(option.value)
            }}
            required
            wrapperClassName="flex w-full items-center rounded-2xl border border-border bg-surface-strong px-4 py-3"
            inputClassName="w-full bg-transparent outline-none"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span>{dict.labels.sourceUrl}</span>
          <input
            name="url"
            type="url"
            autoComplete="off"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="請提供Youtube MV鏈接"
            required
            className="w-full rounded-2xl border border-border bg-surface-strong px-4 py-3 outline-none"
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="w-fit rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white disabled:opacity-70"
      >
        {isPending ? '...' : dict.labels.submit}
      </button>
      {message ? (
        <p
          className={`rounded-2xl px-4 py-3 text-sm ${
            messageTone === 'success'
              ? 'bg-brand-soft text-brand-strong'
              : 'border border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {message}
        </p>
      ) : null}
    </form>
  )
}
