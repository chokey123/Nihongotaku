'use client'

import { useMemo, useState } from 'react'

import type { Locale, MusicItem, MusicQuizQuestion } from '@/lib/types'

const quizCopy = {
  ja: {
    titleSuffix: 'Quiz',
    score: '分數',
    pickMeaning: '請選出正確意思',
    correct: '答對了。',
    correctWith: '正確答案：',
    empty: '這首歌目前還沒有選入任何測驗單字。',
  },
  en: {
    titleSuffix: 'Quiz',
    score: 'Score',
    pickMeaning: 'Pick the correct meaning',
    correct: 'Correct answer.',
    correctWith: 'Correct answer: ',
    empty: 'No quiz vocab has been selected for this song yet.',
  },
  zh: {
    titleSuffix: '測驗',
    score: '分數',
    pickMeaning: '請選出正確意思',
    correct: '答對了。',
    correctWith: '正確答案：',
    empty: '這首歌目前還沒有選入任何測驗單字。',
  },
} as const

export function MusicQuizClient({
  item,
  questions,
  locale,
}: {
  item: MusicItem
  questions: MusicQuizQuestion[]
  locale: Locale
}) {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})
  const copy = quizCopy[locale]

  const score = useMemo(
    () =>
      questions.reduce((total, question) => {
        return selectedOptions[question.key] === question.correctMeaning
          ? total + 1
          : total
      }, 0),
    [questions, selectedOptions],
  )

  const answerLocale = locale === 'ja' ? 'ZH' : locale.toUpperCase()

  return (
    <div className="space-y-6 pb-28">
      <section className="glass-panel rounded-[32px] border border-border p-6">
        <p className="text-sm text-muted">{item.artist}</p>
        <h1 className="mt-2 font-heading text-3xl font-bold">
          {item.title} {copy.titleSuffix}
        </h1>
        <p className="mt-3 text-sm text-muted">
          {copy.pickMeaning} {answerLocale}。{copy.score}: {score} /{' '}
          {questions.length}
        </p>
      </section>

      {questions.length > 0 ? (
        <div className="space-y-4">
          {questions.map((question, index) => {
            const selectedOption = selectedOptions[question.key]
            const isCorrect = selectedOption === question.correctMeaning
            const isLocked = Boolean(selectedOption)

            return (
              <section
                key={question.key}
                className="glass-panel rounded-[28px] border border-border p-5"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-strong">
                    Q{index + 1}
                  </span>
                  <div>
                    <h2 className="font-heading text-2xl font-bold">{question.word}</h2>
                    <p className="text-sm text-muted">{question.furigana}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {question.options.map((option) => {
                    const isSelected = selectedOption === option
                    const revealCorrect =
                      Boolean(selectedOption) && option === question.correctMeaning
                    const revealWrong = isSelected && option !== question.correctMeaning

                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          if (isLocked) return

                          setSelectedOptions((current) => ({
                            ...current,
                            [question.key]: option,
                          }))
                        }}
                        disabled={isLocked}
                        className={`rounded-[22px] border p-4 text-left transition ${
                          revealCorrect
                            ? 'border-emerald-400 bg-emerald-50'
                            : revealWrong
                              ? 'border-red-300 bg-red-50'
                              : isSelected
                                ? 'border-brand bg-brand-soft'
                                : 'border-border bg-surface-strong hover:border-brand'
                        } ${isLocked ? 'cursor-default' : ''}`}
                      >
                        <span className="text-sm font-medium">{option}</span>
                      </button>
                    )
                  })}
                </div>

                {selectedOption ? (
                  <p className="mt-4 text-sm font-medium">
                    {isCorrect
                      ? copy.correct
                      : `${copy.correctWith}${question.correctMeaning}`}
                  </p>
                ) : null}
              </section>
            )
          })}
        </div>
      ) : (
        <section className="glass-panel rounded-[28px] border border-border p-6">
          <p className="text-sm text-muted">{copy.empty}</p>
        </section>
      )}
      {questions.length > 0 ? (
        <footer className="fixed bottom-4 left-1/2 z-30 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-full border border-border bg-background/92 px-5 py-3 shadow-lg backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-muted">{copy.score}</span>
            <span className="font-semibold text-brand-strong">
              {score} / {questions.length}
            </span>
          </div>
        </footer>
      ) : null}
    </div>
  )
}
