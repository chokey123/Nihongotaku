'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'

import { useAuth } from '@/components/providers/auth-provider'
import { backendService } from '@/lib/services/backend-service'
import type {
  Locale,
  MusicItem,
  MusicQuizAttemptRecord,
  MusicQuizQuestion,
} from '@/lib/types'

const quizCopy = {
  ja: {
    titleSuffix: 'Quiz',
    score: '分數',
    pickMeaning: '請選出正確意思',
    correct: '答對了。',
    correctWith: '正確答案：',
    empty: '這首歌目前還沒有選入任何測驗單字。',
    historyLoading: '正在讀取你上次的作答紀錄...',
    historyReady: '已載入你上次的作答結果。',
    historyEmpty: '登入後，完成測驗會自動保存你的作答紀錄。',
    signInHint: '登入後，答題結果會自動保存，下次進來可以直接看到上次每題對錯。',
    saving: '正在保存這次作答...',
    saved: '這次作答已保存。',
    saveFailed: '這次作答未能保存，請稍後再試。',
    retry: '重新作答',
    lastAttempt: '上次作答',
  },
  en: {
    titleSuffix: 'Quiz',
    score: 'Score',
    pickMeaning: 'Pick the correct meaning',
    correct: 'Correct answer.',
    correctWith: 'Correct answer: ',
    empty: 'No quiz vocab has been selected for this song yet.',
    historyLoading: 'Loading your last quiz attempt...',
    historyReady: 'Your last quiz attempt has been restored.',
    historyEmpty: 'Sign in and completed quizzes will be saved automatically.',
    signInHint:
      'Sign in to save your quiz results automatically and review each answer next time.',
    saving: 'Saving this attempt...',
    saved: 'This attempt has been saved.',
    saveFailed: 'This attempt could not be saved. Please try again later.',
    retry: 'Try again',
    lastAttempt: 'Last attempt',
  },
  zh: {
    titleSuffix: '测验',
    score: '分数',
    pickMeaning: '请选择出正确意思',
    correct: '答对了。',
    correctWith: '正确答案：',
    empty: '这首歌目前还没有选入任何测验单字。',
    historyLoading: '正在读取你上次的作答记录...',
    historyReady: '已载入你上次的作答结果。',
    historyEmpty: '登录后，完成测验会自动保存你的作答记录。',
    signInHint: '登录后，答题结果会自动保存，下次进来可以直接看到上次每题对错。',
    saving: '正在保存这次作答...',
    saved: '这次作答已保存。',
    saveFailed: '这次作答未能保存，请稍后再试。',
    retry: '重新作答',
    lastAttempt: '上次作答',
  },
} as const

function buildSelectedOptionsFromAttempt(attempt: MusicQuizAttemptRecord | null) {
  if (!attempt) {
    return {}
  }

  return Object.fromEntries(
    attempt.answers.map((answer) => [answer.questionKey, answer.selectedMeaning]),
  )
}

function buildAttemptSignature(selectedOptions: Record<string, string>) {
  return JSON.stringify(
    Object.entries(selectedOptions).sort(([leftKey], [rightKey]) =>
      leftKey.localeCompare(rightKey),
    ),
  )
}

export function MusicQuizClient({
  item,
  questions,
  locale,
}: {
  item: MusicItem
  questions: MusicQuizQuestion[]
  locale: Locale
}) {
  const { user, isLoading: isAuthLoading } = useAuth()
  const copy = quizCopy[locale]
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})
  const [latestAttempt, setLatestAttempt] = useState<MusicQuizAttemptRecord | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [submittedSignature, setSubmittedSignature] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (isAuthLoading) {
      return
    }

    let isMounted = true

    const loadAttempt = async () => {
      if (!user || questions.length === 0) {
        if (!isMounted) {
          return
        }

        setLatestAttempt(null)
        setHistoryError(null)
        setIsHistoryLoading(false)
        setSubmittedSignature(null)
        return
      }

      setIsHistoryLoading(true)
      setHistoryError(null)

      try {
        const attempt = await backendService.getLatestMusicQuizAttempt(item.id)

        if (!isMounted) {
          return
        }

        const restoredOptions = buildSelectedOptionsFromAttempt(attempt)
        setLatestAttempt(attempt)
        setSelectedOptions(restoredOptions)
        setSubmittedSignature(buildAttemptSignature(restoredOptions))
      } catch (error) {
        if (!isMounted) {
          return
        }

        setHistoryError(error instanceof Error ? error.message : copy.saveFailed)
      } finally {
        if (isMounted) {
          setIsHistoryLoading(false)
        }
      }
    }

    void loadAttempt()

    return () => {
      isMounted = false
    }
  }, [copy.saveFailed, isAuthLoading, item.id, questions.length, user])

  const score = useMemo(
    () =>
      questions.reduce((total, question) => {
        return selectedOptions[question.key] === question.correctMeaning
          ? total + 1
          : total
      }, 0),
    [questions, selectedOptions],
  )

  const answeredCount = useMemo(
    () =>
      questions.reduce(
        (total, question) => total + (selectedOptions[question.key] ? 1 : 0),
        0,
      ),
    [questions, selectedOptions],
  )

  const currentSignature = useMemo(
    () => buildAttemptSignature(selectedOptions),
    [selectedOptions],
  )

  useEffect(() => {
    if (!user || questions.length === 0 || answeredCount !== questions.length) {
      return
    }

    if (currentSignature === submittedSignature) {
      return
    }

    startTransition(async () => {
      setSaveState('saving')

      try {
        const attempt = await backendService.submitMusicQuizAttempt({
          musicId: item.id,
          answers: questions.map((question) => ({
            questionKey: question.key,
            selectedMeaning: selectedOptions[question.key],
            correctMeaning: question.correctMeaning,
          })),
        })

        setLatestAttempt(attempt)
        setSubmittedSignature(currentSignature)
        setSaveState('saved')
      } catch {
        setSaveState('error')
      }
    })
  }, [
    answeredCount,
    currentSignature,
    item.id,
    questions,
    selectedOptions,
    submittedSignature,
    user,
  ])

  const answerLocale = locale === 'ja' ? 'ZH' : locale.toUpperCase()

  return (
    <div className="space-y-6 pb-28">
      <section className="glass-panel rounded-[32px] border border-border p-6">
        <p className="text-sm text-muted">{item.artist}</p>
        <h1 className="mt-2 font-heading text-3xl font-bold">
          {item.title} {copy.titleSuffix}
        </h1>
        <p className="mt-3 text-sm text-muted">
          {copy.pickMeaning} {answerLocale}。{copy.score}: {score} / {questions.length}
        </p>
        {user ? (
          <p className="mt-3 text-sm text-muted">
            {isHistoryLoading
              ? copy.historyLoading
              : latestAttempt
                ? `${copy.lastAttempt}: ${latestAttempt.score} / ${latestAttempt.totalQuestions}. ${copy.historyReady}`
                : copy.historyEmpty}
          </p>
        ) : (
          <p className="mt-3 text-sm text-muted">{copy.signInHint}</p>
        )}
        {historyError ? <p className="mt-2 text-sm text-red-500">{historyError}</p> : null}
        {questions.length > 0 ? (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => {
                setSelectedOptions({})
                setLatestAttempt(null)
                setHistoryError(null)
                setSaveState('idle')
                setSubmittedSignature(null)
              }}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:border-brand"
            >
              {copy.retry}
            </button>
          </div>
        ) : null}
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
                            ? 'border-emerald-400 bg-emerald-50 text-emerald-950 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-100'
                            : revealWrong
                              ? 'border-red-300 bg-red-50 text-red-950 dark:border-red-500 dark:bg-red-950/40 dark:text-red-100'
                              : isSelected
                                ? 'border-brand bg-brand-soft text-foreground dark:bg-brand/20 dark:text-foreground'
                                : 'border-border bg-surface-strong text-foreground hover:border-brand'
                        } ${isLocked ? 'cursor-default' : ''}`}
                      >
                        <span className="text-sm font-medium">{option}</span>
                      </button>
                    )
                  })}
                </div>

                {selectedOption ? (
                  <p className="mt-4 text-sm font-medium">
                    {isCorrect ? copy.correct : `${copy.correctWith}${question.correctMeaning}`}
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
            <div className="min-w-0">
              <p className="font-medium text-muted">
                {copy.score} {score} / {questions.length}
              </p>
              {user ? (
                <p className="truncate text-xs text-muted">
                  {saveState === 'saving' || isPending
                    ? copy.saving
                    : saveState === 'saved'
                      ? copy.saved
                      : saveState === 'error'
                        ? copy.saveFailed
                        : null}
                </p>
              ) : null}
            </div>
            <span className="font-semibold text-brand-strong">
              {answeredCount} / {questions.length}
            </span>
          </div>
        </footer>
      ) : null}
    </div>
  )
}
