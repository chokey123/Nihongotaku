'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { backendService } from '@/lib/services/backend-service'
import type { Locale, MusicItem, VocabItem } from '@/lib/types'

const quizAdminCopy = {
  ja: {
    helper: 'この曲の Quiz に入れる単語カードを選択してください。',
    selected: '選択済み',
    selectedList: '選択した単語',
    emptySelected: 'まだ単語が選択されていません。',
    tapToAdd: 'クリックして追加',
    noMeaning: 'この言語の意味はまだありません。',
    save: 'Quiz 選択を保存',
    saved: 'Quiz 選択を保存しました：',
  },
  en: {
    helper: 'Select which vocab cards should appear in the quiz for this song.',
    selected: 'Selected',
    selectedList: 'Selected vocab',
    emptySelected: 'No vocab selected yet.',
    tapToAdd: 'Tap to add',
    noMeaning: 'No localized meaning yet.',
    save: 'Save quiz selection',
    saved: 'Saved quiz selection for ',
  },
  zh: {
    helper: '选择要放进这首歌测验的单词卡。',
    selected: '已选择',
    selectedList: '已选单词',
    emptySelected: '还没有选择单词。',
    tapToAdd: '点击加入',
    noMeaning: '这个语言还没有词义。',
    save: '保存测验选择',
    saved: '已保存测验选择：',
  },
} as const

interface QuizSelectionEntry {
  key: string
  lineId: string
  lineTimeLabel: string
  lineJapanese: string
  vocab: VocabItem
}

export function AdminMusicQuizForm({
  item,
  entries,
  initialSelectedKeys,
  locale,
}: {
  item: MusicItem
  entries: QuizSelectionEntry[]
  initialSelectedKeys: string[]
  locale: Locale
}) {
  const router = useRouter()
  const [selectedKeys, setSelectedKeys] = useState<string[]>(initialSelectedKeys)
  const [status, setStatus] = useState('')
  const [isPending, startTransition] = useTransition()

  const meaningLocale = locale === 'ja' ? 'zh' : locale
  const copy = quizAdminCopy[locale]

  const selectedEntries = useMemo(
    () => entries.filter((entry) => selectedKeys.includes(entry.key)),
    [entries, selectedKeys],
  )

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-[32px] border border-border p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted">{item.artist}</p>
            <h2 className="mt-2 font-heading text-2xl font-bold">{item.title}</h2>
            <p className="mt-2 text-sm text-muted">{copy.helper}</p>
          </div>
          <div className="rounded-full border border-border bg-surface-strong px-4 py-2 text-sm font-semibold text-muted">
            {selectedKeys.length} {copy.selected}
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-[32px] border border-border p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-heading text-xl font-bold">{copy.selectedList}</h3>
          <span className="rounded-full border border-border bg-surface-strong px-3 py-1 text-xs font-semibold text-muted">
            {selectedEntries.length}
          </span>
        </div>
        {selectedEntries.length > 0 ? (
          <div className="mt-4 flex max-h-56 flex-wrap gap-3 overflow-y-auto pr-2">
            {selectedEntries.map((entry) => {
              const localizedMeaning =
                entry.vocab.meaning[meaningLocale] ?? entry.vocab.meaning.zh ?? ''

              return (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() =>
                    setSelectedKeys((current) =>
                      current.filter((value) => value !== entry.key),
                    )
                  }
                  className="rounded-[20px] border border-brand bg-brand-soft px-4 py-3 text-left transition hover:border-brand-strong"
                >
                  <div className="font-heading text-base font-bold">
                    {entry.vocab.word}
                  </div>
                  <div className="text-xs text-muted">{entry.vocab.furigana}</div>
                  <p className="mt-2 line-clamp-2 text-sm text-muted">
                    {localizedMeaning || copy.noMeaning}
                  </p>
                </button>
              )
            })}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">{copy.emptySelected}</p>
        )}
      </div>

      <div className="glass-panel rounded-[32px] border border-border p-4">
        <div className="max-h-[42rem] overflow-y-auto pr-2">
          <div className="grid gap-4 md:grid-cols-2">
            {entries.map((entry) => {
              const isSelected = selectedKeys.includes(entry.key)
              const localizedMeaning =
                entry.vocab.meaning[meaningLocale] ?? entry.vocab.meaning.zh ?? ''

              return (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() =>
                    setSelectedKeys((current) =>
                      current.includes(entry.key)
                        ? current.filter((value) => value !== entry.key)
                        : [...current, entry.key],
                    )
                  }
                  className={`glass-panel rounded-[24px] border p-4 text-left transition ${
                    isSelected
                      ? 'border-brand bg-brand-soft'
                      : 'border-border bg-surface-strong hover:border-brand'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-heading text-lg font-bold">
                        {entry.vocab.word}
                      </div>
                      <div className="text-sm text-muted">{entry.vocab.furigana}</div>
                    </div>
                    <span className="rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold text-muted">
                      {isSelected ? copy.selected : copy.tapToAdd}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-muted">
                    {localizedMeaning || copy.noMeaning}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span className="rounded-full border border-border bg-white px-2.5 py-1">
                      {entry.lineTimeLabel}
                    </span>
                    <span className="line-clamp-1">{entry.lineJapanese}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const response = await backendService.updateMusicQuiz(
                item.id,
                selectedKeys,
              )
              setStatus(`${copy.saved}${response.id}.`)
              if (item.isPublished && selectedKeys.length > 0) {
                router.replace(`/${locale}/music/quiz/${item.id}`)
              }
            })
          }
          className="rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white disabled:opacity-70"
        >
          {isPending ? '...' : copy.save}
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
