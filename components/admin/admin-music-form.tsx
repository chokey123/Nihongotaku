'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { backendService } from '@/lib/services/backend-service'
import { aiService } from '@/lib/services/ai-service'
import {
  loadJachDictionary,
  lookupJachDictionary,
  normalizeJapaneseReading,
} from '@/lib/services/jachdict-client'
import { useYoutubeThumbnail } from '@/components/ui/use-youtube-thumbnail'
import type { Dictionary } from '@/lib/i18n'
import type {
  LocalizedText,
  Locale,
  LyricLine,
  MusicVocabItem,
  MusicDraftPayload,
  MusicItem,
  VocabItem,
  VocabDifficulty,
} from '@/lib/types'

const translationLocales: Locale[] = ['zh', 'en', 'ja']

const publishActionLabels: Record<
  Locale,
  {
    draftSaved: string
    published: string
    unpublished: string
    publish: string
    unpublish: string
    publishedState: string
    draftState: string
    saveFailed: string
  }
> = {
  zh: {
    draftSaved: '草稿已保存',
    published: '已发布',
    unpublished: '已撤回发布',
    publish: '发布',
    unpublish: '撤回发布',
    publishedState: '已发布',
    draftState: '草稿',
    saveFailed: '保存失败',
  },
  en: {
    draftSaved: 'Draft saved',
    published: 'Published',
    unpublished: 'Unpublished',
    publish: 'Publish',
    unpublish: 'Unpublish',
    publishedState: 'Published',
    draftState: 'Draft',
    saveFailed: 'Save failed',
  },
  ja: {
    draftSaved: '下書きを保存しました',
    published: '公開しました',
    unpublished: '公開を取り下げました',
    publish: '公開',
    unpublish: '公開取り下げ',
    publishedState: '公開中',
    draftState: '下書き',
    saveFailed: '保存に失敗しました',
  },
}

interface KuromojiToken {
  surface_form: string
  basic_form: string
  reading?: string
  pos?: string
}

interface KuromojiTokenizer {
  tokenize: (text: string) => KuromojiToken[]
}

type LrcUploadLocale = 'ja' | 'zh' | 'en'

interface VocabContextMenuState {
  lineId: string
  selectedText: string
  basicForm: string
  reading: string
}

const localizedFieldLabels: Record<
  Locale,
  {
    japaneseLyrics: string
    translation: string
    word: string
    furigana: string
    difficulty?: string
    meaning: string
    example: string
    exampleTranslation: string
    translationLanguage: string
  }
> = {
  zh: {
    japaneseLyrics: '日语原文',
    translation: '翻译',
    word: '单词原文',
    furigana: '振假名',
    meaning: '意思',
    example: '例句',
    exampleTranslation: '例句翻译',
    translationLanguage: '翻译语言',
  },
  en: {
    japaneseLyrics: 'Japanese lyrics',
    translation: 'Translation',
    word: 'Word',
    furigana: 'Furigana',
    meaning: 'Meaning',
    example: 'Example sentence',
    exampleTranslation: 'Example translation',
    translationLanguage: 'Translation language',
  },
  ja: {
    japaneseLyrics: '日本語歌詞',
    translation: '翻訳',
    word: '単語',
    furigana: 'ふりがな',
    meaning: '意味',
    example: '例文',
    exampleTranslation: '例文の翻訳',
    translationLanguage: '翻訳言語',
  },
}

const adminMusicUiLabels: Record<
  Locale,
  {
    expandAll: string
    collapseAll: string
    shiftEarlier?: string
    shiftLater?: string
    line: string
    vocabCount: string
    translated: string
    missing: string
    addVocab: string
    addingVocab: string
    collapse: string
    delete: string
    vocabTitle: string
  }
> = {
  zh: {
    expandAll: '全部展開',
    collapseAll: '全部收合',
    line: '第',
    vocabCount: '個單字',
    translated: '已翻譯',
    missing: '缺少翻譯',
    addVocab: '加入單字',
    addingVocab: '加入中...',
    collapse: '收合',
    delete: '刪除',
    vocabTitle: '單字',
  },
  en: {
    expandAll: 'Expand all',
    collapseAll: 'Collapse all',
    line: 'Line',
    vocabCount: 'vocab',
    translated: 'translated',
    missing: 'missing',
    addVocab: 'Add vocab',
    addingVocab: 'Adding...',
    collapse: 'Collapse',
    delete: 'Delete',
    vocabTitle: 'Vocab',
  },
  ja: {
    expandAll: 'すべて展開',
    collapseAll: 'すべて折りたたむ',
    line: '行',
    vocabCount: '語',
    translated: '翻訳済み',
    missing: '未翻訳',
    addVocab: '単語を追加',
    addingVocab: '追加中...',
    collapse: '折りたたむ',
    delete: '削除',
    vocabTitle: '単語',
  },
}

const adminMusicFlowLabels: Record<
  Locale,
  {
    uploadSectionTitle: string
    uploadSectionHint: string
    uploadLockedHint: string
    saveDraftFirst: string
    preview: string
    publishFromPreview: string
    fileTooLarge: string
    tooManyLines: string
    invalidLrc: string
    uploadJapaneseFirst: string
    timelineMismatch: string
    metadataRequired: string
    lrcImported: string
  }
> = {
  zh: {
    uploadSectionTitle: 'LRC 匯入',
    uploadSectionHint: '請在這裡分別上傳日文、中文與英文 LRC。',
    uploadLockedHint:
      '請先填完網址、歌手、標題、曲風，並先儲存草稿，之後才會開放 LRC 上傳。',
    saveDraftFirst: '請先儲存草稿',
    preview: '預覽',
    publishFromPreview: '從預覽發佈',
    fileTooLarge: 'LRC 檔案不可超過 100KB。',
    tooManyLines: 'LRC 行數不可超過 300 行。',
    invalidLrc: 'LRC 格式不正確，無法解析。',
    uploadJapaneseFirst: '請先上傳日文原文 LRC。',
    timelineMismatch: '翻譯 LRC 的時間軸必須與日文原文完全一致。',
    metadataRequired: '請先填寫網址、歌手、標題與曲風。',
    lrcImported: 'LRC 已匯入。',
  },
  en: {
    uploadSectionTitle: 'LRC Import',
    uploadSectionHint: 'Upload Japanese, Chinese, and English LRC files here.',
    uploadLockedHint:
      'Fill in URL, artist, title, and genre, then save a draft first to unlock LRC upload.',
    saveDraftFirst: 'Save the draft first.',
    preview: 'Preview',
    publishFromPreview: 'Publish from preview',
    fileTooLarge: 'LRC files must be 100KB or smaller.',
    tooManyLines: 'LRC files cannot exceed 300 lines.',
    invalidLrc: 'Invalid LRC format. The file was not parsed.',
    uploadJapaneseFirst: 'Upload the Japanese LRC first.',
    timelineMismatch:
      'Translation LRC timestamps must exactly match the Japanese lyrics.',
    metadataRequired: 'Please fill in URL, artist, title, and genre first.',
    lrcImported: 'LRC imported.',
  },
  ja: {
    uploadSectionTitle: 'LRC 取り込み',
    uploadSectionHint:
      'ここで日本語・中国語・英語の LRC をそれぞれアップロードします。',
    uploadLockedHint:
      'URL、アーティスト、タイトル、ジャンルを入力して下書きを保存すると、LRC アップロードが使えるようになります。',
    saveDraftFirst: '先に下書きを保存してください。',
    preview: 'プレビュー',
    publishFromPreview: 'プレビューから公開',
    fileTooLarge: 'LRC ファイルは 100KB 以下にしてください。',
    tooManyLines: 'LRC は 300 行以内にしてください。',
    invalidLrc: 'LRC の形式が正しくないため解析できませんでした。',
    uploadJapaneseFirst: '先に日本語の LRC をアップロードしてください。',
    timelineMismatch:
      '翻訳 LRC のタイムラインは日本語歌詞と完全一致している必要があります。',
    metadataRequired:
      '先に URL、アーティスト、タイトル、ジャンルを入力してください。',
    lrcImported: 'LRC を取り込みました。',
  },
}

const lrcLinePattern = /^\[(\d{2}):(\d{2})(?:\.(\d{2}))?\](.*)$/
const lrcMetadataPattern = /^\[[A-Za-z]+:[^\]]*\]$/

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

const vocabDifficultyOptions: VocabDifficulty[] = [
  'beginner',
  'intermediate',
  'hard',
]

const vocabDifficultyLabels: Record<
  Locale,
  Record<VocabDifficulty, string>
> = {
  zh: {
    beginner: '初级',
    intermediate: '中级',
    hard: '困难',
  },
  en: {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    hard: 'Hard',
  },
  ja: {
    beginner: '初級',
    intermediate: '中級',
    hard: '難しい',
  },
}

function emptyLocalizedText(): LocalizedText {
  return {
    zh: '',
    en: '',
    ja: '',
  }
}

function createEmptyVocab(): VocabItem {
  return {
    word: '',
    furigana: '',
    difficulty: 'intermediate',
    meaning: emptyLocalizedText(),
    example: '',
    exampleTranslation: emptyLocalizedText(),
  }
}

function createEmptyMusicVocab(lineId: string, id: string): MusicVocabItem {
  return {
    id,
    lineId,
    ...createEmptyVocab(),
  }
}

function extractBaseWord(tokens: KuromojiToken[]) {
  return (
    tokens.find((token) => token.pos === '動詞')?.basic_form ??
    tokens[0]?.basic_form ??
    ''
  )
}

function parseLrc(content: string): LyricLine[] {
  return parseLrcRows(content).map((row, index) => ({
    id: `lrc-${index}`,
    atMs: row.atMs,
    timeLabel: row.timeLabel,
    japanese: row.text,
    translation: emptyLocalizedText(),
  }))
}

function parseLrcRows(content: string) {
  return content
    .split(/\r?\n/)
    .reduce<
      Array<{ atMs: number; timeLabel: string; text: string }>
    >((lines, row) => {
      const matched = row.match(lrcLinePattern)
      if (!matched) return lines

      const [, mm, ss, cs = '00', lyric] = matched
      const atMs =
        Number(mm) * 60_000 + Number(ss) * 1000 + Number(cs.padEnd(3, '0'))

      lines.push({
        atMs,
        timeLabel: `${mm}:${ss}`,
        text: lyric.trim(),
      })

      return lines
    }, [])
}

function validateLrcContent(content: string) {
  const nonEmptyLines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (nonEmptyLines.length === 0 || nonEmptyLines.length > 300) {
    return {
      ok: false,
      reason: nonEmptyLines.length === 0 ? 'invalid' : 'tooManyLines',
      rows: [],
    } as const
  }

  const hasInvalidLine = nonEmptyLines.some(
    (line) => !lrcLinePattern.test(line) && !lrcMetadataPattern.test(line),
  )

  if (hasInvalidLine) {
    return {
      ok: false,
      reason: 'invalid',
      rows: [],
    } as const
  }

  const rows = parseLrcRows(content)

  if (rows.length === 0) {
    return {
      ok: false,
      reason: 'invalid',
      rows: [],
    } as const
  }

  return {
    ok: true,
    rows,
  } as const
}

function extractYoutubeIdFromUrl(value: string) {
  const normalized = value.trim()

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
    return ''
  }
}

function mergeTranslationFromLrc(
  currentLyrics: LyricLine[],
  content: string,
  locale: Locale,
) {
  const translationRows = parseLrcRows(content)
  const translationMap = new Map(
    translationRows.map((row) => [row.atMs, row.text]),
  )

  return currentLyrics.map((line) => ({
    ...line,
    translation: {
      ...line.translation,
      [locale]: translationMap.get(line.atMs) ?? line.translation[locale] ?? '',
    },
  }))
}

function formatTimeLabel(atMs: number) {
  const totalSeconds = Math.floor(atMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0')
  const seconds = (totalSeconds % 60).toString().padStart(2, '0')

  return `${minutes}:${seconds}`
}

function shiftLyricsTiming(currentLyrics: LyricLine[], deltaMs: number) {
  return currentLyrics.map((line) => {
    const nextAtMs = Math.max(0, line.atMs + deltaMs)

    return {
      ...line,
      atMs: nextAtMs,
      timeLabel: formatTimeLabel(nextAtMs),
    }
  })
}

function FormField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="space-y-2 text-sm">
      <span className="block font-medium text-muted">{label}</span>
      {children}
    </label>
  )
}

export function AdminMusicForm({
  dict,
  initialMusic,
  mode,
  initialLocale = 'zh',
  basePath = 'admin',
  canPublish = true,
}: {
  dict: Dictionary
  initialMusic?: MusicItem
  mode: 'create' | 'edit'
  initialLocale?: Locale
  basePath?: 'admin' | 'upload'
  canPublish?: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState('')
  const [submitAction, setSubmitAction] = useState<
    'draft' | 'publish' | 'unpublish' | null
  >(null)
  const [translationLocale, setTranslationLocale] =
    useState<Locale>(initialLocale)
  const [lyrics, setLyrics] = useState<LyricLine[]>(initialMusic?.lyrics ?? [])
  const [vocabs, setVocabs] = useState<MusicVocabItem[]>(
    initialMusic?.vocab ?? [],
  )
  const [isPublished, setIsPublished] = useState(
    initialMusic?.isPublished ?? false,
  )
  const [collapsedLineIds, setCollapsedLineIds] = useState<string[]>([])
  const [tokenizerState, setTokenizerState] = useState<
    'loading' | 'ready' | 'error'
  >('loading')
  const [isAddingVocab, setIsAddingVocab] = useState(false)
  const [isGettingAiVocabs, setIsGettingAiVocabs] = useState(false)
  const [pendingSelection, setPendingSelection] =
    useState<VocabContextMenuState | null>(null)
  const [sourceUrl, setSourceUrl] = useState(
    initialMusic?.sourceUrl ??
      (initialMusic
        ? `https://youtube.com/watch?v=${initialMusic.youtubeId}`
        : ''),
  )
  const [title, setTitle] = useState(initialMusic?.title ?? '')
  const [artist, setArtist] = useState(initialMusic?.artist ?? '')
  const [genre, setGenre] = useState(initialMusic?.genre ?? '')
  const [artistSuggestions, setArtistSuggestions] = useState<string[]>([])
  const [genreSuggestions, setGenreSuggestions] = useState<string[]>([])
  const [isArtistSuggestionOpen, setIsArtistSuggestionOpen] = useState(false)
  const [isGenreSuggestionOpen, setIsGenreSuggestionOpen] = useState(false)
  const [reviewRequestedAt, setReviewRequestedAt] = useState<string | null>(
    initialMusic?.reviewRequestedAt ?? null,
  )
  const labels = localizedFieldLabels[translationLocale]
  const uiLabels = adminMusicUiLabels[translationLocale]
  const flowLabels = adminMusicFlowLabels[initialLocale]
  const publishLabels = publishActionLabels[initialLocale]
  const youtubeIdPreview = extractYoutubeIdFromUrl(sourceUrl)
  const youtubeThumbnailUrl = useYoutubeThumbnail(youtubeIdPreview)
  const isUploadFlow = basePath === 'upload'
  const canRequestReview = isUploadFlow && !canPublish && mode === 'edit'
  const hasRequiredMetadata = [sourceUrl, title, artist, genre].every(
    (value) => value.trim().length > 0,
  )
  const lrcUploadUnlocked = mode === 'edit' && hasRequiredMetadata
  const artistDropdownSuggestions = useMemo(
    () => getClosestSuggestions(artist, artistSuggestions),
    [artist, artistSuggestions],
  )
  const genreDropdownSuggestions = useMemo(
    () => getClosestSuggestions(genre, genreSuggestions),
    [genre, genreSuggestions],
  )
  const canPreview =
    mode === 'edit' &&
    Boolean(initialMusic?.id) &&
    lyrics.length > 0 &&
    lyrics.every(
      (line) =>
        line.japanese.trim().length > 0 &&
        Object.values(line.translation).some((value) => value?.trim().length),
    )
  const isContentComplete =
    lyrics.length > 0 &&
    lyrics.every(
      (line) =>
        line.japanese.trim().length > 0 &&
        Object.values(line.translation).some((value) => value?.trim().length),
    ) &&
    vocabs.length > 5
  const areAllCollapsed =
    lyrics.length > 0 && collapsedLineIds.length === lyrics.length
  const tokenizerRef = useRef<KuromojiTokenizer | null>(null)
  const dictionaryRef = useRef<Awaited<
    ReturnType<typeof loadJachDictionary>
  > | null>(null)
  const previousLyricIdsRef = useRef<string>(
    lyrics.map((line) => line.id).join('|'),
  )
  const addVocabButtonPointerDownRef = useRef(false)

  const applyLrcUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    locale: LrcUploadLocale,
  ) => {
    const resetInput = () => {
      event.target.value = ''
    }

    const file = event.target.files?.[0]
    if (!file) return

    if (!lrcUploadUnlocked) {
      setStatus(flowLabels.saveDraftFirst)
      resetInput()
      return
    }

    if (file.size > 100 * 1024) {
      setStatus(flowLabels.fileTooLarge)
      resetInput()
      return
    }

    const content = await file.text()
    const validation = validateLrcContent(content)

    if (!validation.ok) {
      setStatus(
        validation.reason === 'tooManyLines'
          ? flowLabels.tooManyLines
          : flowLabels.invalidLrc,
      )
      resetInput()
      return
    }

    if (locale === 'ja') {
      setLyrics(parseLrc(content))
      setVocabs((current) =>
        current.filter((entry) =>
          validation.rows.some((row, index) => `lrc-${index}` === entry.lineId),
        ),
      )
      setStatus(flowLabels.lrcImported)
      resetInput()
      return
    }

    if (lyrics.length === 0) {
      setStatus(flowLabels.uploadJapaneseFirst)
      resetInput()
      return
    }

    const lyricTimeline = lyrics.map((line) => line.atMs)
    const translationTimeline = validation.rows.map((row) => row.atMs)
    const isExactTimelineMatch =
      lyricTimeline.length === translationTimeline.length &&
      lyricTimeline.every((atMs, index) => atMs === translationTimeline[index])

    if (!isExactTimelineMatch) {
      setStatus(flowLabels.timelineMismatch)
      resetInput()
      return
    }

    setLyrics((current) => mergeTranslationFromLrc(current, content, locale))
    setStatus(flowLabels.lrcImported)
    resetInput()
  }

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

  useEffect(() => {
    let isMounted = true

    import('kuromoji')
      .then((kuromojiModule) => {
        kuromojiModule
          .builder({
            dicPath: '/kuromoji/dict/',
          })
          .build((error: Error | null, tokenizer: KuromojiTokenizer) => {
            if (!isMounted) return

            if (error) {
              setTokenizerState('error')
              return
            }

            tokenizerRef.current = tokenizer
            setTokenizerState('ready')
          })
      })
      .catch(() => {
        if (isMounted) {
          setTokenizerState('error')
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    loadJachDictionary()
      .then((dictionaryMaps) => {
        if (!isMounted) return
        dictionaryRef.current = dictionaryMaps
      })
      .catch(() => {
        if (!isMounted) return
        dictionaryRef.current = null
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    const lyricIdsSignature = lyrics.map((line) => line.id).join('|')

    if (lyricIdsSignature === previousLyricIdsRef.current) {
      return
    }

    previousLyricIdsRef.current = lyricIdsSignature
    setCollapsedLineIds(lyrics.map((line) => line.id))
  }, [lyrics])

  const toggleLineCollapse = (lineId: string) => {
    setCollapsedLineIds((current) =>
      current.includes(lineId)
        ? current.filter((id) => id !== lineId)
        : [...current, lineId],
    )
  }

  const buildVocabFromSelection = (selectedText: string) => {
    const tokenizer = tokenizerRef.current
    const normalized = selectedText.trim()

    if (!tokenizer || !normalized) {
      return {
        basicForm: normalized,
        reading: '',
      }
    }

    const tokens = tokenizer
      .tokenize(normalized)
      .filter((token) => token.surface_form.trim().length > 0)

    if (tokens.length === 0) {
      return {
        basicForm: normalized,
        reading: '',
      }
    }

    const exactMatch = tokens.find((token) => token.surface_form === normalized)
    const relevantTokens = exactMatch
      ? [exactMatch]
      : tokens.map((token) => ({ ...token }))
    const baseWord = extractBaseWord(relevantTokens)
    const reading = relevantTokens
      .map((token) => token.reading ?? '')
      .join('')
      .trim()

    return {
      basicForm:
        baseWord && baseWord !== '*'
          ? baseWord
          : (relevantTokens[0]?.surface_form ?? normalized),
      reading,
    }
  }

  const openSelectionMenu = (lineId: string, selectedText: string) => {
    const normalized = selectedText.trim()
    if (!normalized) return

    const { basicForm, reading } = buildVocabFromSelection(normalized)

    setPendingSelection({
      lineId,
      selectedText: normalized,
      basicForm,
      reading,
    })
  }

  const syncSelectionForLine = (
    lineId: string,
    currentTarget: HTMLDivElement,
  ) => {
    const selection = window.getSelection()
    const selectedText = selection?.toString().trim() ?? ''

    if (
      !selectedText ||
      !selection ||
      selection.rangeCount === 0 ||
      !selection.anchorNode ||
      !selection.focusNode ||
      !currentTarget.contains(selection.anchorNode) ||
      !currentTarget.contains(selection.focusNode)
    ) {
      if (pendingSelection?.lineId === lineId) {
        setPendingSelection(null)
      }
      return
    }

    openSelectionMenu(lineId, selectedText)
  }

  const addSelectedVocab = async () => {
    if (!pendingSelection) return
    setIsAddingVocab(true)

    try {
      const exampleSentence = await backendService.searchExampleSentence(
        pendingSelection.basicForm,
        'jpn',
      )
      const dictionaryEntry = lookupJachDictionary(
        dictionaryRef.current,
        pendingSelection.basicForm,
        pendingSelection.reading,
      )
      const resolvedFurigana =
        dictionaryEntry?.reading ||
        normalizeJapaneseReading(pendingSelection.reading) ||
        ''

      setVocabs((current) => {
        const alreadyExists = current.some(
          (entry) =>
            entry.lineId === pendingSelection.lineId &&
            entry.word === pendingSelection.basicForm,
        )

        if (alreadyExists) {
          return current
        }

        return [
          ...current,
          {
            ...createEmptyMusicVocab(
              pendingSelection.lineId,
              `${pendingSelection.lineId}-${current.filter((entry) => entry.lineId === pendingSelection.lineId).length}`,
            ),
            word: pendingSelection.basicForm,
            furigana: resolvedFurigana,
            meaning: {
              ...emptyLocalizedText(),
              zh: dictionaryEntry?.meaning ?? '',
            },
            example: exampleSentence,
          },
        ]
      })

      setPendingSelection(null)
    } finally {
      setIsAddingVocab(false)
      addVocabButtonPointerDownRef.current = false
    }
  }

  const addVocabsFromAi = async () => {
    if (lyrics.length === 0) {
      setStatus(
        initialLocale === 'en'
          ? 'Please import or enter lyrics first.'
          : initialLocale === 'ja'
            ? '先に歌詞を入力または取り込んでください。'
            : '請先匯入或填寫歌詞。',
      )
      return
    }

    setIsGettingAiVocabs(true)

    try {
      const suggestions = await aiService.getMusicVocabsFromLyrics(lyrics)

      setVocabs((current) => {
        const nextVocabs = [...current]

        for (const suggestion of suggestions) {
          const duplicateIndex = nextVocabs.findIndex(
            (entry) =>
              entry.lineId === suggestion.lineId && entry.word === suggestion.word,
          )

          if (duplicateIndex >= 0) {
            const existing = nextVocabs[duplicateIndex]
            nextVocabs[duplicateIndex] = {
              ...existing,
              furigana: existing.furigana || suggestion.furigana,
              difficulty: existing.difficulty || suggestion.difficulty,
              meaning: {
                ...existing.meaning,
                zh: existing.meaning.zh || suggestion.meaningZh,
              },
              example: existing.example || suggestion.example,
              exampleTranslation: {
                ...existing.exampleTranslation,
                zh:
                  existing.exampleTranslation.zh ||
                  suggestion.exampleTranslationZh,
              },
            }
            continue
          }

          const nextId = `${suggestion.lineId}-${nextVocabs.filter((entry) => entry.lineId === suggestion.lineId).length}`
          nextVocabs.push({
            ...createEmptyMusicVocab(suggestion.lineId, nextId),
            word: suggestion.word,
            furigana: suggestion.furigana,
            difficulty: suggestion.difficulty,
            meaning: {
              ...emptyLocalizedText(),
              zh: suggestion.meaningZh,
            },
            example: suggestion.example,
            exampleTranslation: {
              ...emptyLocalizedText(),
              zh: suggestion.exampleTranslationZh,
            },
          })
        }

        return nextVocabs
      })

      setStatus(
        initialLocale === 'en'
          ? `AI vocab added: ${suggestions.length}`
          : initialLocale === 'ja'
            ? `AI単語を追加しました: ${suggestions.length}`
            : `AI 已加入單字：${suggestions.length}`,
      )
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : initialLocale === 'en'
            ? 'Failed to get vocab from AI.'
            : initialLocale === 'ja'
              ? 'AI から単語を取得できませんでした。'
              : '無法從 AI 取得單字。',
      )
    } finally {
      setIsGettingAiVocabs(false)
    }
  }

  const persistMusic = (
    nextPublished: boolean,
    action: 'draft' | 'publish' | 'unpublish',
  ) => {
    if (!hasRequiredMetadata) {
      setStatus(flowLabels.metadataRequired)
      return
    }

    const payload: MusicDraftPayload = {
      sourceUrl,
      title,
      artist,
      genre,
      lyrics,
      vocab: vocabs,
      reviewRequestedAt,
    }

    setSubmitAction(action)
    startTransition(async () => {
      try {
        const response =
          mode === 'create'
            ? await backendService.createMusic(payload, {
                isPublished: nextPublished,
              })
            : await backendService.updateMusic(
                initialMusic?.id ?? 'unknown',
                payload,
                {
                  isPublished: nextPublished,
                },
              )

        setIsPublished(response.isPublished)
        setStatus(
          action === 'publish'
            ? `${publishLabels.published} · ${response.id}`
            : action === 'unpublish'
              ? `${publishLabels.unpublished} · ${response.id}`
              : `${publishLabels.draftSaved} · ${response.id}`,
        )

        if (mode === 'create') {
          router.replace(
            action === 'publish'
              ? `/${initialLocale}/music/${response.id}`
              : `/${initialLocale}/${basePath}/music/${response.id}`,
          )
          return
        }

        if (action === 'publish') {
          router.replace(`/${initialLocale}/music/${response.id}`)
        }
      } catch (error) {
        setStatus(
          `${publishLabels.saveFailed}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        )
      } finally {
        setSubmitAction(null)
      }
    })
  }

  const completeReview = () => {
    if (!isContentComplete) {
      setStatus(
        initialLocale === 'en'
          ? 'Please complete the lyrics and vocab content first.'
          : initialLocale === 'ja'
            ? '先に歌詞と単語の内容を完成させてください。'
            : '請先完成歌詞與單字內容。',
      )
      return
    }

    const nextReviewRequestedAt = new Date().toISOString()
    setReviewRequestedAt(nextReviewRequestedAt)
    setSubmitAction('draft')
    startTransition(async () => {
      try {
        const payload: MusicDraftPayload = {
          sourceUrl,
          title,
          artist,
          genre,
          lyrics,
          vocab: vocabs,
          reviewRequestedAt: nextReviewRequestedAt,
        }

        const response =
          mode === 'create'
            ? await backendService.createMusic(payload, { isPublished: false })
            : await backendService.updateMusic(
                initialMusic?.id ?? 'unknown',
                payload,
                {
                  isPublished: false,
                },
              )

        setReviewRequestedAt(nextReviewRequestedAt)
        setStatus(
          initialLocale === 'en'
            ? `Marked complete · ${response.id}`
            : initialLocale === 'ja'
              ? `完成として送信しました · ${response.id}`
              : `已標記完成 · ${response.id}`,
        )
      } catch (error) {
        setStatus(
          error instanceof Error ? error.message : publishLabels.saveFailed,
        )
      } finally {
        setSubmitAction(null)
      }
    })
  }

  return (
    <div className="glass-panel rounded-[32px] border border-border p-6">
      {youtubeThumbnailUrl ? (
        <div className="mb-6 overflow-hidden rounded-[28px] border border-border bg-surface">
          <div className="border-b border-border px-4 py-3 text-sm font-medium text-muted">
            {dict.sections.video}
          </div>
          <div className="relative aspect-video bg-surface-strong">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={youtubeThumbnailUrl}
              alt={`${title || dict.labels.title} preview`}
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      ) : null}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl font-bold">
            {title || dict.labels.title}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {artist || dict.labels.artist}
          </p>
        </div>
        <span className="rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-muted dark:bg-white">
          {isPublished
            ? publishLabels.publishedState
            : publishLabels.draftState}
        </span>
      </div>

      {/* {isUploadFlow ? (
        <div className="mb-6 rounded-[28px] border border-border bg-surface p-5 text-sm text-muted">
          <div className="space-y-2">
            <p>
              {initialLocale === 'en'
                ? '1. To ensure quality, every uploaded song must be reviewed by an administrator before publication.'
                : initialLocale === 'ja'
                  ? '1. 品質を保つため、投稿した楽曲は公開前に管理者の審査が必要です。'
                  : '1. 為確保內容品質，歌曲需經管理員審核後才能發佈。'}
            </p>
            <p>
              {initialLocale === 'en'
                ? '2. After upload, you have a 7-day priority editing window. If the lyrics and vocab are still incomplete after that, an administrator may help complete and publish the content.'
                : initialLocale === 'ja'
                  ? '2. 投稿後 7 日間は投稿者が優先して編集できます。期間を過ぎても歌詞や単語が未完成の場合、管理者が補完して公開することがあります。'
                  : '2. 上傳後你有 7 天優先編輯權；若超過期限且歌詞與單字仍未完善，管理員可能會協助完善並發佈。'}
            </p>
            <p>
              {initialLocale === 'en'
                ? '3. Once the lyrics and vocab are complete, click "Complete" to prioritize admin review and publication.'
                : initialLocale === 'ja'
                  ? '3. 歌詞と単語の內容が整ったら「完成」を押すと、管理者が優先して審査・公開します。'
                  : '3. 當歌詞與單字內容完成後，可點擊「完成」，管理員會優先審核並發佈。'}
            </p>
            <p>
              {initialLocale === 'en'
                ? '4. After publication, regular users can no longer edit the song.'
                : initialLocale === 'ja'
                  ? '4. 公開後は一般ユーザーはこの楽曲を編集できません。'
                  : '4. 發佈後的內容將不可再被修改。'}
            </p>
          </div>
          {priorityDeadline && !isPublished ? (
            <div className="mt-4 rounded-2xl border border-border bg-white px-4 py-3 text-xs font-medium text-foreground dark:bg-white">
              {isPriorityExpired
                ? initialLocale === 'en'
                  ? 'The 7-day priority editing window has passed. If the content is still incomplete, an administrator may step in to finish it.'
                  : initialLocale === 'ja'
                    ? '7 日間の優先編集期間は終了しました。未完成の場合は管理者が補完することがあります。'
                    : '7 天優先編輯期已過；若內容仍未完成，管理員可能會介入協助完善。'
                : initialLocale === 'en'
                  ? `Your priority editing window is open until ${priorityDeadline.toLocaleDateString()}.`
                  : initialLocale === 'ja'
                    ? `優先編集期間は ${priorityDeadline.toLocaleDateString()} までです。`
                    : `你的優先編輯權將持續到 ${priorityDeadline.toLocaleDateString()}。`}
            </div>
          ) : null}
          {reviewRequestedAt ? (
            <div className="mt-3 rounded-2xl border border-border bg-brand-soft px-4 py-3 text-xs font-semibold text-brand-strong">
              {initialLocale === 'en'
                ? 'This song has been marked complete and is waiting for admin review.'
                : initialLocale === 'ja'
                  ? 'この楽曲は完成として送信済みで、管理者レビュー待ちです。'
                  : '這首歌已標記為完成，正在等待管理員審核。'}
            </div>
          ) : null}
        </div>
      ) : null} */}

      <div className="grid gap-4 md:grid-cols-2">
        <FormField label={dict.labels.sourceUrl}>
          <input
            value={sourceUrl}
            onChange={(event) => setSourceUrl(event.target.value)}
            className="w-full rounded-2xl border border-border bg-surface-strong px-4 py-3 outline-none"
          />
        </FormField>
        <FormField label={dict.labels.title}>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full rounded-2xl border border-border bg-surface-strong px-4 py-3 outline-none"
          />
        </FormField>
        <FormField label={dict.labels.artist}>
          <div className="relative">
            <input
              value={artist}
              onChange={(event) => {
                setArtist(event.target.value)
                setIsArtistSuggestionOpen(true)
              }}
              onFocus={() => {
                if (artistDropdownSuggestions.length > 0) {
                  setIsArtistSuggestionOpen(true)
                }
              }}
              onBlur={() => {
                window.setTimeout(() => {
                  setIsArtistSuggestionOpen(false)
                }, 120)
              }}
              className="w-full rounded-2xl border border-border bg-surface-strong px-4 py-3 outline-none"
            />
            {isArtistSuggestionOpen && artistDropdownSuggestions.length > 0 ? (
              <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 overflow-hidden rounded-[24px] border border-border bg-background shadow-2xl">
                {artistDropdownSuggestions.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault()
                      setArtist(value)
                      setIsArtistSuggestionOpen(false)
                    }}
                    className="block w-full border-b border-border/60 px-4 py-3 text-left text-sm font-medium text-foreground transition hover:bg-brand-soft/40 last:border-b-0"
                  >
                    {value}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </FormField>
        <FormField label={dict.labels.genre}>
          <div className="relative">
            <input
              value={genre}
              onChange={(event) => {
                setGenre(event.target.value)
                setIsGenreSuggestionOpen(true)
              }}
              onFocus={() => {
                if (genreDropdownSuggestions.length > 0) {
                  setIsGenreSuggestionOpen(true)
                }
              }}
              onBlur={() => {
                window.setTimeout(() => {
                  setIsGenreSuggestionOpen(false)
                }, 120)
              }}
              className="w-full rounded-2xl border border-border bg-surface-strong px-4 py-3 outline-none"
            />
            {isGenreSuggestionOpen && genreDropdownSuggestions.length > 0 ? (
              <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 overflow-hidden rounded-[24px] border border-border bg-background shadow-2xl">
                {genreDropdownSuggestions.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault()
                      setGenre(value)
                      setIsGenreSuggestionOpen(false)
                    }}
                    className="block w-full border-b border-border/60 px-4 py-3 text-left text-sm font-medium text-foreground transition hover:bg-brand-soft/40 last:border-b-0"
                  >
                    {value}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </FormField>
      </div>

      <div className="mt-6 rounded-[28px] border border-border bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-heading text-lg font-bold">
              {flowLabels.uploadSectionTitle}
            </h3>
            <p className="mt-1 text-sm text-muted">
              {lrcUploadUnlocked
                ? flowLabels.uploadSectionHint
                : flowLabels.uploadLockedHint}
            </p>
          </div>
          {!lrcUploadUnlocked ? (
            <span className="rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold text-muted dark:bg-white">
              {flowLabels.saveDraftFirst}
            </span>
          ) : null}
        </div>

        {lrcUploadUnlocked ? (
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <FormField label={`${dict.labels.lrcUpload} (JA)`}>
              <input
                type="file"
                accept=".lrc,.txt"
                className="w-full rounded-2xl border border-border bg-surface-strong px-4 py-3 outline-none file:mr-4 file:rounded-full file:border-0 file:bg-brand-soft file:px-3 file:py-1.5"
                onChange={(event) => {
                  void applyLrcUpload(event, 'ja')
                }}
              />
            </FormField>
            <FormField label={`${dict.labels.lrcUpload} (ZH)`}>
              <input
                type="file"
                accept=".lrc,.txt"
                className="w-full rounded-2xl border border-border bg-surface-strong px-4 py-3 outline-none file:mr-4 file:rounded-full file:border-0 file:bg-brand-soft file:px-3 file:py-1.5"
                onChange={(event) => {
                  void applyLrcUpload(event, 'zh')
                }}
              />
            </FormField>
            <FormField label={`${dict.labels.lrcUpload} (EN)`}>
              <input
                type="file"
                accept=".lrc,.txt"
                className="w-full rounded-2xl border border-border bg-surface-strong px-4 py-3 outline-none file:mr-4 file:rounded-full file:border-0 file:bg-brand-soft file:px-3 file:py-1.5"
                onChange={(event) => {
                  void applyLrcUpload(event, 'en')
                }}
              />
            </FormField>
          </div>
        ) : null}
      </div>

      <div className="mt-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-heading text-xl font-bold">
              {dict.labels.lyricsTimeline}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {labels.translationLanguage}: {translationLocale.toUpperCase()}
            </p>
            <p className="mt-1 text-xs text-muted">
              Kuromoji: {tokenizerState}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                setCollapsedLineIds(
                  areAllCollapsed ? [] : lyrics.map((line) => line.id),
                )
              }
              className="rounded-full border border-border bg-surface-strong px-4 py-2 text-sm font-semibold text-foreground transition hover:border-brand"
            >
              {areAllCollapsed ? uiLabels.expandAll : uiLabels.collapseAll}
            </button>
            <button
              type="button"
              onClick={() =>
                setLyrics((current) => shiftLyricsTiming(current, -200))
              }
              className="rounded-full border border-border bg-surface-strong px-4 py-2 text-sm font-semibold text-foreground transition hover:border-brand"
            >
              {uiLabels.shiftEarlier ?? 'All -0.2s'}
            </button>
            <button
              type="button"
              onClick={() =>
                setLyrics((current) => shiftLyricsTiming(current, 200))
              }
              className="rounded-full border border-border bg-surface-strong px-4 py-2 text-sm font-semibold text-foreground transition hover:border-brand"
            >
              {uiLabels.shiftLater ?? 'All +0.2s'}
            </button>
            {translationLocales.map((locale) => (
              <button
                key={locale}
                type="button"
                onClick={() => setTranslationLocale(locale)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  translationLocale === locale
                    ? 'bg-brand text-white'
                    : 'border border-border bg-surface-strong text-foreground'
                }`}
              >
                {locale.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-[920px] space-y-3 overflow-y-auto pr-2">
          {lyrics.map((line, index) => (
            <div
              key={line.id}
              className={`rounded-[24px] border border-border bg-surface p-4 transition ${
                collapsedLineIds.includes(line.id)
                  ? 'cursor-pointer hover:border-brand'
                  : ''
              }`}
              onClick={() => {
                if (collapsedLineIds.includes(line.id)) {
                  toggleLineCollapse(line.id)
                }
              }}
            >
              {(() => {
                const translationText =
                  line.translation[translationLocale]?.trim() ?? ''
                const hasTranslation = translationText.length > 0
                const lineVocabs = vocabs.filter(
                  (entry) => entry.lineId === line.id,
                )
                const vocabCount = lineVocabs.length

                return (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-brand-strong">
                          {line.timeLabel}
                        </span>
                        <span className="text-xs text-muted">
                          {uiLabels.line} {index + 1}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full border border-border bg-surface-strong px-2.5 py-1 font-medium text-muted">
                          {vocabCount} {uiLabels.vocabCount}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 font-medium ${
                            hasTranslation
                              ? 'border border-border bg-white text-muted dark:bg-white'
                              : 'border border-red-300 bg-white text-red-600 dark:bg-white'
                          }`}
                        >
                          {hasTranslation
                            ? `${translationLocale.toUpperCase()} ${uiLabels.translated}`
                            : `${translationLocale.toUpperCase()} ${uiLabels.missing}`}
                        </span>
                      </div>
                      {collapsedLineIds.includes(line.id) ? (
                        <p className="mt-2 truncate font-heading text-base font-bold">
                          {line.japanese || '...'}
                        </p>
                      ) : (
                        <div
                          contentEditable
                          suppressContentEditableWarning
                          onInput={(event) => {
                            const nextJapanese =
                              event.currentTarget.textContent ?? ''
                            setLyrics((current) =>
                              current.map((entry) =>
                                entry.id === line.id
                                  ? { ...entry, japanese: nextJapanese }
                                  : entry,
                              ),
                            )
                          }}
                          onMouseUp={(event) => {
                            syncSelectionForLine(line.id, event.currentTarget)
                          }}
                          onKeyUp={(event) => {
                            syncSelectionForLine(line.id, event.currentTarget)
                          }}
                          onBlur={() => {
                            if (addVocabButtonPointerDownRef.current) {
                              return
                            }

                            if (pendingSelection?.lineId === line.id) {
                              setPendingSelection(null)
                            }
                          }}
                          className="mt-3 min-h-16 rounded-2xl border border-border bg-surface-strong px-4 py-3 font-heading text-base font-bold text-foreground/95 outline-none transition focus:border-brand whitespace-pre-wrap"
                        >
                          {line.japanese}
                        </div>
                      )}
                      {!collapsedLineIds.includes(line.id) &&
                      pendingSelection?.lineId === line.id ? (
                        <div className="mt-3 flex justify-end">
                          <button
                            type="button"
                            onMouseDown={() => {
                              addVocabButtonPointerDownRef.current = true
                            }}
                            onClick={addSelectedVocab}
                            onMouseUp={() => {
                              addVocabButtonPointerDownRef.current = false
                            }}
                            onBlur={() => {
                              addVocabButtonPointerDownRef.current = false
                            }}
                            disabled={isAddingVocab}
                            className="rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold transition hover:border-brand disabled:cursor-wait disabled:opacity-70"
                          >
                            {isAddingVocab
                              ? uiLabels.addingVocab
                              : uiLabels.addVocab}
                          </button>
                        </div>
                      ) : null}
                    </div>
                    {!collapsedLineIds.includes(line.id) ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          toggleLineCollapse(line.id)
                        }}
                        className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-semibold transition hover:border-brand"
                      >
                        {uiLabels.collapse}
                      </button>
                    ) : null}
                  </div>
                )
              })()}

              {!collapsedLineIds.includes(line.id) ? (
                <>
                  <div className="mt-4 grid gap-3">
                    <FormField
                      label={`${labels.translation} (${translationLocale.toUpperCase()})`}
                    >
                      <input
                        value={line.translation[translationLocale] ?? ''}
                        onChange={(event) =>
                          setLyrics((current) =>
                            current.map((entry) =>
                              entry.id === line.id
                                ? {
                                    ...entry,
                                    translation: {
                                      ...entry.translation,
                                      [translationLocale]: event.target.value,
                                    },
                                  }
                                : entry,
                            ),
                          )
                        }
                        className="w-full rounded-2xl border border-border bg-surface-strong px-4 py-3 outline-none"
                      />
                    </FormField>
                  </div>

                  <div className="mt-3 space-y-4">
                    {vocabs
                      .filter((entry) => entry.lineId === line.id)
                      .map((vocab, vocabIndex) => (
                        <div
                          key={vocab.id}
                          className="rounded-[20px] border border-border/70 bg-surface-strong p-4"
                        >
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div className="text-sm font-semibold text-brand-strong">
                              {uiLabels.vocabTitle} {vocabIndex + 1}
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setVocabs((current) =>
                                  current.filter(
                                    (entry) => entry.id !== vocab.id,
                                  ),
                                )
                              }
                              className="rounded-full border border-red-200 bg-white px-3 py-1 text-xs font-semibold text-red-600 transition hover:border-red-300"
                            >
                              {uiLabels.delete}
                            </button>
                          </div>
                          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            <FormField label={labels.word}>
                              <input
                                value={vocab.word}
                                onChange={(event) =>
                                  setVocabs((current) =>
                                    current.map((entry) =>
                                      entry.id === vocab.id
                                        ? { ...entry, word: event.target.value }
                                        : entry,
                                    ),
                                  )
                                }
                                className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-zinc-900 outline-none"
                              />
                            </FormField>

                            <FormField label={labels.furigana}>
                              <input
                                value={vocab.furigana}
                                onChange={(event) =>
                                  setVocabs((current) =>
                                    current.map((entry) =>
                                      entry.id === vocab.id
                                        ? {
                                            ...entry,
                                            furigana: event.target.value,
                                          }
                                        : entry,
                                    ),
                                  )
                                }
                                className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-zinc-900 outline-none"
                              />
                            </FormField>

                            <FormField
                              label={labels.difficulty ?? 'Difficulty'}
                            >
                              <select
                                value={vocab.difficulty}
                                onChange={(event) =>
                                  setVocabs((current) =>
                                    current.map((entry) =>
                                      entry.id === vocab.id
                                        ? {
                                            ...entry,
                                            difficulty:
                                              event.target
                                                .value as VocabDifficulty,
                                          }
                                        : entry,
                                    ),
                                  )
                                }
                                className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-zinc-900 outline-none"
                              >
                                {vocabDifficultyOptions.map((difficulty) => (
                                  <option key={difficulty} value={difficulty}>
                                    {
                                      vocabDifficultyLabels[
                                        translationLocale
                                      ][difficulty]
                                    }
                                  </option>
                                ))}
                              </select>
                            </FormField>

                            <FormField
                              label={`${labels.meaning} (${translationLocale.toUpperCase()})`}
                            >
                              <input
                                value={vocab.meaning[translationLocale] ?? ''}
                                onChange={(event) =>
                                  setVocabs((current) =>
                                    current.map((entry) =>
                                      entry.id === vocab.id
                                        ? {
                                            ...entry,
                                            meaning: {
                                              ...entry.meaning,
                                              [translationLocale]:
                                                event.target.value,
                                            },
                                          }
                                        : entry,
                                    ),
                                  )
                                }
                                className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-zinc-900 outline-none"
                              />
                            </FormField>

                            <FormField label={labels.example}>
                              <input
                                value={vocab.example}
                                onChange={(event) =>
                                  setVocabs((current) =>
                                    current.map((entry) =>
                                      entry.id === vocab.id
                                        ? {
                                            ...entry,
                                            example: event.target.value,
                                          }
                                        : entry,
                                    ),
                                  )
                                }
                                className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-zinc-900 outline-none"
                              />
                            </FormField>

                            <FormField
                              label={`${labels.exampleTranslation} (${translationLocale.toUpperCase()})`}
                            >
                              <input
                                value={
                                  vocab.exampleTranslation[translationLocale] ??
                                  ''
                                }
                                onChange={(event) =>
                                  setVocabs((current) =>
                                    current.map((entry) =>
                                      entry.id === vocab.id
                                        ? {
                                            ...entry,
                                            exampleTranslation: {
                                              ...entry.exampleTranslation,
                                              [translationLocale]:
                                                event.target.value,
                                            },
                                          }
                                        : entry,
                                    ),
                                  )
                                }
                                className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-zinc-900 outline-none"
                              />
                            </FormField>
                          </div>
                        </div>
                      ))}

                    <button
                      type="button"
                      onClick={() =>
                        setVocabs((current) => [
                          ...current,
                          createEmptyMusicVocab(
                            line.id,
                            `${line.id}-${current.filter((entry) => entry.lineId === line.id).length}`,
                          ),
                        ])
                      }
                      className="rounded-full border border-border px-4 py-2 text-sm"
                    >
                      + {uiLabels.vocabTitle}
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => persistMusic(isPublished, 'draft')}
          disabled={isPending}
          className="rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white disabled:opacity-70"
        >
          {isPending && submitAction === 'draft'
            ? '...'
            : dict.labels.saveDraft}
        </button>
        <button
          type="button"
          onClick={addVocabsFromAi}
          disabled={isPending || isGettingAiVocabs || lyrics.length === 0}
          className="rounded-full border border-border bg-surface px-5 py-3 text-sm font-semibold text-foreground transition hover:border-brand disabled:opacity-70"
        >
          {isGettingAiVocabs
            ? '...'
            : initialLocale === 'en'
              ? 'Get Vocab By AI'
              : initialLocale === 'ja'
                ? 'AIで単語を取得'
                : 'Get Vocab By AI'}
        </button>
        {canPreview && initialMusic?.id ? (
          <button
            type="button"
            onClick={() =>
              router.push(`/${initialLocale}/music/preview/${initialMusic.id}`)
            }
            className="rounded-full border border-border bg-surface px-5 py-3 text-sm font-semibold text-foreground transition hover:border-brand"
          >
            {flowLabels.preview}
          </button>
        ) : null}
        {canRequestReview && !isPublished ? (
          <button
            type="button"
            onClick={completeReview}
            disabled={isPending}
            className="rounded-full border border-border bg-surface px-5 py-3 text-sm font-semibold text-foreground transition hover:border-brand disabled:opacity-70"
          >
            {isPending && submitAction === 'draft'
              ? '...'
              : initialLocale === 'en'
                ? 'Complete'
                : initialLocale === 'ja'
                  ? '完成'
                  : '完成'}
          </button>
        ) : null}
        {canPublish ? (
          <button
            type="button"
            onClick={() =>
              persistMusic(!isPublished, isPublished ? 'unpublish' : 'publish')
            }
            disabled={isPending}
            className="rounded-full border border-border bg-white px-5 py-3 text-sm font-semibold text-foreground transition hover:border-brand disabled:opacity-70 dark:bg-white"
          >
            {isPending && submitAction !== 'draft'
              ? '...'
              : isPublished
                ? publishLabels.unpublish
                : publishLabels.publish}
          </button>
        ) : null}
        {status ? (
          <span className="rounded-full bg-brand-soft px-4 py-2 text-sm text-brand-strong">
            {status}
          </span>
        ) : null}
      </div>
    </div>
  )
}
