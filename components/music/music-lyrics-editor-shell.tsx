'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { buildMusicDraftPayloadFromItem } from '@/lib/music-draft'
import { backendService } from '@/lib/services/backend-service'
import type { Dictionary } from '@/lib/i18n'
import type { Locale, LyricLine } from '@/lib/types'

import { useEditableMusicEntry } from '@/components/music/use-editable-music-entry'

const lyricsEditorCopy = {
  zh: {
    title: '歌詞輸入',
    subtitle:
      '先把歌詞貼進來，每換一行就會變成一句歌詞，確認後再進到時間軸校對。',
    readOnlyHint: '目前是顯示模式，確認要修改後才會進入可編輯狀態。',
    edit: '開始編輯',
    cancel: '取消編輯',
    back: '回到歌曲編輯',
    timeline: '前往時間軸',
    saveAndContinue: '確認並前往時間軸',
    noLyrics: '目前還沒有歌詞。',
    japanese: '日文原文',
    zh: '中文',
    en: '英文',
    lineCount: (count: number) => `${count} 行`,
    lineMismatch: '有填內容的語言，其歌詞行數必須完全一致。',
    requireJapanese: '請至少輸入日文原文歌詞。',
    saveFailed: '歌詞儲存失敗，請稍後再試。',
    vocabReset:
      '儲存歌詞後，現有的單詞卡與 quiz 選擇會先清空，方便之後重新整理。',
    draftSaved: '歌詞已儲存，正在前往時間軸頁面。',
    locked: '這首歌已發布，一般使用者目前不能再修改歌詞。',
  },
  en: {
    title: 'Lyrics Input',
    subtitle:
      'Paste lyrics here first. Each new line becomes one lyric line, then continue to timeline calibration.',
    readOnlyHint:
      'This page starts in display mode. Enable editing before changing lyrics.',
    edit: 'Edit lyrics',
    cancel: 'Cancel',
    back: 'Back to music editor',
    timeline: 'Open timeline',
    saveAndContinue: 'Confirm and continue to timeline',
    noLyrics: 'No lyrics yet.',
    japanese: 'Japanese lyrics',
    zh: 'Chinese translation',
    en: 'English translation',
    lineCount: (count: number) => `${count} lines`,
    lineMismatch:
      'Every language that has content must have exactly the same number of lines.',
    requireJapanese: 'Please enter at least the Japanese lyrics.',
    saveFailed: 'Failed to save lyrics. Please try again later.',
    vocabReset:
      'Saving lyrics here resets the existing vocab cards and quiz selections so they can be rebuilt after timing.',
    draftSaved: 'Lyrics saved. Taking you to the timeline page.',
    locked:
      'This song is already published, so regular users can no longer edit its lyrics.',
  },
  ja: {
    title: '歌詞入力',
    subtitle:
      'まず歌詞を貼り付けます。改行ごとに1行として扱い、確認後にタイムライン調整へ進みます。',
    readOnlyHint: '現在は表示モードです。編集を開始すると歌詞を変更できます。',
    edit: '歌詞を編集',
    cancel: 'キャンセル',
    back: '楽曲編集へ戻る',
    timeline: 'タイムラインへ',
    saveAndContinue: '確認してタイムラインへ進む',
    noLyrics: 'まだ歌詞がありません。',
    japanese: '日本語歌詞',
    zh: '中国語翻訳',
    en: '英語翻訳',
    lineCount: (count: number) => `${count} 行`,
    lineMismatch:
      '入力されている言語どうしの歌詞行数は、すべて一致している必要があります。',
    requireJapanese: '少なくとも日本語歌詞を入力してください。',
    saveFailed: '歌詞を保存できませんでした。後でもう一度お試しください。',
    vocabReset:
      'ここで歌詞を保存すると、既存の単語カードと quiz 選択はいったんリセットされます。',
    draftSaved: '歌詞を保存しました。タイムラインページへ移動します。',
    locked:
      'この楽曲はすでに公開されているため、一般ユーザーは歌詞を編集できません。',
  },
} as const

function buildLyricsBlock(lines: LyricLine[], locale: 'ja' | 'zh' | 'en') {
  return lines
    .map((line) =>
      locale === 'ja' ? line.japanese : (line.translation[locale] ?? ''),
    )
    .join('\n')
}

function parseLyricsBlock(value: string) {
  const lines = value.split(/\r?\n/).map((line) => line.trim())

  while (lines.length > 0 && lines.at(-1) === '') {
    lines.pop()
  }

  return lines
}

function formatTimeLabel(atMs: number) {
  const totalSeconds = Math.floor(atMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0')
  const seconds = (totalSeconds % 60).toString().padStart(2, '0')

  return `${minutes}:${seconds}`
}

export function MusicLyricsEditorShell({
  id,
  dict,
  locale,
  flowSource,
}: {
  id: string
  dict: Dictionary
  locale: Locale
  flowSource?: string
}) {
  const { music, setMusic, status, isAuthLoading, editHref, timelineHref } =
    useEditableMusicEntry({
      id,
      locale,
      preferredSource: flowSource,
    })
  const copy = lyricsEditorCopy[locale]

  if (isAuthLoading || status === 'loading') {
    return (
      <div className="glass-panel rounded-[32px] border border-border p-6 text-sm text-muted">
        {dict.status.loadingMusicEntry}
      </div>
    )
  }

  if (status === 'not-found' || !music) {
    return (
      <div className="glass-panel rounded-[32px] border border-border p-6 text-sm text-muted">
        {dict.status.musicNotFound}
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="glass-panel rounded-[32px] border border-border p-6 text-sm text-red-600">
        {dict.status.failedMusicEntry}
      </div>
    )
  }

  if (status === 'locked') {
    return (
      <div className="glass-panel rounded-[32px] border border-border p-6 text-sm text-muted">
        {copy.locked}
      </div>
    )
  }

  return (
    <MusicLyricsEditorLoaded
      copy={copy}
      music={music}
      editHref={editHref}
      timelineHref={timelineHref}
      setMusic={setMusic}
    />
  )
}

function MusicLyricsEditorLoaded({
  copy,
  music,
  editHref,
  timelineHref,
  setMusic,
}: {
  copy: (typeof lyricsEditorCopy)[Locale]
  music: NonNullable<ReturnType<typeof useEditableMusicEntry>['music']>
  editHref: string
  timelineHref: string
  setMusic: ReturnType<typeof useEditableMusicEntry>['setMusic']
}) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(music.lyrics.length === 0)
  const [translationLocale, setTranslationLocale] = useState<'zh' | 'en'>('zh')
  const [japaneseText, setJapaneseText] = useState(() =>
    buildLyricsBlock(music.lyrics, 'ja'),
  )
  const [zhText, setZhText] = useState(() =>
    buildLyricsBlock(music.lyrics, 'zh'),
  )
  const [enText, setEnText] = useState(() =>
    buildLyricsBlock(music.lyrics, 'en'),
  )
  const [statusMessage, setStatusMessage] = useState('')
  const [isPending, startTransition] = useTransition()

  const lineCounts = useMemo(
    () => ({
      ja: parseLyricsBlock(japaneseText).length,
      zh: parseLyricsBlock(zhText).length,
      en: parseLyricsBlock(enText).length,
    }),
    [enText, japaneseText, zhText],
  )
  const activeTranslationText = translationLocale === 'zh' ? zhText : enText
  const activeTranslationCount =
    translationLocale === 'zh' ? lineCounts.zh : lineCounts.en

  const saveLyricsAndContinue = () => {
    const japaneseLines = parseLyricsBlock(japaneseText)
    const zhLines = parseLyricsBlock(zhText)
    const enLines = parseLyricsBlock(enText)

    if (japaneseLines.length === 0 || japaneseLines.every((line) => !line)) {
      setStatusMessage(copy.requireJapanese)
      return
    }

    const providedLineCounts = [japaneseLines, zhLines, enLines]
      .filter((lines) => lines.length > 0)
      .map((lines) => lines.length)
    const uniqueCounts = new Set(providedLineCounts)

    if (uniqueCounts.size > 1) {
      setStatusMessage(copy.lineMismatch)
      return
    }

    setStatusMessage('')

    const nextLyrics = japaneseLines.map((japanese, index) => ({
      id: music.lyrics[index]?.id ?? crypto.randomUUID(),
      atMs: music.lyrics[index]?.atMs ?? 0,
      timeLabel: music.lyrics[index]?.timeLabel ?? formatTimeLabel(0),
      japanese,
      translation: {
        zh: zhLines[index] ?? '',
        en: enLines[index] ?? '',
        ja: music.lyrics[index]?.translation.ja ?? '',
      },
    }))

    startTransition(async () => {
      try {
        await backendService.updateMusic(
          music.id,
          buildMusicDraftPayloadFromItem(music, {
            lyrics: nextLyrics,
            vocab: [],
            quizVocabKeys: [],
          }),
          { isPublished: music.isPublished ?? false },
        )

        setMusic((current) =>
          current
            ? {
                ...current,
                lyrics: nextLyrics,
                vocab: [],
                quizVocabKeys: [],
              }
            : current,
        )
        setStatusMessage(copy.draftSaved)
        router.push(timelineHref)
      } catch (error) {
        setStatusMessage(
          `${copy.saveFailed} ${
            error instanceof Error ? error.message : ''
          }`.trim(),
        )
      }
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="glass-panel rounded-[32px] border border-border p-5">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted">{music.artist}</p>
            <h1 className="mt-1 font-heading text-3xl font-bold">
              {music.title}
            </h1>
            <p className="mt-3 max-w-xl text-sm text-muted">{copy.subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => router.push(editHref)}
              className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold transition hover:border-brand"
            >
              {copy.back}
            </button>
            {music.lyrics.length > 0 ? (
              <button
                type="button"
                onClick={() => router.push(timelineHref)}
                className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold transition hover:border-brand"
              >
                {copy.timeline}
              </button>
            ) : null}
          </div>
        </div>

        <div className="overflow-hidden rounded-[26px] border border-border">
          <iframe
            title={`${music.title} video`}
            src={`https://www.youtube.com/embed/${music.youtubeId}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="aspect-video w-full"
          />
        </div>

        <div className="mt-5 rounded-[24px] border border-border bg-brand-soft/45 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-heading text-lg font-bold">{copy.title}</h2>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-strong dark:bg-surface">
              {music.lyrics.length > 0
                ? copy.lineCount(music.lyrics.length)
                : copy.noLyrics}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted">
            {isEditing ? copy.vocabReset : copy.readOnlyHint}
          </p>
        </div>
      </section>

      <section className="glass-panel rounded-[32px] border border-border p-5 xl:flex xl:min-h-[52rem] xl:flex-col">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-xl font-bold">{copy.title}</h2>
          {music.lyrics.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                if (isEditing) {
                  setJapaneseText(buildLyricsBlock(music.lyrics, 'ja'))
                  setZhText(buildLyricsBlock(music.lyrics, 'zh'))
                  setEnText(buildLyricsBlock(music.lyrics, 'en'))
                }

                setStatusMessage('')
                setIsEditing((current) => !current)
              }}
              className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold transition hover:border-brand"
            >
              {isEditing ? copy.cancel : copy.edit}
            </button>
          ) : null}
        </div>

        {isEditing ? (
          <div className="space-y-4 xl:flex xl:flex-1 xl:flex-col">
            <div className="grid gap-4 xl:flex-1 xl:grid-cols-2">
              <label className="block space-y-2 xl:flex xl:min-h-0 xl:flex-col">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-muted">
                    {copy.japanese}
                  </span>
                  <span className="text-xs text-muted">
                    {copy.lineCount(lineCounts.ja)}
                  </span>
                </div>
                <textarea
                  value={japaneseText}
                  onChange={(event) => setJapaneseText(event.target.value)}
                  rows={12}
                  className="w-full rounded-[24px] border border-border bg-white px-4 py-4 text-sm text-slate-900 outline-none transition focus:border-brand dark:bg-surface dark:text-foreground xl:min-h-[34rem] xl:flex-1"
                />
              </label>

              <label className="block space-y-2 xl:flex xl:min-h-0 xl:flex-col">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTranslationLocale('zh')}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        translationLocale === 'zh'
                          ? 'bg-brand text-white'
                          : 'border border-border bg-surface text-muted hover:border-brand'
                      }`}
                    >
                      {copy.zh}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTranslationLocale('en')}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        translationLocale === 'en'
                          ? 'bg-brand text-white'
                          : 'border border-border bg-surface text-muted hover:border-brand'
                      }`}
                    >
                      {copy.en}
                    </button>
                  </div>
                  <span className="text-xs text-muted">
                    {copy.lineCount(activeTranslationCount)}
                  </span>
                </div>
                <textarea
                  value={activeTranslationText}
                  onChange={(event) => {
                    if (translationLocale === 'zh') {
                      setZhText(event.target.value)
                      return
                    }

                    setEnText(event.target.value)
                  }}
                  rows={12}
                  className="w-full rounded-[24px] border border-border bg-white px-4 py-4 text-sm text-slate-900 outline-none transition focus:border-brand dark:bg-surface dark:text-foreground xl:min-h-[34rem] xl:flex-1"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3 xl:mt-auto">
              <button
                type="button"
                onClick={saveLyricsAndContinue}
                disabled={isPending}
                className="rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white disabled:opacity-70"
              >
                {isPending ? '...' : copy.saveAndContinue}
              </button>
              {statusMessage ? (
                <span className="text-sm text-muted">{statusMessage}</span>
              ) : null}
            </div>
          </div>
        ) : music.lyrics.length > 0 ? (
          <div className="space-y-3">
            {music.lyrics.map((line, index) => (
              <article
                key={line.id}
                className="rounded-[24px] border border-border bg-surface p-4"
              >
                <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted">
                  <span>#{index + 1}</span>
                  <span>{line.timeLabel}</span>
                </div>
                <p className="font-heading text-lg font-bold">
                  {line.japanese}
                </p>
                {line.translation.zh ? (
                  <p className="mt-2 text-sm text-muted">
                    {line.translation.zh}
                  </p>
                ) : null}
                {line.translation.en ? (
                  <p className="mt-1 text-sm text-muted/90">
                    {line.translation.en}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-[24px] border border-dashed border-border bg-surface px-4 py-6 text-sm text-muted">
            {copy.noLyrics}
          </div>
        )}
      </section>
    </div>
  )
}
