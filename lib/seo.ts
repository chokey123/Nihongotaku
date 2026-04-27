import type { Locale, LocalizedText, MusicItem } from '@/lib/types'

export const siteName = 'Nihongotaku'

export function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, '') ||
    'http://localhost:3000'
  )
}

export function buildAbsoluteUrl(path = '/') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${getSiteUrl()}${normalizedPath}`
}

export function getMusicPath(locale: string, musicId: string) {
  return `/${locale}/music/${musicId}`
}

export function getMusicUrl(locale: string, musicId: string) {
  return buildAbsoluteUrl(getMusicPath(locale, musicId))
}

export function getYoutubeThumbnailUrl(youtubeId: string) {
  return youtubeId
    ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`
    : ''
}

export function getLocalizedText(value: LocalizedText, locale: Locale) {
  return value[locale] ?? value.zh ?? value.en ?? value.ja ?? ''
}

export function buildMusicSeoTitle(music: Pick<MusicItem, 'artist' | 'title'>) {
  return `${music.title} 歌詞 - ${music.artist}`
}

export function buildMusicSeoDescription(
  music: Pick<MusicItem, 'artist' | 'title' | 'genre' | 'vocab' | 'lyrics'>,
) {
  const vocabCount = new Set(
    music.vocab.map((entry) => entry.word.trim().toLowerCase()).filter(Boolean),
  ).size
  const detail = vocabCount > 0 ? `，整理 ${vocabCount} 個日語單字` : ''

  return `${music.artist}「${music.title}」日語歌詞、中文翻譯與逐句學習${detail}。在本站用 JPOP 學日語，收錄 ${music.genre} 歌曲歌詞與單字解析。`
}

export function buildMusicKeywords(
  music: Pick<MusicItem, 'artist' | 'title' | 'genre' | 'vocab'>,
) {
  return [
    '日語歌詞',
    '日文歌詞',
    '日本歌詞',
    'JPOP 歌詞',
    '日語歌曲',
    '用歌學日語',
    `${music.title} 歌詞`,
    `${music.artist} ${music.title} 歌詞`,
    `${music.title} 中文翻譯`,
    `${music.artist} 歌詞`,
    music.artist,
    music.title,
    music.genre,
    ...music.vocab.slice(0, 8).map((entry) => entry.word),
  ].filter(Boolean)
}

export function stringifyJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}
