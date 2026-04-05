'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { backendService } from '@/lib/services/backend-service'
import type { Locale, MusicItem, VocabItem } from '@/lib/types'

const quizAdminCopy = {
  ja: {
    helper: '選擇要放進這首歌 Quiz 的單字卡。',
    selected: '已選擇',
    tapToAdd: '點擊加入',
    noMeaning: '這個語言還沒有詞義。',
    save: '儲存 Quiz 選擇',
    saved: '已儲存 Quiz 選擇：',
  },
  en: {
    helper: 'Select which vocab cards should appear in the quiz for this song.',
    selected: 'Selected',
    tapToAdd: 'Tap to add',
    noMeaning: 'No localized meaning yet.',
    save: 'Save quiz selection',
    saved: 'Saved quiz selection for ',
  },
  zh: {
    helper: '選擇要放進這首歌測驗的單字卡。',
    selected: '已選擇',
    tapToAdd: '點擊加入',
    noMeaning: '這個語言還沒有詞義。',
    save: '儲存測驗選擇',
    saved: '已儲存測驗選擇：',
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

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-[32px] border border-border p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted">{item.artist}</p>
            <h2 className="mt-2 font-heading text-2xl font-bold">{item.title}</h2>
            <p className="mt-2 text-sm text-muted">
              {copy.helper}
            </p>
          </div>
          <div className="rounded-full border border-border bg-surface-strong px-4 py-2 text-sm font-semibold text-muted">
            {selectedKeys.length} {copy.selected}
          </div>
        </div>
      </div>

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
