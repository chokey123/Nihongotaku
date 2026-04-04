'use client'

import { useEffect, useRef, useState, useTransition } from 'react'

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
  MusicDraftPayload,
  MusicItem,
  VocabItem,
} from '@/lib/types'

const translationLocales: Locale[] = ['zh', 'en', 'ja']

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
  x: number
  y: number
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
    vocab: [],
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
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState('')
  const [translationLocale, setTranslationLocale] =
    useState<Locale>(initialLocale)
  const [lyrics, setLyrics] = useState<LyricLine[]>(initialMusic?.lyrics ?? [])
  const [collapsedLineIds, setCollapsedLineIds] = useState<string[]>([])
  const [tokenizerState, setTokenizerState] = useState<
    'loading' | 'ready' | 'error'
  >('loading')
  const [contextMenu, setContextMenu] = useState<VocabContextMenuState | null>(
    null,
  )
  const [sourceUrl, setSourceUrl] = useState(
    initialMusic ? `https://youtube.com/watch?v=${initialMusic.youtubeId}` : '',
  )
  const [title, setTitle] = useState(initialMusic?.title ?? '')
  const [artist, setArtist] = useState(initialMusic?.artist ?? '')
  const [genre, setGenre] = useState(initialMusic?.genre ?? '')
  const labels = localizedFieldLabels[translationLocale]
  const areAllCollapsed =
    lyrics.length > 0 && collapsedLineIds.length === lyrics.length
  const tokenizerRef = useRef<KuromojiTokenizer | null>(null)
  const dictionaryRef = useRef<Awaited<
    ReturnType<typeof loadJachDictionary>
  > | null>(null)
  const previousLyricIdsRef = useRef<string>(lyrics.map((line) => line.id).join('|'))

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
    if (!contextMenu) return

    const closeMenu = () => setContextMenu(null)
    window.addEventListener('click', closeMenu)
    window.addEventListener('scroll', closeMenu, true)

    return () => {
      window.removeEventListener('click', closeMenu)
      window.removeEventListener('scroll', closeMenu, true)
    }
  }, [contextMenu])

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

  const getMenuPosition = (x: number, y: number) => {
    const offset = 6
    const menuWidth = 248
    const menuHeight = 124

    return {
      x: Math.max(8, Math.min(x + offset, window.innerWidth - menuWidth - 8)),
      y: Math.max(8, Math.min(y + offset, window.innerHeight - menuHeight - 8)),
    }
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
    clientX: number,
    clientY: number,
    selectedText: string,
  ) => {
    const normalized = selectedText.trim()
    if (!normalized) return

    const { basicForm, reading } = buildVocabFromSelection(normalized)
    const position = getMenuPosition(clientX, clientY)

    setContextMenu({
      lineId,
      x: position.x,
      y: position.y,
      selectedText: normalized,
      basicForm,
      reading,
    })
  }

  const addSelectedVocab = async () => {
    if (!contextMenu) return

    const exampleSentence = await backendService.searchExampleSentence(
      contextMenu.basicForm,
      'jpn',
    )
    const dictionaryEntry = lookupJachDictionary(
      dictionaryRef.current,
      contextMenu.basicForm,
      contextMenu.reading,
    )
    const resolvedFurigana =
      dictionaryEntry?.reading ||
      normalizeJapaneseReading(contextMenu.reading) ||
      ''

    setLyrics((current) =>
      current.map((entry) => {
        if (entry.id !== contextMenu.lineId) {
          return entry
        }

        const alreadyExists = entry.vocab.some(
          (vocab) => vocab.word === contextMenu.basicForm,
        )

        if (alreadyExists) {
          return entry
        }

        return {
          ...entry,
          vocab: [
            ...entry.vocab,
            {
              ...createEmptyVocab(),
              word: contextMenu.basicForm,
              furigana: resolvedFurigana,
              meaning: {
                ...emptyLocalizedText(),
                zh: dictionaryEntry?.meaning ?? '',
              },
              example: exampleSentence,
            },
          ],
        }
      }),
    )

    setContextMenu(null)
  }

  const onSubmit = () => {
    const payload: MusicDraftPayload = {
      sourceUrl,
      title,
      artist,
      genre,
      lyrics,
    }

    startTransition(async () => {
      const response =
        mode === 'create'
          ? await backendService.createMusic(payload)
          : await backendService.updateMusic(
              initialMusic?.id ?? 'unknown',
              payload,
            )

      setStatus(
        `Saved ${response.id} with ${payload.lyrics.length} lyric lines.`,
      )
    })
  }

  return (
    <div className="glass-panel rounded-[32px] border border-border p-6">
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
              {areAllCollapsed ? 'Expand all' : 'Collapse all'}
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
                const vocabCount = line.vocab.length

                return (
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-brand-strong">
                      {line.timeLabel}
                    </span>
                    <span className="text-xs text-muted">Line {index + 1}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full border border-border bg-surface-strong px-2.5 py-1 font-medium text-muted">
                      {vocabCount} vocab
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 font-medium ${
                        hasTranslation
                          ? 'border border-border bg-white text-muted dark:bg-white'
                          : 'border border-red-300 bg-white text-red-600 dark:bg-white'
                      }`}
                    >
                      {hasTranslation
                        ? `${translationLocale.toUpperCase()} translated`
                        : `${translationLocale.toUpperCase()} missing`}
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
                      onContextMenu={(event) => {
                        const selection = window.getSelection()
                        const selectedText = selection?.toString().trim() ?? ''

                        if (
                          !selectedText ||
                          !selection ||
                          selection.rangeCount === 0 ||
                          !event.currentTarget.contains(selection.anchorNode) ||
                          !event.currentTarget.contains(selection.focusNode)
                        ) {
                          return
                        }

                        event.preventDefault()
                        openSelectionMenu(
                          line.id,
                          event.clientX,
                          event.clientY,
                          selectedText,
                        )
                      }}
                      className="mt-3 min-h-16 rounded-2xl border border-border bg-surface-strong px-4 py-3 font-heading text-base font-bold text-foreground/95 outline-none transition focus:border-brand whitespace-pre-wrap"
                    >
                      {line.japanese}
                    </div>
                  )}
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
                    Collapse
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
                    {line.vocab.map((vocab, vocabIndex) => (
                      <div
                        key={`${line.id}-${vocabIndex}`}
                        className="rounded-[20px] border border-border/70 bg-surface-strong p-4"
                      >
                        <div className="mb-3 text-sm font-semibold text-brand-strong">
                          Vocab {vocabIndex + 1}
                        </div>
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          <FormField label={labels.word}>
                            <input
                              value={vocab.word}
                              onChange={(event) =>
                                setLyrics((current) =>
                                  current.map((entry) =>
                                    entry.id === line.id
                                      ? {
                                          ...entry,
                                          vocab: entry.vocab.map(
                                            (card, cardIndex) =>
                                              cardIndex === vocabIndex
                                                ? {
                                                    ...card,
                                                    word: event.target.value,
                                                  }
                                                : card,
                                          ),
                                        }
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
                                setLyrics((current) =>
                                  current.map((entry) =>
                                    entry.id === line.id
                                      ? {
                                          ...entry,
                                          vocab: entry.vocab.map(
                                            (card, cardIndex) =>
                                              cardIndex === vocabIndex
                                                ? {
                                                    ...card,
                                                    furigana:
                                                      event.target.value,
                                                  }
                                                : card,
                                          ),
                                        }
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
                                setLyrics((current) =>
                                  current.map((entry) =>
                                    entry.id === line.id
                                      ? {
                                          ...entry,
                                          vocab: entry.vocab.map(
                                            (card, cardIndex) =>
                                              cardIndex === vocabIndex
                                                ? {
                                                    ...card,
                                                    meaning: {
                                                      ...card.meaning,
                                                      [translationLocale]:
                                                        event.target.value,
                                                    },
                                                  }
                                                : card,
                                          ),
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
                                setLyrics((current) =>
                                  current.map((entry) =>
                                    entry.id === line.id
                                      ? {
                                          ...entry,
                                          vocab: entry.vocab.map(
                                            (card, cardIndex) =>
                                              cardIndex === vocabIndex
                                                ? {
                                                    ...card,
                                                    example:
                                                      event.target.value,
                                                  }
                                                : card,
                                          ),
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
                                setLyrics((current) =>
                                  current.map((entry) =>
                                    entry.id === line.id
                                      ? {
                                          ...entry,
                                          vocab: entry.vocab.map(
                                            (card, cardIndex) =>
                                              cardIndex === vocabIndex
                                                ? {
                                                    ...card,
                                                    exampleTranslation: {
                                                      ...card.exampleTranslation,
                                                      [translationLocale]:
                                                        event.target.value,
                                                    },
                                                  }
                                                : card,
                                          ),
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
                        setLyrics((current) =>
                          current.map((entry) =>
                            entry.id === line.id
                              ? {
                                  ...entry,
                                  vocab: [...entry.vocab, createEmptyVocab()],
                                }
                              : entry,
                          ),
                        )
                      }
                      className="rounded-full border border-border px-4 py-2 text-sm"
                    >
                      + vocab
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
          onClick={onSubmit}
          disabled={isPending}
          className="rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white disabled:opacity-70"
        >
          {isPending ? '...' : dict.labels.saveDraft}
        </button>
        {status ? (
          <span className="rounded-full bg-brand-soft px-4 py-2 text-sm text-brand-strong">
            {status}
          </span>
        ) : null}
      </div>

      {contextMenu ? (
        <div
          className="fixed z-50 min-w-[220px] rounded-2xl border border-border bg-surface-strong p-2 shadow-2xl"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
        >
          <div className="px-3 py-2 text-xs text-muted">
            <div>Selected: {contextMenu.selectedText}</div>
            <div>Basic form: {contextMenu.basicForm}</div>
          </div>
          <button
            type="button"
            onClick={addSelectedVocab}
            className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition hover:bg-brand-soft hover:text-brand-strong"
          >
            Add vocab
          </button>
        </div>
      ) : null}
    </div>
  )
}
