import {
  articleCatalog,
  homePayload,
  mockUser,
  musicCatalog,
} from '@/data/mock-data'
import { supabase } from '@/lib/supabase/client'
import type {
  ArticleDraftPayload,
  ArticleItem,
  HomePayload,
  LocalizedText,
  MusicDraftPayload,
  MusicQuizAttemptRecord,
  MusicItem,
  MusicQuizQuestion,
  MusicSubmissionSource,
  MusicVocabItem,
  UserRole,
  WishPayload,
  WishRequestItem,
} from '@/lib/types'

const wait = (ms = 180) => new Promise((resolve) => setTimeout(resolve, ms))
const hasSupabaseConfig = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
)

const MUSIC_SELECT = `
  id,
  created_by,
  created_at,
  review_requested_at,
  submission_source,
  title,
  artist,
  genre,
  source_url,
  youtube_video_id,
  thumbnail_url,
  is_published,
  music_lyric_line (
    id,
    seq_no,
    at_ms,
    time_label,
    japanese_text,
    music_lyric_translation (
      locale,
      translated_text
    )
  ),
  music_vocab (
    id,
    lyric_line_id,
    seq_no,
    word,
    basic_form,
    furigana,
    example_japanese,
    is_quiz_enabled,
    music_vocab_localization (
      locale,
      meaning_text,
      example_translation_text
    )
  )
`

const palettePresets = [
  { from: '#ffd8c7', to: '#ff8f70', accent: '#ffffff' },
  { from: '#ffc9c5', to: '#ef4444', accent: '#fff7ed' },
  { from: '#fde68a', to: '#fb7185', accent: '#312e81' },
  { from: '#c4e0ff', to: '#6b9cff', accent: '#eff6ff' },
  { from: '#d9f99d', to: '#4ade80', accent: '#14532d' },
  { from: '#ddd6fe', to: '#818cf8', accent: '#eef2ff' },
]

type LegacyLyricLine = MusicItem['lyrics'][number] & {
  vocab?: Array<Omit<MusicVocabItem, 'id' | 'lineId'>>
}

type LegacyMusicItem = Omit<MusicItem, 'lyrics' | 'vocab'> & {
  lyrics: LegacyLyricLine[]
  vocab?: MusicVocabItem[]
}

interface SupabaseLyricTranslationRow {
  locale: string
  translated_text: string | null
}

interface SupabaseLyricLineRow {
  id: string
  seq_no: number
  at_ms: number
  time_label: string | null
  japanese_text: string
  music_lyric_translation?: SupabaseLyricTranslationRow[] | null
}

interface SupabaseVocabLocalizationRow {
  locale: string
  meaning_text: string | null
  example_translation_text: string | null
}

interface SupabaseVocabRow {
  id: string
  lyric_line_id: string | null
  seq_no: number
  word: string
  basic_form: string | null
  furigana: string | null
  example_japanese: string | null
  is_quiz_enabled: boolean | null
  music_vocab_localization?: SupabaseVocabLocalizationRow[] | null
}

interface SupabaseMusicRow {
  id: string
  created_by: string | null
  created_at: string | null
  review_requested_at: string | null
  submission_source: MusicSubmissionSource | null
  title: string
  artist: string
  genre: string
  source_url: string | null
  youtube_video_id: string | null
  thumbnail_url: string | null
  is_published: boolean | null
  music_lyric_line?: SupabaseLyricLineRow[] | null
  music_vocab?: SupabaseVocabRow[] | null
}

interface SupabaseArticleRow {
  id: string
  created_by: string | null
  title: string
  type: string
  artist: string | null
  thumbnail_url: string | null
  content_json: Record<string, unknown> | null
  is_published: boolean | null
}

interface SupabaseWishRow {
  id: string
  artist: string
  title: string
  genre: string | null
  url: string | null
  status: string | null
  created_at: string | null
}

interface SupabaseMusicDuplicateRow {
  id: string
  title: string
  artist: string
  youtube_video_id: string | null
  source_url: string | null
}

interface SupabaseMusicQuizAttemptAnswerRow {
  question_key: string
  selected_meaning: string
  correct_meaning: string
  is_correct: boolean
  seq_no: number
}

interface SupabaseMusicQuizAttemptRow {
  id: string
  music_id: string
  user_id: string
  score: number
  total_questions: number
  created_at: string | null
  music_quiz_attempt_answer?: SupabaseMusicQuizAttemptAnswerRow[] | null
}

function emptyLocalizedText(): LocalizedText {
  return {
    zh: '',
    en: '',
    ja: '',
  }
}

function normalizeMusicItem(item: LegacyMusicItem): MusicItem {
  const lyrics = item.lyrics.map(({ vocab: legacyVocab, ...line }) => {
    void legacyVocab
    return line
  })
  const vocab =
    item.vocab ??
    item.lyrics.flatMap((line) =>
      (line.vocab ?? []).map((entry, index) => ({
        ...entry,
        id: `${line.id}-${index}`,
        lineId: line.id,
      })),
    )

  return {
    ...item,
    sourceUrl:
      item.sourceUrl ?? `https://youtube.com/watch?v=${item.youtubeId}`,
    submissionSource: item.submissionSource ?? 'upload',
    isPublished: item.isPublished ?? true,
    lyrics,
    vocab,
  }
}

const normalizedMusicCatalog = musicCatalog.map((item) =>
  normalizeMusicItem(item as LegacyMusicItem),
)

const musicQuizSelections = new Map(
  normalizedMusicCatalog.map((item) => [item.id, [...item.quizVocabKeys]]),
)

function getLocalizedMeaning(
  meaning: MusicVocabItem['meaning'],
  locale: string,
) {
  return (
    meaning[locale as keyof typeof meaning] ?? meaning.zh ?? meaning.en ?? ''
  )
}

function flattenMusicVocabs(item: MusicItem) {
  return item.vocab.map((vocab) => {
    const line = item.lyrics.find((entry) => entry.id === vocab.lineId)

    return {
      key: vocab.id,
      lineId: vocab.lineId,
      lineTimeLabel: line?.timeLabel ?? '',
      lineJapanese: line?.japanese ?? '',
      vocab,
    }
  })
}

function buildMusicPalette(seed: string) {
  const total = [...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return palettePresets[total % palettePresets.length]
}

function buildThumbnailLabel(title: string) {
  const words = title.trim().split(/\s+/).filter(Boolean).slice(0, 2)
  return words.length > 0 ? words.join(' ') : 'Music'
}

function extractTextFromTiptapContent(node: unknown): string[] {
  if (!node || typeof node !== 'object') {
    return []
  }

  const typedNode = node as {
    text?: string
    content?: unknown[]
  }

  const current = typeof typedNode.text === 'string' ? [typedNode.text] : []
  const nested = Array.isArray(typedNode.content)
    ? typedNode.content.flatMap((child) => extractTextFromTiptapContent(child))
    : []

  return [...current, ...nested]
}

function buildExcerptFromContent(
  content: Record<string, unknown> | null | undefined,
) {
  const fullText = extractTextFromTiptapContent(content)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!fullText) {
    return 'No excerpt yet.'
  }

  return fullText.length > 120 ? `${fullText.slice(0, 117)}...` : fullText
}

function formatTimeLabel(atMs: number) {
  const totalSeconds = Math.floor(atMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0')
  const seconds = (totalSeconds % 60).toString().padStart(2, '0')

  return `${minutes}:${seconds}`
}

function extractYoutubeId(sourceUrl: string) {
  const normalized = sourceUrl.trim()

  if (!normalized) return ''
  if (!normalized.includes('http')) return normalized

  try {
    const url = new URL(normalized)

    if (url.hostname.includes('youtu.be')) {
      return url.pathname.replace('/', '')
    }

    if (url.searchParams.get('v')) {
      return url.searchParams.get('v') ?? ''
    }

    const segments = url.pathname.split('/').filter(Boolean)
    return segments.at(-1) ?? ''
  } catch {
    return normalized
  }
}

function isValidYoutubeUrl(value: string) {
  const videoId = extractYoutubeId(value)
  return videoId.length > 0
}

function isSameMusicSourceUrl(left: string, right: string) {
  const leftYoutubeId = extractYoutubeId(left)
  const rightYoutubeId = extractYoutubeId(right)

  if (leftYoutubeId && rightYoutubeId) {
    return leftYoutubeId === rightYoutubeId
  }

  return left.trim() === right.trim()
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
}

function localizeSupabaseText<T extends { locale: string }>(
  rows: T[] | null | undefined,
  pickValue: (row: T) => string | null | undefined,
) {
  const localized = emptyLocalizedText()

  for (const row of rows ?? []) {
    if (row.locale === 'zh' || row.locale === 'en' || row.locale === 'ja') {
      localized[row.locale] = pickValue(row) ?? ''
    }
  }

  return localized
}

function buildMusicItemFromSupabase(row: SupabaseMusicRow): MusicItem {
  const lyrics = [...(row.music_lyric_line ?? [])]
    .sort((left, right) => left.seq_no - right.seq_no)
    .map((line) => ({
      id: line.id,
      atMs: line.at_ms,
      timeLabel: line.time_label ?? '',
      japanese: line.japanese_text,
      translation: localizeSupabaseText(
        line.music_lyric_translation,
        (entry) => entry.translated_text,
      ),
    }))

  const vocab = [...(row.music_vocab ?? [])]
    .sort((left, right) => left.seq_no - right.seq_no)
    .map((entry) => ({
      id: entry.id,
      lineId: entry.lyric_line_id ?? '',
      word: entry.word,
      furigana: entry.furigana ?? '',
      meaning: localizeSupabaseText(
        entry.music_vocab_localization,
        (localization) => localization.meaning_text,
      ),
      example: entry.example_japanese ?? '',
      exampleTranslation: localizeSupabaseText(
        entry.music_vocab_localization,
        (localization) => localization.example_translation_text,
      ),
    }))
    .filter((entry) => entry.lineId.length > 0)

  return {
    id: row.id,
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at ?? undefined,
    reviewRequestedAt: row.review_requested_at ?? null,
    submissionSource: row.submission_source ?? 'upload',
    title: row.title,
    artist: row.artist,
    genre: row.genre,
    sourceUrl:
      row.source_url ??
      (row.youtube_video_id
        ? `https://youtube.com/watch?v=${row.youtube_video_id}`
        : ''),
    favorite: false,
    thumbnailLabel: buildThumbnailLabel(row.title),
    palette: buildMusicPalette(`${row.id}-${row.title}`),
    youtubeId: row.youtube_video_id ?? extractYoutubeId(row.source_url ?? ''),
    isPublished: row.is_published ?? false,
    lyrics,
    vocab,
    quizVocabKeys: (row.music_vocab ?? [])
      .filter((entry) => Boolean(entry.is_quiz_enabled))
      .map((entry) => entry.id),
  }
}

function buildArticleItemFromSupabase(row: SupabaseArticleRow): ArticleItem {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    artist: row.artist ?? '',
    createdBy: row.created_by ?? undefined,
    excerpt: buildExcerptFromContent(row.content_json),
    thumbnailUrl: row.thumbnail_url ?? '',
    isPublished: row.is_published ?? true,
    palette: buildMusicPalette(`${row.id}-${row.title}-${row.type}`),
    content: row.content_json ?? {
      type: 'doc',
      content: [{ type: 'paragraph' }],
    },
  }
}

function buildWishRequestItemFromSupabase(
  row: SupabaseWishRow,
): WishRequestItem {
  return {
    id: row.id,
    artist: row.artist,
    title: row.title,
    genre: row.genre ?? '',
    url: row.url ?? '',
    status: row.status ?? 'pending',
    createdAt: row.created_at ?? undefined,
  }
}

function buildMusicQuizAttemptRecordFromSupabase(
  row: SupabaseMusicQuizAttemptRow,
): MusicQuizAttemptRecord {
  return {
    id: row.id,
    musicId: row.music_id,
    userId: row.user_id,
    score: row.score,
    totalQuestions: row.total_questions,
    createdAt: row.created_at ?? undefined,
    answers: [...(row.music_quiz_attempt_answer ?? [])]
      .sort((left, right) => left.seq_no - right.seq_no)
      .map((entry) => ({
        questionKey: entry.question_key,
        selectedMeaning: entry.selected_meaning,
        correctMeaning: entry.correct_meaning,
        isCorrect: entry.is_correct,
      })),
  }
}

function applySearchFilter(items: MusicItem[], query: string) {
  const keyword = query.trim().toLowerCase()
  if (!keyword) return items

  return items.filter((item) =>
    [item.title, item.artist, item.genre].some((value) =>
      value.toLowerCase().includes(keyword),
    ),
  )
}

async function getCurrentActorId() {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  return session?.user.id ?? null
}

function buildFallbackMusicItems(query = '') {
  return structuredClone(applySearchFilter(normalizedMusicCatalog, query))
}

function buildFallbackMusicById(id: string) {
  const item = normalizedMusicCatalog.find((music) => music.id === id)
  if (!item) return undefined

  return structuredClone({
    ...item,
    quizVocabKeys: musicQuizSelections.get(id) ?? item.quizVocabKeys,
  })
}

async function enrichMusicCreatorRoles(items: MusicItem[]) {
  if (!hasSupabaseConfig || items.length === 0) {
    return items
  }

  const creatorIds = [
    ...new Set(items.map((item) => item.createdBy).filter(Boolean)),
  ]

  if (creatorIds.length === 0) {
    return items
  }

  const { data, error } = await supabase
    .from('user_profile')
    .select('id, role')
    .in('id', creatorIds)

  if (error) {
    logSupabaseQueryError('enrichMusicCreatorRoles', error)
    return items
  }

  const roleMap = new Map<string, UserRole>(
    (data ?? []).map((entry) => [
      entry.id as string,
      (entry.role === 'admin' ? 'admin' : 'guest') as UserRole,
    ]),
  )

  return items.map((item) => ({
    ...item,
    creatorRole: item.createdBy ? roleMap.get(item.createdBy) : undefined,
  }))
}

function logSupabaseQueryError(
  scope: string,
  error: {
    message?: string
    details?: string | null
    hint?: string | null
    code?: string | null
  },
) {
  console.error(`[backendService] ${scope} failed`, {
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code,
  })
}

export class BackendService {
  private async findDuplicateMusicBySourceUrl(
    sourceUrl: string,
    options?: { excludeMusicId?: string },
  ) {
    const normalizedSourceUrl = sourceUrl.trim()
    const youtubeId = extractYoutubeId(normalizedSourceUrl)

    if (!normalizedSourceUrl || !youtubeId) {
      return null
    }

    if (hasSupabaseConfig) {
      const { data, error } = await supabase
        .from('music')
        .select('id, title, artist, youtube_video_id, source_url')
        .eq('youtube_video_id', youtubeId)
        .limit(5)

      if (error) {
        logSupabaseQueryError('findDuplicateMusicBySourceUrl', error)
        throw new Error(error.message)
      }

      const duplicate = (data as SupabaseMusicDuplicateRow[] | null)?.find(
        (row) => row.id !== options?.excludeMusicId,
      )

      if (duplicate) {
        return duplicate
      }
    }

    const fallbackDuplicate = normalizedMusicCatalog.find((item) => {
      if (item.id === options?.excludeMusicId) {
        return false
      }

      const existingSourceUrl =
        item.sourceUrl ?? `https://youtube.com/watch?v=${item.youtubeId}`

      return isSameMusicSourceUrl(existingSourceUrl, normalizedSourceUrl)
    })

    if (!fallbackDuplicate) {
      return null
    }

    return {
      id: fallbackDuplicate.id,
      title: fallbackDuplicate.title,
      artist: fallbackDuplicate.artist,
      youtube_video_id: fallbackDuplicate.youtubeId,
      source_url: fallbackDuplicate.sourceUrl ?? null,
    }
  }

  private async assertMusicSourceUrlIsUnique(
    sourceUrl: string,
    options?: { excludeMusicId?: string },
  ) {
    const duplicate = await this.findDuplicateMusicBySourceUrl(
      sourceUrl,
      options,
    )

    if (!duplicate) {
      return
    }

    throw new Error(
      `此鏈接已在本站被使用   ："${duplicate.artist} - ${duplicate.title}".`,
    )
  }

  private async fetchMusicRows(includeUnpublished = false) {
    if (!hasSupabaseConfig) {
      return null
    }

    let query = supabase
      .from('music')
      .select(MUSIC_SELECT)
      .order('created_at', { ascending: false })

    if (!includeUnpublished) {
      query = query.eq('is_published', true)
    }

    const { data, error } = await query

    if (error) {
      logSupabaseQueryError('fetchMusicRows', error)
      return null
    }

    return (data ?? []) as SupabaseMusicRow[]
  }

  private async fetchMusicRowById(id: string, includeUnpublished = false) {
    if (!hasSupabaseConfig) {
      return null
    }

    let query = supabase.from('music').select(MUSIC_SELECT).eq('id', id)

    if (!includeUnpublished) {
      query = query.eq('is_published', true)
    }

    const { data, error } = await query.maybeSingle()

    if (error || !data) {
      if (error) {
        logSupabaseQueryError('fetchMusicRowById', error)
      }
      return null
    }

    return data as SupabaseMusicRow
  }

  private async findMusicRowInCollection(
    id: string,
    includeUnpublished = false,
  ) {
    const rows = await this.fetchMusicRows(includeUnpublished)
    return rows?.find((row) => row.id === id) ?? null
  }

  private async fetchArticleRows(includeUnpublished = false) {
    if (!hasSupabaseConfig) {
      return null
    }

    let query = supabase
      .from('article')
      .select(
        'id, created_by, title, type, artist, thumbnail_url, content_json, is_published',
      )
      .order('created_at', { ascending: false })

    if (!includeUnpublished) {
      query = query.eq('is_published', true)
    }

    const { data, error } = await query

    if (error) {
      logSupabaseQueryError('fetchArticleRows', error)
      return null
    }

    return (data ?? []) as SupabaseArticleRow[]
  }

  private async fetchArticleRowById(id: string, includeUnpublished = false) {
    if (!hasSupabaseConfig) {
      return null
    }

    let query = supabase
      .from('article')
      .select(
        'id, created_by, title, type, artist, thumbnail_url, content_json, is_published',
      )
      .eq('id', id)

    if (!includeUnpublished) {
      query = query.eq('is_published', true)
    }

    const { data, error } = await query.maybeSingle()

    if (error || !data) {
      if (error) {
        logSupabaseQueryError('fetchArticleRowById', error)
      }
      return null
    }

    return data as SupabaseArticleRow
  }

  private async findArticleRowInCollection(
    id: string,
    includeUnpublished = false,
  ) {
    const rows = await this.fetchArticleRows(includeUnpublished)
    return rows?.find((row) => row.id === id) ?? null
  }

  private async persistMusic(
    id: string,
    payload: MusicDraftPayload,
    isPublished: boolean,
    submissionSource: MusicSubmissionSource,
  ) {
    if (!hasSupabaseConfig) {
      await wait(280)
      if (payload.quizVocabKeys) {
        musicQuizSelections.set(id, [...payload.quizVocabKeys])
      }
      return { ok: true, id, isPublished, payload }
    }

    const actorId = await getCurrentActorId()
    const youtubeId = extractYoutubeId(payload.sourceUrl)

    const normalizedLineIds = new Map<string, string>()
    const normalizedLyrics = payload.lyrics.map((line, index) => {
      const nextId = isUuid(line.id) ? line.id : crypto.randomUUID()
      normalizedLineIds.set(line.id, nextId)

      return {
        ...line,
        id: nextId,
        timeLabel: line.timeLabel || formatTimeLabel(line.atMs),
        seqNo: index,
      }
    })

    const normalizedVocab = payload.vocab.map((entry, index) => ({
      ...entry,
      id: isUuid(entry.id) ? entry.id : crypto.randomUUID(),
      lineId: normalizedLineIds.get(entry.lineId) ?? entry.lineId,
      seqNo: index,
    }))

    const selectedQuizKeys = new Set(payload.quizVocabKeys ?? [])

    const { data: existingMusic } = await supabase
      .from('music')
      .select('id')
      .eq('id', id)
      .maybeSingle()

    if (existingMusic) {
      const { error: updateMusicError } = await supabase
        .from('music')
        .update({
          title: payload.title,
          artist: payload.artist,
          genre: payload.genre,
          source_url: payload.sourceUrl,
          youtube_video_id: youtubeId,
          review_requested_at: payload.reviewRequestedAt ?? null,
          submission_source: submissionSource,
          is_published: isPublished,
          updated_by: actorId,
        })
        .eq('id', id)

      if (updateMusicError) {
        throw new Error(updateMusicError.message)
      }
    } else {
      const { error: insertMusicError } = await supabase.from('music').insert({
        id,
        title: payload.title,
        artist: payload.artist,
        genre: payload.genre,
        source_url: payload.sourceUrl,
        youtube_video_id: youtubeId,
        review_requested_at: payload.reviewRequestedAt ?? null,
        submission_source: submissionSource,
        is_published: isPublished,
        created_by: actorId,
        updated_by: actorId,
      })

      if (insertMusicError) {
        throw new Error(insertMusicError.message)
      }
    }

    const { data: existingQuizRows } = await supabase
      .from('music_vocab')
      .select('id, is_quiz_enabled')
      .eq('music_id', id)

    for (const row of existingQuizRows ?? []) {
      if (row.is_quiz_enabled) {
        selectedQuizKeys.add(row.id)
      }
    }

    const { error: deleteVocabError } = await supabase
      .from('music_vocab')
      .delete()
      .eq('music_id', id)

    if (deleteVocabError) {
      throw new Error(deleteVocabError.message)
    }

    const { error: deleteLyricsError } = await supabase
      .from('music_lyric_line')
      .delete()
      .eq('music_id', id)

    if (deleteLyricsError) {
      throw new Error(deleteLyricsError.message)
    }

    if (normalizedLyrics.length > 0) {
      const { error: insertLyricsError } = await supabase
        .from('music_lyric_line')
        .insert(
          normalizedLyrics.map((line) => ({
            id: line.id,
            music_id: id,
            seq_no: line.seqNo,
            at_ms: line.atMs,
            time_label: line.timeLabel,
            japanese_text: line.japanese,
            created_by: actorId,
            updated_by: actorId,
          })),
        )

      if (insertLyricsError) {
        throw new Error(insertLyricsError.message)
      }

      const lyricTranslations = normalizedLyrics.flatMap((line) =>
        (['zh', 'en', 'ja'] as const)
          .map((locale) => ({
            lyric_line_id: line.id,
            locale,
            translated_text: line.translation[locale]?.trim() ?? '',
            created_by: actorId,
            updated_by: actorId,
          }))
          .filter((entry) => entry.translated_text.length > 0),
      )

      if (lyricTranslations.length > 0) {
        const { error: insertLyricTranslationsError } = await supabase
          .from('music_lyric_translation')
          .insert(lyricTranslations)

        if (insertLyricTranslationsError) {
          throw new Error(insertLyricTranslationsError.message)
        }
      }
    }

    if (normalizedVocab.length > 0) {
      const { error: insertVocabError } = await supabase
        .from('music_vocab')
        .insert(
          normalizedVocab.map((entry) => ({
            id: entry.id,
            music_id: id,
            lyric_line_id: entry.lineId,
            seq_no: entry.seqNo,
            word: entry.word,
            basic_form: entry.word,
            furigana: entry.furigana,
            example_japanese: entry.example,
            is_quiz_enabled: selectedQuizKeys.has(entry.id),
            created_by: actorId,
            updated_by: actorId,
          })),
        )

      if (insertVocabError) {
        throw new Error(insertVocabError.message)
      }

      const vocabLocalizations = normalizedVocab.flatMap((entry) =>
        (['zh', 'en', 'ja'] as const)
          .map((locale) => ({
            vocab_id: entry.id,
            locale,
            meaning_text: entry.meaning[locale]?.trim() ?? '',
            example_translation_text:
              entry.exampleTranslation[locale]?.trim() ?? '',
            created_by: actorId,
            updated_by: actorId,
          }))
          .filter(
            (localization) =>
              localization.meaning_text.length > 0 ||
              localization.example_translation_text.length > 0,
          ),
      )

      if (vocabLocalizations.length > 0) {
        const { error: insertVocabLocalizationError } = await supabase
          .from('music_vocab_localization')
          .insert(vocabLocalizations)

        if (insertVocabLocalizationError) {
          throw new Error(insertVocabLocalizationError.message)
        }
      }
    }

    return {
      ok: true,
      id,
      isPublished,
      payload: {
        ...payload,
        lyrics: normalizedLyrics.map((line) => ({
          id: line.id,
          atMs: line.atMs,
          timeLabel: line.timeLabel,
          japanese: line.japanese,
          translation: line.translation,
        })),
        vocab: normalizedVocab.map((entry) => ({
          id: entry.id,
          lineId: entry.lineId,
          word: entry.word,
          furigana: entry.furigana,
          meaning: entry.meaning,
          example: entry.example,
          exampleTranslation: entry.exampleTranslation,
        })),
        reviewRequestedAt: payload.reviewRequestedAt ?? null,
      },
    }
  }

  async getHomeData(): Promise<HomePayload> {
    await wait()
    return structuredClone({
      ...homePayload,
      newReleases: homePayload.newReleases.map((item) =>
        normalizeMusicItem(item as LegacyMusicItem),
      ),
      trendingSongs: homePayload.trendingSongs.map((item) =>
        normalizeMusicItem(item as LegacyMusicItem),
      ),
    })
  }

  async searchMusic(
    query = '',
    options?: { includeUnpublished?: boolean },
  ): Promise<MusicItem[]> {
    const rows = await this.fetchMusicRows(options?.includeUnpublished ?? false)

    if (!rows) {
      await wait()
      return buildFallbackMusicItems(query)
    }

    return applySearchFilter(
      await enrichMusicCreatorRoles(
        rows.map((row) => buildMusicItemFromSupabase(row)),
      ),
      query,
    )
  }

  async getMusicById(
    id: string,
    options?: { includeUnpublished?: boolean },
  ): Promise<MusicItem | undefined> {
    const includeUnpublished = options?.includeUnpublished ?? false
    const row =
      (await this.fetchMusicRowById(id, includeUnpublished)) ??
      (await this.findMusicRowInCollection(id, includeUnpublished))

    if (!row) {
      await wait()
      return buildFallbackMusicById(id)
    }

    const [item] = await enrichMusicCreatorRoles([
      buildMusicItemFromSupabase(row),
    ])
    return item
  }

  async getMusicQuizQuestions(
    id: string,
    locale: 'zh' | 'en' | 'ja',
  ): Promise<MusicQuizQuestion[]> {
    await wait()
    const item = await this.getMusicById(id)
    if (!item) {
      return []
    }

    const allVocabs = flattenMusicVocabs(item).filter(
      ({ vocab }) =>
        getLocalizedMeaning(vocab.meaning, locale).trim().length > 0,
    )
    const selectedKeys = item.quizVocabKeys
    const selectedVocabs = allVocabs.filter(({ key }) =>
      selectedKeys.includes(key),
    )

    return selectedVocabs.map(({ key, vocab }, index) => {
      const correctMeaning = getLocalizedMeaning(vocab.meaning, locale)
      const wrongOptions = allVocabs
        .filter(
          ({ key: candidateKey, vocab: candidateVocab }) =>
            candidateKey !== key &&
            getLocalizedMeaning(candidateVocab.meaning, locale) !==
              correctMeaning,
        )
        .map(({ vocab: candidateVocab }) =>
          getLocalizedMeaning(candidateVocab.meaning, locale),
        )
        .slice(index, index + 2)

      const fallbackWrongOptions = allVocabs
        .map(({ vocab: candidateVocab }) =>
          getLocalizedMeaning(candidateVocab.meaning, locale),
        )
        .filter((value) => value !== correctMeaning)

      const uniqueWrongOptions = [
        ...new Set([...wrongOptions, ...fallbackWrongOptions]),
      ].slice(0, 2)

      const options = [correctMeaning, ...uniqueWrongOptions]

      return {
        key,
        word: vocab.word,
        furigana: vocab.furigana,
        correctMeaning,
        options: options.sort((left, right) =>
          `${key}-${left}`.localeCompare(`${key}-${right}`),
        ),
      }
    })
  }

  async getMusicQuizSelection(
    id: string,
    options?: { includeUnpublished?: boolean },
  ) {
    await wait()
    const item = await this.getMusicById(id, options)
    if (!item) {
      return undefined
    }

    return {
      music: item,
      selectedKeys: [...item.quizVocabKeys],
      vocabEntries: flattenMusicVocabs(item),
    }
  }

  async getLatestMusicQuizAttempt(
    musicId: string,
  ): Promise<MusicQuizAttemptRecord | null> {
    if (!hasSupabaseConfig) {
      await wait(120)
      return null
    }

    const actorId = await getCurrentActorId()
    if (!actorId) {
      return null
    }

    const { data, error } = await supabase
      .from('music_quiz_attempt')
      .select(
        `
          id,
          music_id,
          user_id,
          score,
          total_questions,
          created_at,
          music_quiz_attempt_answer (
            question_key,
            selected_meaning,
            correct_meaning,
            is_correct,
            seq_no
          )
        `,
      )
      .eq('music_id', musicId)
      .eq('user_id', actorId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      logSupabaseQueryError('getLatestMusicQuizAttempt', error)
      throw new Error(error.message)
    }

    if (!data) {
      return null
    }

    return buildMusicQuizAttemptRecordFromSupabase(
      data as SupabaseMusicQuizAttemptRow,
    )
  }

  async submitMusicQuizAttempt(input: {
    musicId: string
    answers: Array<{
      questionKey: string
      selectedMeaning: string
      correctMeaning: string
    }>
  }): Promise<MusicQuizAttemptRecord | null> {
    if (!hasSupabaseConfig) {
      await wait(180)
      return null
    }

    const actorId = await getCurrentActorId()
    if (!actorId) {
      throw new Error('Please sign in to save quiz results.')
    }

    const normalizedAnswers = input.answers.map((answer, index) => ({
      ...answer,
      seqNo: index,
      isCorrect: answer.selectedMeaning === answer.correctMeaning,
    }))

    const score = normalizedAnswers.reduce(
      (total, answer) => total + (answer.isCorrect ? 1 : 0),
      0,
    )

    const { data: existingAttempt, error: existingAttemptError } =
      await supabase
        .from('music_quiz_attempt')
        .select('id')
        .eq('music_id', input.musicId)
        .eq('user_id', actorId)
        .maybeSingle()

    if (existingAttemptError) {
      logSupabaseQueryError(
        'submitMusicQuizAttempt.findExistingAttempt',
        existingAttemptError,
      )
      throw new Error(existingAttemptError.message)
    }

    let attempt: {
      id: string
      music_id: string
      user_id: string
      score: number
      total_questions: number
      created_at: string | null
    } | null = null

    if (existingAttempt) {
      const { data: updatedAttempt, error: updateAttemptError } = await supabase
        .from('music_quiz_attempt')
        .update({
          score,
          total_questions: normalizedAnswers.length,
          updated_by: actorId,
        })
        .eq('id', existingAttempt.id)
        .select('id, music_id, user_id, score, total_questions, created_at')
        .single()

      if (updateAttemptError) {
        logSupabaseQueryError(
          'submitMusicQuizAttempt.updateAttempt',
          updateAttemptError,
        )
        throw new Error(updateAttemptError.message)
      }

      const { error: deleteAnswersError } = await supabase
        .from('music_quiz_attempt_answer')
        .delete()
        .eq('attempt_id', existingAttempt.id)

      if (deleteAnswersError) {
        logSupabaseQueryError(
          'submitMusicQuizAttempt.deleteExistingAnswers',
          deleteAnswersError,
        )
        throw new Error(deleteAnswersError.message)
      }

      attempt = updatedAttempt
    } else {
      const { data: insertedAttempt, error: insertAttemptError } =
        await supabase
          .from('music_quiz_attempt')
          .insert({
            music_id: input.musicId,
            user_id: actorId,
            score,
            total_questions: normalizedAnswers.length,
            created_by: actorId,
            updated_by: actorId,
          })
          .select('id, music_id, user_id, score, total_questions, created_at')
          .single()

      if (insertAttemptError) {
        logSupabaseQueryError(
          'submitMusicQuizAttempt.insertAttempt',
          insertAttemptError,
        )
        throw new Error(insertAttemptError.message)
      }

      attempt = insertedAttempt
    }

    if (normalizedAnswers.length > 0) {
      const { error: answersError } = await supabase
        .from('music_quiz_attempt_answer')
        .insert(
          normalizedAnswers.map((answer) => ({
            attempt_id: attempt.id,
            question_key: answer.questionKey,
            seq_no: answer.seqNo,
            selected_meaning: answer.selectedMeaning,
            correct_meaning: answer.correctMeaning,
            is_correct: answer.isCorrect,
            created_by: actorId,
            updated_by: actorId,
          })),
        )

      if (answersError) {
        logSupabaseQueryError(
          'submitMusicQuizAttempt.insertAnswers',
          answersError,
        )
        throw new Error(answersError.message)
      }
    }

    if (!attempt) {
      throw new Error('Quiz attempt could not be saved.')
    }

    return {
      id: attempt.id,
      musicId: attempt.music_id,
      userId: attempt.user_id,
      score: attempt.score,
      totalQuestions: attempt.total_questions,
      createdAt: attempt.created_at ?? undefined,
      answers: normalizedAnswers.map((answer) => ({
        questionKey: answer.questionKey,
        selectedMeaning: answer.selectedMeaning,
        correctMeaning: answer.correctMeaning,
        isCorrect: answer.isCorrect,
      })),
    }
  }

  async searchArticles(query = ''): Promise<ArticleItem[]> {
    const rows = await this.fetchArticleRows(false)
    if (rows) {
      const keyword = query.trim().toLowerCase()
      const items = rows.map((row) => buildArticleItemFromSupabase(row))

      if (!keyword) {
        return items
      }

      return items.filter((item) =>
        [item.title, item.artist, item.type].some((value) =>
          value.toLowerCase().includes(keyword),
        ),
      )
    }

    await wait()
    const keyword = query.trim().toLowerCase()
    if (!keyword) return structuredClone(articleCatalog)

    return structuredClone(
      articleCatalog.filter((item) =>
        [item.title, item.artist, item.type].some((value) =>
          value.toLowerCase().includes(keyword),
        ),
      ),
    )
  }

  async searchMusicUploads(ownerId?: string): Promise<MusicItem[]> {
    if (!hasSupabaseConfig) {
      await wait()
      return buildFallbackMusicItems('').filter(
        (item) => !ownerId || item.createdBy === ownerId,
      )
    }

    let query = supabase
      .from('music')
      .select(MUSIC_SELECT)
      .order('created_at', { ascending: false })

    if (ownerId) {
      query = query.eq('created_by', ownerId)
    }

    const { data, error } = await query

    if (error) {
      logSupabaseQueryError('searchMusicUploads', error)
      return []
    }

    return enrichMusicCreatorRoles(
      (data ?? []).map((row) =>
        buildMusicItemFromSupabase(row as SupabaseMusicRow),
      ),
    )
  }

  async searchArticleUploads(ownerId?: string): Promise<ArticleItem[]> {
    if (!hasSupabaseConfig) {
      await wait()
      return structuredClone(articleCatalog).filter(
        (item) => !ownerId || item.createdBy === ownerId,
      )
    }

    let query = supabase
      .from('article')
      .select(
        'id, created_by, title, type, artist, thumbnail_url, content_json, is_published',
      )
      .order('created_at', { ascending: false })

    if (ownerId) {
      query = query.eq('created_by', ownerId)
    }

    const { data, error } = await query

    if (error) {
      logSupabaseQueryError('searchArticleUploads', error)
      return []
    }

    return (data ?? []).map((row) =>
      buildArticleItemFromSupabase(row as SupabaseArticleRow),
    )
  }

  async getArticleById(
    id: string,
    options?: { includeUnpublished?: boolean },
  ): Promise<ArticleItem | undefined> {
    const includeUnpublished = options?.includeUnpublished ?? false
    const row =
      (await this.fetchArticleRowById(id, includeUnpublished)) ??
      (await this.findArticleRowInCollection(id, includeUnpublished))

    if (row) {
      return buildArticleItemFromSupabase(row)
    }

    await wait()
    return structuredClone(articleCatalog.find((item) => item.id === id))
  }

  async submitWish(payload: WishPayload) {
    const normalizedPayload = {
      artist: payload.artist.trim(),
      title: payload.title.trim(),
      genre: payload.genre.trim(),
      url: payload.url.trim(),
    }

    if (
      !normalizedPayload.artist ||
      !normalizedPayload.title ||
      !normalizedPayload.genre ||
      !normalizedPayload.url
    ) {
      throw new Error('Please complete every field before submitting.')
    }

    if (!isValidYoutubeUrl(normalizedPayload.url)) {
      throw new Error('Please enter a valid YouTube link.')
    }

    await this.assertMusicSourceUrlIsUnique(normalizedPayload.url)

    const actorId = hasSupabaseConfig ? await getCurrentActorId() : null
    const draftResponse = actorId
      ? await this.createMusic(
          {
            sourceUrl: normalizedPayload.url,
            title: normalizedPayload.title,
            artist: normalizedPayload.artist,
            genre: normalizedPayload.genre,
            lyrics: [],
            vocab: [],
            submissionSource: 'wish',
          },
          { isPublished: false },
        )
      : null

    if (hasSupabaseConfig) {
      const { data, error } = await supabase
        .from('wish_request')
        .insert({
          artist: normalizedPayload.artist,
          title: normalizedPayload.title,
          genre: normalizedPayload.genre,
          url: normalizedPayload.url,
          created_by: actorId,
          updated_by: actorId,
        })
        .select('id')
        .single()

      if (error) {
        throw new Error(error.message)
      }

      return {
        ok: true,
        id: data.id,
        musicId: draftResponse?.id,
        message: `Wish submitted for ${normalizedPayload.artist} - ${normalizedPayload.title}`,
      }
    }

    await wait(320)
    return {
      ok: true,
      musicId: draftResponse?.id,
      message: `Wish submitted for ${normalizedPayload.artist} - ${normalizedPayload.title}`,
    }
  }

  async getCurrentUser() {
    await wait(80)
    return structuredClone(mockUser)
  }

  async searchExampleSentence(keyword: string, lang = 'jpn') {
    const normalizedKeyword = keyword.trim()
    if (!normalizedKeyword) {
      return ''
    }

    const params = new URLSearchParams({
      q: normalizedKeyword,
      lang,
      sort: 'relevance',
    })

    try {
      const response = await fetch(
        `https://api.tatoeba.org/v1/sentences?${params.toString()}`,
      )

      if (!response.ok) {
        return ''
      }

      const payload = (await response.json()) as {
        data?: Array<{ text?: string }>
      }

      return payload.data?.[0]?.text?.trim() ?? ''
    } catch {
      return ''
    }
  }

  async createMusic(
    payload: MusicDraftPayload,
    options?: { isPublished?: boolean },
  ) {
    await this.assertMusicSourceUrlIsUnique(payload.sourceUrl)

    return this.persistMusic(
      crypto.randomUUID(),
      payload,
      options?.isPublished ?? false,
      payload.submissionSource ?? 'upload',
    )
  }

  async updateMusic(
    id: string,
    payload: MusicDraftPayload,
    options?: { isPublished?: boolean },
  ) {
    await this.assertMusicSourceUrlIsUnique(payload.sourceUrl, {
      excludeMusicId: id,
    })

    const existing = await this.getMusicById(id, { includeUnpublished: true })

    return this.persistMusic(
      id,
      payload,
      options?.isPublished ?? existing?.isPublished ?? false,
      payload.submissionSource ?? existing?.submissionSource ?? 'upload',
    )
  }

  async updateMusicQuiz(id: string, quizVocabKeys: string[]) {
    if (!hasSupabaseConfig) {
      await wait(240)
      musicQuizSelections.set(id, [...quizVocabKeys])
      return { ok: true, id, quizVocabKeys }
    }

    const actorId = await getCurrentActorId()

    const { error: clearError } = await supabase
      .from('music_vocab')
      .update({
        is_quiz_enabled: false,
        updated_by: actorId,
      })
      .eq('music_id', id)

    if (clearError) {
      throw new Error(clearError.message)
    }

    if (quizVocabKeys.length > 0) {
      const { error: enableError } = await supabase
        .from('music_vocab')
        .update({
          is_quiz_enabled: true,
          updated_by: actorId,
        })
        .in('id', quizVocabKeys)

      if (enableError) {
        throw new Error(enableError.message)
      }
    }

    return { ok: true, id, quizVocabKeys }
  }

  async deleteMusic(id: string) {
    const existing = await this.getMusicById(id, { includeUnpublished: true })

    if (!existing) {
      throw new Error('Music not found.')
    }

    if (existing.isPublished) {
      throw new Error('Published music cannot be deleted.')
    }

    if (!hasSupabaseConfig) {
      await wait(180)
      musicQuizSelections.delete(id)
      return { ok: true, id }
    }

    const { error } = await supabase.from('music').delete().eq('id', id)

    if (error) {
      logSupabaseQueryError('deleteMusic', error)
      throw new Error(error.message)
    }

    return { ok: true, id }
  }

  async createArticle(
    payload: ArticleDraftPayload,
    options?: { isPublished?: boolean },
  ) {
    if (hasSupabaseConfig) {
      const actorId = await getCurrentActorId()
      const id = crypto.randomUUID()
      const { error } = await supabase.from('article').insert({
        id,
        title: payload.title,
        type: payload.type,
        artist: payload.artist,
        thumbnail_url: payload.thumbnailUrl,
        content_json: payload.content,
        is_published: options?.isPublished ?? false,
        created_by: actorId,
        updated_by: actorId,
      })

      if (error) {
        throw new Error(error.message)
      }

      return {
        ok: true,
        id,
        payload,
        isPublished: options?.isPublished ?? false,
      }
    }

    await wait(280)
    return {
      ok: true,
      id: 'draft-article',
      payload,
      isPublished: options?.isPublished ?? false,
    }
  }

  async updateArticle(
    id: string,
    payload: ArticleDraftPayload,
    options?: { isPublished?: boolean },
  ) {
    if (hasSupabaseConfig) {
      const actorId = await getCurrentActorId()
      const { error } = await supabase
        .from('article')
        .update({
          title: payload.title,
          type: payload.type,
          artist: payload.artist,
          thumbnail_url: payload.thumbnailUrl,
          content_json: payload.content,
          is_published: options?.isPublished ?? false,
          updated_by: actorId,
        })
        .eq('id', id)

      if (error) {
        throw new Error(error.message)
      }

      return {
        ok: true,
        id,
        payload,
        isPublished: options?.isPublished ?? false,
      }
    }

    await wait(280)
    return { ok: true, id, payload, isPublished: options?.isPublished ?? false }
  }

  async searchAdminArticles(query = ''): Promise<ArticleItem[]> {
    const rows = await this.fetchArticleRows(true)
    if (rows) {
      const keyword = query.trim().toLowerCase()
      const items = rows.map((row) => buildArticleItemFromSupabase(row))

      if (!keyword) {
        return items
      }

      return items.filter((item) =>
        [item.title, item.artist, item.type].some((value) =>
          value.toLowerCase().includes(keyword),
        ),
      )
    }

    return this.searchArticles(query)
  }

  async getWishRequests(options?: {
    ownerId?: string
  }): Promise<WishRequestItem[]> {
    if (hasSupabaseConfig) {
      let query = supabase
        .from('wish_request')
        .select('id, artist, title, genre, url, status, created_at')
        .order('created_at', { ascending: false })

      if (options?.ownerId) {
        query = query.eq('created_by', options.ownerId)
      }

      const { data, error } = await query

      if (error) {
        throw new Error(error.message)
      }

      return (data ?? []).map((row) =>
        buildWishRequestItemFromSupabase(row as SupabaseWishRow),
      )
    }

    await wait(160)
    return []
  }

  async deleteWishRequest(id: string) {
    if (hasSupabaseConfig) {
      const { error } = await supabase
        .from('wish_request')
        .delete()
        .eq('id', id)
      if (error) {
        throw new Error(error.message)
      }

      return { ok: true, id }
    }

    await wait(160)
    return { ok: true, id }
  }
}

export const backendService = new BackendService()
