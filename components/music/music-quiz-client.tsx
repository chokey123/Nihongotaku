'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'

import { useAuth } from '@/components/providers/auth-provider'
import { backendService } from '@/lib/services/backend-service'
import type {
  Locale,
  MusicItem,
  MusicQuizAttemptRecord,
  MusicQuizQuestion,
  VocabDifficulty,
} from '@/lib/types'

const QUESTIONS_PER_PAGE = 5
const difficultyOrder: VocabDifficulty[] = ['beginner', 'intermediate', 'hard']

const quizCopy = {
  ja: {
    titleSuffix: 'Quiz',
    score: '点数',
    pickMeaning: '正しい意味を選んでください',
    correct: '正解です。',
    correctWith: '正解: ',
    empty: 'この難易度にはまだクイズ単語がありません。',
    historyLoading: '前回の回答を読み込んでいます...',
    historyReady: '前回の回答結果を復元しました。',
    historyEmpty: 'ログインすると回答結果が自動保存されます。',
    signInHint:
      'ログインすると回答後に自動保存され、次回は前回どこを間違えたか確認できます。',
    saving: 'この問題を保存しています...',
    saved: 'この問題を保存しました。',
    saveFailed: 'この問題を保存できませんでした。後でもう一度お試しください。',
    retry: 'やり直す',
    lastAttempt: '前回の回答',
    previousPage: '前へ',
    nextPage: '次へ',
    beginner: '初級',
    intermediate: '中級',
    hard: '難しい',
  },
  en: {
    titleSuffix: 'Quiz',
    score: 'Score',
    pickMeaning: 'Pick the correct meaning',
    correct: 'Correct answer.',
    correctWith: 'Correct answer: ',
    empty: 'No quiz vocab exists for this difficulty yet.',
    historyLoading: 'Loading your last quiz attempt...',
    historyReady: 'Your last quiz attempt has been restored.',
    historyEmpty: 'Sign in and your quiz answers will be saved automatically.',
    signInHint:
      'Sign in to save each answer automatically and review your last result next time.',
    saving: 'Saving this answer...',
    saved: 'This answer has been saved.',
    saveFailed: 'This answer could not be saved. Please try again later.',
    retry: 'Try again',
    lastAttempt: 'Last attempt',
    previousPage: 'Previous',
    nextPage: 'Next',
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    hard: 'Hard',
  },
  zh: {
    titleSuffix: '测验',
    score: '分数',
    pickMeaning: '请选择出正确意思',
    correct: '答对了。',
    correctWith: '正确答案：',
    empty: '当前难度还没有任何测验单词。',
    historyLoading: '正在读取你上次的作答记录...',
    historyReady: '已载入你上次的作答结果。',
    historyEmpty: '登录后，作答记录会自动保存。',
    signInHint:
      '登录后，每答一题都会自动保存，下次进来可以直接看到上次每题对错。',
    saving: '正在保存这一题...',
    saved: '这一题已保存。',
    saveFailed: '这一题未能保存，请稍后再试。',
    retry: '重新作答',
    lastAttempt: '上次作答',
    previousPage: '上一页',
    nextPage: '下一页',
    beginner: '初级',
    intermediate: '中级',
    hard: '困难',
  },
} as const

function buildSelectedOptionsFromAttempt(
  attempt: MusicQuizAttemptRecord | null,
) {
  if (!attempt) {
    return {}
  }

  return Object.fromEntries(
    attempt.answers.map((answer) => [
      answer.questionKey,
      answer.selectedMeaning,
    ]),
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
  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, string>
  >({})
  const [latestAttempt, setLatestAttempt] =
    useState<MusicQuizAttemptRecord | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [saveState, setSaveState] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle')
  const [pendingQuestionKey, setPendingQuestionKey] = useState<string | null>(
    null,
  )
  const [selectedDifficulty, setSelectedDifficulty] =
    useState<VocabDifficulty>('intermediate')
  const [pageByDifficulty, setPageByDifficulty] = useState<
    Record<VocabDifficulty, number>
  >({
    beginner: 0,
    intermediate: 0,
    hard: 0,
  })
  const [pageInput, setPageInput] = useState('1')
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
        return
      }

      setIsHistoryLoading(true)
      setHistoryError(null)

      try {
        const attempt = await backendService.getLatestMusicQuizAttempt(item.id)

        if (!isMounted) {
          return
        }

        setLatestAttempt(attempt)
        setSelectedOptions(buildSelectedOptionsFromAttempt(attempt))
      } catch (error) {
        if (!isMounted) {
          return
        }

        setHistoryError(
          error instanceof Error ? error.message : copy.saveFailed,
        )
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

  const visibleQuestions = useMemo(
    () =>
      questions.filter(
        (question) => question.difficulty === selectedDifficulty,
      ),
    [questions, selectedDifficulty],
  )

  const currentPage = pageByDifficulty[selectedDifficulty] ?? 0

  useEffect(() => {
    const totalPages = Math.max(
      1,
      Math.ceil(visibleQuestions.length / QUESTIONS_PER_PAGE),
    )
    setPageByDifficulty((current) => {
      const nextPage = Math.min(
        current[selectedDifficulty] ?? 0,
        totalPages - 1,
      )

      if (nextPage === (current[selectedDifficulty] ?? 0)) {
        return current
      }

      return {
        ...current,
        [selectedDifficulty]: nextPage,
      }
    })
  }, [selectedDifficulty, visibleQuestions.length])

  useEffect(() => {
    setPageInput(String(currentPage + 1))
  }, [currentPage])

  const score = useMemo(
    () =>
      visibleQuestions.reduce((total, question) => {
        return selectedOptions[question.key] === question.correctMeaning
          ? total + 1
          : total
      }, 0),
    [selectedOptions, visibleQuestions],
  )

  const answeredCount = useMemo(
    () =>
      visibleQuestions.reduce(
        (total, question) => total + (selectedOptions[question.key] ? 1 : 0),
        0,
      ),
    [selectedOptions, visibleQuestions],
  )

  const totalPages = Math.max(
    1,
    Math.ceil(visibleQuestions.length / QUESTIONS_PER_PAGE),
  )
  const pageQuestions = visibleQuestions.slice(
    currentPage * QUESTIONS_PER_PAGE,
    currentPage * QUESTIONS_PER_PAGE + QUESTIONS_PER_PAGE,
  )
  const answerLocale = locale === 'ja' ? 'ZH' : locale.toUpperCase()

  const updateCurrentPage = (nextPage: number) => {
    setPageByDifficulty((current) => ({
      ...current,
      [selectedDifficulty]: Math.min(Math.max(nextPage, 0), totalPages - 1),
    }))
  }

  return (
    <div className="space-y-6 pb-28">
      <section className="glass-panel rounded-[32px] border border-border p-6">
        <p className="text-sm text-muted">{item.artist}</p>
        <h1 className="mt-2 font-heading text-3xl font-bold">
          {item.title} {copy.titleSuffix}
        </h1>
        <p className="mt-3 text-sm text-muted">
          {copy.pickMeaning} {answerLocale}。{copy.score}: {score} /{' '}
          {visibleQuestions.length}
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
        {historyError ? (
          <p className="mt-2 text-sm text-red-500">{historyError}</p>
        ) : null}
        {questions.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setSelectedOptions({})
                setLatestAttempt(null)
                setHistoryError(null)
                setSaveState('idle')
                setPendingQuestionKey(null)
                setPageByDifficulty({
                  beginner: 0,
                  intermediate: 0,
                  hard: 0,
                })
              }}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:border-brand"
            >
              {copy.retry}
            </button>
            {/* <span className="text-sm text-muted">
              {currentPage + 1} / {totalPages}
            </span> */}
          </div>
        ) : null}
        {questions.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {difficultyOrder.map((difficulty) => (
              <button
                key={difficulty}
                type="button"
                onClick={() => setSelectedDifficulty(difficulty)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  selectedDifficulty === difficulty
                    ? 'border-brand bg-brand-soft text-brand-strong'
                    : 'border-border text-muted hover:border-brand hover:text-brand-strong'
                }`}
              >
                {copy[difficulty]}
              </button>
            ))}
          </div>
        ) : null}
      </section>

      {visibleQuestions.length > 0 ? (
        <>
          <div className="space-y-4">
            {pageQuestions.map((question, pageIndex) => {
              const questionIndex = questions.findIndex(
                (entry) => entry.key === question.key,
              )
              const displayIndex = currentPage * QUESTIONS_PER_PAGE + pageIndex
              const selectedOption = selectedOptions[question.key]
              const isCorrect = selectedOption === question.correctMeaning
              const isLocked = Boolean(selectedOption)
              const isSavingThisQuestion =
                pendingQuestionKey === question.key &&
                (saveState === 'saving' || isPending)

              return (
                <section
                  key={question.key}
                  className="glass-panel rounded-[28px] border border-border p-5"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-strong">
                      Q{displayIndex + 1}
                    </span>
                    <div>
                      <h2 className="font-heading text-2xl font-bold">
                        {question.word}
                      </h2>
                      <p className="text-sm text-muted">{question.furigana}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {question.options.map((option) => {
                      const isSelected = selectedOption === option
                      const revealCorrect =
                        Boolean(selectedOption) &&
                        option === question.correctMeaning
                      const revealWrong =
                        isSelected && option !== question.correctMeaning

                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            if (isLocked) {
                              return
                            }

                            setSelectedOptions((current) => ({
                              ...current,
                              [question.key]: option,
                            }))

                            if (!user) {
                              return
                            }

                            setPendingQuestionKey(question.key)
                            setSaveState('saving')

                            startTransition(async () => {
                              try {
                                const attempt =
                                  await backendService.saveMusicQuizAnswer({
                                    musicId: item.id,
                                    questionKey: question.key,
                                    selectedMeaning: option,
                                    correctMeaning: question.correctMeaning,
                                    seqNo: questionIndex,
                                    totalQuestions: questions.length,
                                  })

                                setLatestAttempt(attempt)
                                setSaveState('saved')
                              } catch {
                                setSaveState('error')
                              } finally {
                                setPendingQuestionKey((current) =>
                                  current === question.key ? null : current,
                                )
                              }
                            })
                          }}
                          disabled={isLocked}
                          className={`rounded-[22px] border p-4 text-left transition ${
                            revealCorrect
                              ? 'border-emerald-200 bg-emerald-50/95 text-slate-900 dark:border-emerald-700 dark:bg-emerald-900/45 dark:text-emerald-100'
                              : revealWrong
                                ? 'border-rose-200 bg-rose-50/95 text-slate-900 dark:border-rose-700 dark:bg-rose-900/45 dark:text-rose-100'
                                : isSelected
                                  ? 'border-brand/35 bg-brand-soft/55 text-slate-900 dark:border-brand/40 dark:bg-brand/20 dark:text-foreground'
                                  : 'border-border bg-surface-strong text-foreground hover:border-brand hover:bg-surface'
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

                  {user && isSavingThisQuestion ? (
                    <p className="mt-2 text-xs text-muted">{copy.saving}</p>
                  ) : null}
                </section>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => updateCurrentPage(currentPage - 1)}
              disabled={currentPage === 0}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:border-brand disabled:cursor-not-allowed disabled:opacity-40"
            >
              {copy.previousPage}
            </button>
            <div className="flex items-center gap-2 text-sm text-muted">
              <input
                type="number"
                min={1}
                max={totalPages}
                value={pageInput}
                onChange={(event) => setPageInput(event.target.value)}
                onBlur={() => {
                  const parsed = Number.parseInt(pageInput, 10)
                  if (Number.isNaN(parsed)) {
                    setPageInput(String(currentPage + 1))
                    return
                  }

                  updateCurrentPage(parsed - 1)
                }}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') {
                    return
                  }

                  event.preventDefault()
                  const parsed = Number.parseInt(pageInput, 10)
                  if (Number.isNaN(parsed)) {
                    setPageInput(String(currentPage + 1))
                    return
                  }

                  updateCurrentPage(parsed - 1)
                }}
                className="w-16 rounded-full border border-border bg-surface px-3 py-1 text-center text-foreground outline-none transition focus:border-brand"
              />
              <span>/ {totalPages}</span>
            </div>
            <button
              type="button"
              onClick={() => updateCurrentPage(currentPage + 1)}
              disabled={currentPage >= totalPages - 1}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:border-brand disabled:cursor-not-allowed disabled:opacity-40"
            >
              {copy.nextPage}
            </button>
          </div>
        </>
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
                {copy.score} {score} / {visibleQuestions.length}
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
              {answeredCount} / {visibleQuestions.length}
            </span>
          </div>
        </footer>
      ) : null}
    </div>
  )
}
