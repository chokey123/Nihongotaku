'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { buildMusicDraftPayloadFromItem } from '@/lib/music-draft'
import { backendService } from '@/lib/services/backend-service'
import type { Dictionary } from '@/lib/i18n'
import type { Locale, LyricLine } from '@/lib/types'

import { useEditableMusicEntry } from '@/components/music/use-editable-music-entry'

interface YoutubePlayer {
  destroy: () => void
  getCurrentTime: () => number
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void
}

interface YoutubePlayerEvent {
  data?: number
  target: YoutubePlayer
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string,
        config: {
          videoId: string
          height?: string
          width?: string
          playerVars?: Record<string, unknown>
          events?: {
            onReady?: (event: YoutubePlayerEvent) => void
            onStateChange?: (event: YoutubePlayerEvent) => void
          }
        },
      ) => YoutubePlayer
      PlayerState: {
        UNSTARTED: number
        ENDED: number
        PLAYING: number
        PAUSED: number
        BUFFERING: number
        CUED: number
      }
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

const timelineCopy = {
  zh: {
    title: '時間軸校對',
    subtitle: '播放歌曲，按一下按鈕就把目前時間記到當前歌詞，再往下一句前進。',
    currentTime: '目前時間',
    currentLine: '當前歌詞',
    previous: '上一句',
    markAndNext: '記下目前時間並進入下一句',
    markOnly: '記下目前時間',
    restart: '重新來過',
    back: '回到歌曲編輯',
    editLyrics: '回去改歌詞',
    save: '儲存時間軸並返回',
    noLyrics: '請先回到上一頁輸入歌詞。',
    ready: '已設時間',
    saveFailed: '時間軸儲存失敗，請稍後再試。',
    saveSuccess: '時間軸已儲存，正在回到歌曲編輯頁。',
    allDone: '已到最後一句，你可以再微調或直接儲存。',
    locked:
      '這首歌已發布，一般使用者目前不能再修改時間軸。',
  },
  en: {
    title: 'Timeline Calibration',
    subtitle:
      'Play the song, stamp the current time onto the active lyric line, then move forward line by line.',
    currentTime: 'Current time',
    currentLine: 'Current line',
    previous: 'Previous line',
    markAndNext: 'Stamp current time and move to next line',
    markOnly: 'Stamp current time',
    restart: 'Start over',
    back: 'Back to music editor',
    editLyrics: 'Edit lyrics again',
    save: 'Save timeline and return',
    noLyrics: 'Please go back and add lyrics first.',
    ready: 'Timed',
    saveFailed: 'Failed to save the timeline. Please try again later.',
    saveSuccess: 'Timeline saved. Returning to the music editor.',
    allDone: 'You are on the last line. Fine-tune it or save when ready.',
    locked:
      'This song is already published, so regular users can no longer edit its timeline.',
  },
  ja: {
    title: 'タイムライン調整',
    subtitle:
      '楽曲を再生し、現在時刻を現在の歌詞行に記録して、1行ずつ次へ進めます。',
    currentTime: '現在時刻',
    currentLine: '現在の歌詞',
    previous: '前の行',
    markAndNext: '現在時刻を記録して次の行へ',
    markOnly: '現在時刻を記録',
    restart: '最初からやり直す',
    back: '楽曲編集へ戻る',
    editLyrics: '歌詞を編集し直す',
    save: 'タイムラインを保存して戻る',
    noLyrics: '先に歌詞入力ページで歌詞を追加してください。',
    ready: '設定済み',
    saveFailed: 'タイムラインを保存できませんでした。後でもう一度お試しください。',
    saveSuccess: 'タイムラインを保存しました。楽曲編集ページへ戻ります。',
    allDone: '最後の行です。微調整するか、そのまま保存できます。',
    locked:
      'この楽曲はすでに公開されているため、一般ユーザーはタイムラインを編集できません。',
  },
} as const

function formatTimeLabel(atMs: number) {
  const totalSeconds = Math.floor(atMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0')
  const seconds = (totalSeconds % 60).toString().padStart(2, '0')

  return `${minutes}:${seconds}`
}

function formatPreciseTime(atMs: number) {
  const totalSeconds = Math.floor(atMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0')
  const seconds = (totalSeconds % 60).toString().padStart(2, '0')
  const milliseconds = (atMs % 1000).toString().padStart(3, '0')

  return `${minutes}:${seconds}.${milliseconds}`
}

function isPlaceholderTiming(line: LyricLine, index: number) {
  return line.atMs === index && line.timeLabel === formatTimeLabel(index)
}

function useYoutubeTimelinePlayer(videoId: string) {
  const [currentMs, setCurrentMs] = useState(0)
  const playerRef = useRef<YoutubePlayer | null>(null)
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    if (!videoId) {
      return
    }

    const syncCurrentTime = (player: YoutubePlayer) => {
      try {
        const seconds = player.getCurrentTime()
        if (Number.isFinite(seconds)) {
          setCurrentMs(Math.max(0, Math.floor(seconds * 1000)))
        }
      } catch {
        return
      }
    }

    const stopPolling = () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    const startPolling = () => {
      stopPolling()
      intervalRef.current = window.setInterval(() => {
        const player = playerRef.current
        if (!player) {
          return
        }

        syncCurrentTime(player)
      }, 250)
    }

    const mountPlayer = () => {
      if (!window.YT?.Player) {
        return
      }

      stopPolling()
      playerRef.current?.destroy()
      playerRef.current = new window.YT.Player('timeline-player-frame', {
        height: '390',
        width: '640',
        videoId,
        playerVars: {
          playsinline: 1,
          rel: 0,
        },
        events: {
          onReady: (event) => {
            playerRef.current = event.target
            startPolling()
            syncCurrentTime(event.target)
          },
          onStateChange: (event) => {
            if (!window.YT) {
              return
            }

            if (
              event.data === window.YT.PlayerState.PLAYING ||
              event.data === window.YT.PlayerState.PAUSED ||
              event.data === window.YT.PlayerState.ENDED ||
              event.data === window.YT.PlayerState.BUFFERING ||
              event.data === window.YT.PlayerState.CUED
            ) {
              syncCurrentTime(event.target)
            }
          },
        },
      })
    }

    if (window.YT?.Player) {
      mountPlayer()
    } else {
      const existing = document.querySelector<HTMLScriptElement>(
        'script[src="https://www.youtube.com/iframe_api"]',
      )

      if (!existing) {
        const script = document.createElement('script')
        script.src = 'https://www.youtube.com/iframe_api'
        const firstScriptTag = document.getElementsByTagName('script')[0]
        if (firstScriptTag?.parentNode) {
          firstScriptTag.parentNode.insertBefore(script, firstScriptTag)
        } else {
          document.body.appendChild(script)
        }
      }

      window.onYouTubeIframeAPIReady = mountPlayer
    }

    return () => {
      stopPolling()
      playerRef.current?.destroy()
      playerRef.current = null
    }
  }, [videoId])

  const seekToMs = (nextMs: number) => {
    const player = playerRef.current
    if (!player) {
      return
    }

    try {
      player.seekTo(nextMs / 1000, true)
      setCurrentMs(nextMs)
    } catch {
      return
    }
  }

  return {
    currentMs,
    seekToMs,
  }
}

export function MusicTimelineShell({
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
  const {
    music,
    setMusic,
    status,
    isAuthLoading,
    editHref,
    lyricsHref,
  } = useEditableMusicEntry({
    id,
    locale,
    preferredSource: flowSource,
  })
  const copy = timelineCopy[locale]

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
    <MusicTimelineLoaded
      copy={copy}
      editHref={editHref}
      lyricsHref={lyricsHref}
      music={music}
      setMusic={setMusic}
    />
  )
}

function MusicTimelineLoaded({
  copy,
  editHref,
  lyricsHref,
  music,
  setMusic,
}: {
  copy: (typeof timelineCopy)[Locale]
  editHref: string
  lyricsHref: string
  music: NonNullable<ReturnType<typeof useEditableMusicEntry>['music']>
  setMusic: ReturnType<typeof useEditableMusicEntry>['setMusic']
}) {
  const router = useRouter()
  const [lyrics, setLyrics] = useState<LyricLine[]>(music.lyrics)
  const [currentIndex, setCurrentIndex] = useState<number | null>(null)
  const [timedLineIds, setTimedLineIds] = useState<Set<string>>(
    () =>
      new Set(
        music.lyrics
          .filter((line, index) => !isPlaceholderTiming(line, index))
          .map((line) => line.id),
      ),
  )
  const [statusMessage, setStatusMessage] = useState('')
  const [isPending, startTransition] = useTransition()
  const { currentMs, seekToMs } = useYoutubeTimelinePlayer(music.youtubeId)
  const lyricsContainerRef = useRef<HTMLDivElement | null>(null)
  const lyricButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  const timedCount = useMemo(
    () => lyrics.filter((line) => timedLineIds.has(line.id)).length,
    [lyrics, timedLineIds],
  )
  const currentLine =
    currentIndex === null ? null : (lyrics[currentIndex] ?? null)

  useEffect(() => {
    if (!currentLine) {
      return
    }

    const container = lyricsContainerRef.current
    const activeButton = lyricButtonRefs.current[currentLine.id]

    if (!container || !activeButton) {
      return
    }

    const containerRect = container.getBoundingClientRect()
    const buttonRect = activeButton.getBoundingClientRect()
    const nextScrollTop =
      container.scrollTop +
      (buttonRect.top - containerRect.top) -
      container.clientHeight / 2 +
      activeButton.clientHeight / 2

    container.scrollTo({
      top: Math.max(0, nextScrollTop),
      behavior: 'smooth',
    })
  }, [currentLine])

  const markNextLine = () => {
    if (lyrics.length === 0) {
      return
    }

    const targetIndex =
      currentIndex === null ? 0 : Math.min(currentIndex + 1, lyrics.length - 1)
    const targetLine = lyrics[targetIndex]

    if (!targetLine) {
      return
    }

    const nextMs = Math.max(0, currentMs)
    setLyrics((current) =>
      current.map((line, index) =>
        index === targetIndex
          ? {
              ...line,
              atMs: nextMs,
              timeLabel: formatTimeLabel(nextMs),
            }
          : line,
      ),
    )
    setTimedLineIds((current) => new Set(current).add(targetLine.id))
    setCurrentIndex(targetIndex)
  }

  const resetTimeline = () => {
    setLyrics((current) =>
      current.map((line) => ({
        ...line,
        atMs: 0,
        timeLabel: formatTimeLabel(0),
      })),
    )
    setTimedLineIds(new Set())
    setCurrentIndex(null)
    setStatusMessage('')
    seekToMs(0)
  }

  const saveTimelineAndReturn = () => {
    if (lyrics.length === 0) {
      setStatusMessage(copy.noLyrics)
      return
    }

    startTransition(async () => {
      try {
        await backendService.updateMusic(
          music.id,
          buildMusicDraftPayloadFromItem(music, {
            lyrics,
          }),
          { isPublished: music.isPublished ?? false },
        )

        setMusic((current) =>
          current
            ? {
                ...current,
                lyrics,
              }
            : current,
        )
        setStatusMessage(copy.saveSuccess)
        router.push(editHref)
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
              onClick={() => router.push(lyricsHref)}
              className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold transition hover:border-brand"
            >
              {copy.editLyrics}
            </button>
            <button
              type="button"
              onClick={() => router.push(editHref)}
              className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold transition hover:border-brand"
            >
              {copy.back}
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-[26px] border border-border">
          <div
            id="timeline-player-frame"
            className="aspect-video w-full bg-black"
          />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-[24px] border border-border bg-surface p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              {copy.currentTime}
            </p>
            <p className="mt-2 font-heading text-3xl font-bold text-brand-strong">
              {formatPreciseTime(currentMs)}
            </p>
          </div>
          <div className="rounded-[24px] border border-border bg-surface p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              {copy.ready}
            </p>
            <p className="mt-2 font-heading text-3xl font-bold text-brand-strong">
              {timedCount} / {lyrics.length}
            </p>
          </div>
        </div>
      </section>

      <section className="glass-panel rounded-[32px] border border-border p-5">
        {lyrics.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-border bg-surface px-4 py-6 text-sm text-muted">
            {copy.noLyrics}
          </div>
        ) : (
          <>
            <div className="rounded-[24px] border border-border bg-brand-soft/45 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="font-heading text-lg font-bold">
                  {copy.currentLine}
                </h2>
                <span className="text-sm text-muted">
                  {currentIndex === null
                    ? `0 / ${lyrics.length}`
                    : `#${currentIndex + 1} / ${lyrics.length}`}
                </span>
              </div>
              {currentLine ? (
                <>
                  <p className="font-heading text-2xl font-bold">
                    {currentLine.japanese}
                  </p>
                  {currentLine.translation.zh ? (
                    <p className="mt-2 text-sm text-muted">
                      {currentLine.translation.zh}
                    </p>
                  ) : null}
                  {currentLine.translation.en ? (
                    <p className="mt-1 text-sm text-muted/90">
                      {currentLine.translation.en}
                    </p>
                  ) : null}
                  <p className="mt-3 text-sm text-muted">
                    {timedLineIds.has(currentLine.id)
                      ? currentLine.timeLabel
                      : '--:--.---'}
                  </p>
                </>
              ) : (
                <div className="py-6 text-sm text-muted">
                  {copy.markOnly}
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  setCurrentIndex((index) => {
                    if (index === null) {
                      return null
                    }

                    return Math.max(index - 1, 0)
                  })
                }
                disabled={currentIndex === null || currentIndex === 0}
                className="rounded-full border border-border px-4 py-2 text-sm font-semibold transition hover:border-brand disabled:cursor-not-allowed disabled:opacity-40"
              >
                {copy.previous}
              </button>
              <button
                type="button"
                onClick={markNextLine}
                disabled={
                  lyrics.length === 0 ||
                  (currentIndex !== null && currentIndex >= lyrics.length - 1)
                }
                className="rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white"
              >
                {copy.markAndNext}
              </button>
              <button
                type="button"
                onClick={resetTimeline}
                className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold transition hover:border-brand"
              >
                {copy.restart}
              </button>
            </div>

            {currentIndex !== null && currentIndex >= lyrics.length - 1 ? (
              <p className="mt-3 text-sm text-muted">{copy.allDone}</p>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={saveTimelineAndReturn}
                disabled={isPending}
                className="rounded-full border border-border bg-white px-5 py-3 text-sm font-semibold text-foreground transition hover:border-brand disabled:opacity-70 dark:bg-white"
              >
                {isPending ? '...' : copy.save}
              </button>
              {statusMessage ? (
                <span className="text-sm text-muted">{statusMessage}</span>
              ) : null}
            </div>

            <div
              ref={lyricsContainerRef}
              className="mt-6 max-h-[520px] space-y-3 overflow-auto pr-1"
            >
              {lyrics.map((line, index) => {
                const isActive = currentIndex !== null && index === currentIndex

                return (
                  <button
                    key={line.id}
                    ref={(node) => {
                      lyricButtonRefs.current[line.id] = node
                    }}
                    type="button"
                    onClick={() => {
                      setCurrentIndex(index)
                      seekToMs(line.atMs)
                    }}
                    className={`w-full rounded-[24px] border p-4 text-left transition ${
                      isActive
                        ? 'border-brand bg-brand-soft'
                        : 'border-border bg-surface hover:border-brand'
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted">
                      <span>#{index + 1}</span>
                      <span>
                        {timedLineIds.has(line.id) ? line.timeLabel : '--:--.---'}
                      </span>
                    </div>
                    <p className="font-heading text-lg font-bold">
                      {line.japanese}
                    </p>
                    {line.translation.zh ? (
                      <p className="mt-2 text-sm text-muted">
                        {line.translation.zh}
                      </p>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
