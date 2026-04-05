'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { backendService } from '@/lib/services/backend-service'
import {
  loadJachDictionary,
  lookupJachDictionary,
  normalizeJapaneseReading,
} from '@/lib/services/jachdict-client'
import type { Dictionary } from '@/lib/i18n'
import type {
  LocalizedText,
  Locale,
  LyricLine,
  MusicVocabItem,
  MusicDraftPayload,
  MusicItem,
  VocabItem,
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
  return content.split(/\r?\n/).reduce<
    Array<{ atMs: number; timeLabel: string; text: string }>
  >((lines, row) => {
    const matched = row.match(/\[(\d{2}):(\d{2})(?:\.(\d{2}))?\](.*)/)
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
}: {
  dict: Dictionary
  initialMusic?: MusicItem
  mode: 'create' | 'edit'
  initialLocale?: Locale
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
  const [vocabs, setVocabs] = useState<MusicVocabItem[]>(initialMusic?.vocab ?? [])
  const [isPublished, setIsPublished] = useState(initialMusic?.isPublished ?? false)
  const [collapsedLineIds, setCollapsedLineIds] = useState<string[]>([])
  const [tokenizerState, setTokenizerState] = useState<
    'loading' | 'ready' | 'error'
  >('loading')
  const [isAddingVocab, setIsAddingVocab] = useState(false)
  const [pendingSelection, setPendingSelection] = useState<VocabContextMenuState | null>(
    null,
  )
  const [sourceUrl, setSourceUrl] = useState(
    initialMusic?.sourceUrl ??
      (initialMusic ? `https://youtube.com/watch?v=${initialMusic.youtubeId}` : ''),
  )
  const [title, setTitle] = useState(initialMusic?.title ?? '')
  const [artist, setArtist] = useState(initialMusic?.artist ?? '')
  const [genre, setGenre] = useState(initialMusic?.genre ?? '')
  const labels = localizedFieldLabels[translationLocale]
  const uiLabels = adminMusicUiLabels[translationLocale]
  const publishLabels = publishActionLabels[initialLocale]
  const youtubeIdPreview = extractYoutubeIdFromUrl(sourceUrl)
  const youtubeThumbnailUrl = youtubeIdPreview
    ? `https://img.youtube.com/vi/${youtubeIdPreview}/sddefault.jpg`
    : ''
  const areAllCollapsed =
    lyrics.length > 0 && collapsedLineIds.length === lyrics.length
  const tokenizerRef = useRef<KuromojiTokenizer | null>(null)
  const dictionaryRef = useRef<Awaited<
    ReturnType<typeof loadJachDictionary>
  > | null>(null)
  const previousLyricIdsRef = useRef<string>(lyrics.map((line) => line.id).join('|'))
  const addVocabButtonPointerDownRef = useRef(false)

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
    const relevantTokens =
      exactMatch ? [exactMatch] : tokens.map((token) => ({ ...token }))
    const baseWord = extractBaseWord(relevantTokens)
    const reading = relevantTokens
      .map((token) => token.reading ?? '')
      .join('')
      .trim()

    return {
      basicForm:
        baseWord && baseWord !== '*'
          ? baseWord
          : relevantTokens[0]?.surface_form ?? normalized,
      reading,
    }
  }

  const openSelectionMenu = (
    lineId: string,
    selectedText: string,
  ) => {
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

  const syncSelectionForLine = (lineId: string, currentTarget: HTMLDivElement) => {
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

  const persistMusic = (nextPublished: boolean, action: 'draft' | 'publish' | 'unpublish') => {
    const payload: MusicDraftPayload = {
      sourceUrl,
      title,
      artist,
      genre,
      lyrics,
      vocab: vocabs,
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
          router.replace(`/${initialLocale}/admin/music/${response.id}`)
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
          <h2 className="font-heading text-2xl font-bold">{title || dict.labels.title}</h2>
          <p className="mt-1 text-sm text-muted">
            {artist || dict.labels.artist}
          </p>
        </div>
        <span className="rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-muted dark:bg-white">
          {isPublished ? publishLabels.publishedState : publishLabels.draftState}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField label={dict.labels.sourceUrl}>
          <input
            value={sourceUrl}
            onChange={(event) => setSourceUrl(event.target.value)}
            className="w-full rounded-2xl border border-border bg-surface-strong px-4 py-3 outline-none"
          />
        </FormField>
        <FormField label={`${dict.labels.lrcUpload} (JA)`}>
          <input
            type="file"
            accept=".lrc,.txt"
            className="w-full rounded-2xl border border-border bg-surface-strong px-4 py-3 outline-none file:mr-4 file:rounded-full file:border-0 file:bg-brand-soft file:px-3 file:py-1.5"
            onChange={async (event) => {
              const file = event.target.files?.[0]
              if (!file) return
              const content = await file.text()
              setLyrics(parseLrc(content))
              event.target.value = ''
            }}
          />
        </FormField>
        <FormField label={`${dict.labels.lrcUpload} (ZH)`}>
          <input
            type="file"
            accept=".lrc,.txt"
            className="w-full rounded-2xl border border-border bg-surface-strong px-4 py-3 outline-none file:mr-4 file:rounded-full file:border-0 file:bg-brand-soft file:px-3 file:py-1.5"
            onChange={async (event) => {
              const file = event.target.files?.[0]
              if (!file) return
              const content = await file.text()
              setLyrics((current) => mergeTranslationFromLrc(current, content, 'zh'))
              event.target.value = ''
            }}
          />
        </FormField>
        <FormField label={`${dict.labels.lrcUpload} (EN)`}>
          <input
            type="file"
            accept=".lrc,.txt"
            className="w-full rounded-2xl border border-border bg-surface-strong px-4 py-3 outline-none file:mr-4 file:rounded-full file:border-0 file:bg-brand-soft file:px-3 file:py-1.5"
            onChange={async (event) => {
              const file = event.target.files?.[0]
              if (!file) return
              const content = await file.text()
              setLyrics((current) => mergeTranslationFromLrc(current, content, 'en'))
              event.target.value = ''
            }}
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
          <input
            value={artist}
            onChange={(event) => setArtist(event.target.value)}
            className="w-full rounded-2xl border border-border bg-surface-strong px-4 py-3 outline-none"
          />
        </FormField>
        <FormField label={dict.labels.genre}>
          <input
            value={genre}
            onChange={(event) => setGenre(event.target.value)}
            className="w-full rounded-2xl border border-border bg-surface-strong px-4 py-3 outline-none"
          />
        </FormField>
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
                const lineVocabs = vocabs.filter((entry) => entry.lineId === line.id)
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
                        const nextJapanese = event.currentTarget.textContent ?? ''
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
                        {isAddingVocab ? uiLabels.addingVocab : uiLabels.addVocab}
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
                                current.filter((entry) => entry.id !== vocab.id),
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
                                      ? { ...entry, furigana: event.target.value }
                                      : entry,
                                  ),
                                )
                              }
                              className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-zinc-900 outline-none"
                            />
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
                                            [translationLocale]: event.target.value,
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
                                      ? { ...entry, example: event.target.value }
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
                                            [translationLocale]: event.target.value,
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
          {isPending && submitAction === 'draft' ? '...' : dict.labels.saveDraft}
        </button>
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
        {status ? (
          <span className="rounded-full bg-brand-soft px-4 py-2 text-sm text-brand-strong">
            {status}
          </span>
        ) : null}
      </div>

    </div>
  )
}
