'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

import {
  AutocompleteInput,
  type AutocompleteOption,
} from '@/components/ui/autocomplete-input'
import type { MusicItem } from '@/lib/types'
import { useYoutubeThumbnail } from '@/components/ui/use-youtube-thumbnail'
import { backendService } from '@/lib/services/backend-service'

function AdminMusicLibraryCard({
  item,
  href,
  mode,
  locale,
  quizLabel,
  publishedLabel,
  draftLabel,
  showDeleteButton,
  deleteLabel,
  onDelete,
}: {
  item: MusicItem
  href: string
  mode: 'music' | 'quiz'
  locale: string
  quizLabel: string
  publishedLabel: string
  draftLabel: string
  showDeleteButton?: boolean
  deleteLabel?: string
  onDelete?: (item: MusicItem) => Promise<void>
}) {
  const thumbnailUrl = useYoutubeThumbnail(item.youtubeId)

  const sourceLabel =
    item.creatorRole === 'admin'
      ? locale === 'en'
        ? 'Admin created'
        : locale === 'ja'
          ? '管理者作成'
          : '管理員建立'
      : item.submissionSource === 'wish'
        ? locale === 'en'
          ? 'From wish'
          : locale === 'ja'
            ? '祈願から'
            : '來自許願'
        : locale === 'en'
          ? 'User upload'
          : locale === 'ja'
            ? 'ユーザー投稿'
            : '使用者上傳'

  return (
    <div className="glass-panel group relative flex flex-col overflow-hidden rounded-[28px] border border-border transition hover:-translate-y-1 hover:border-brand">
      {showDeleteButton && onDelete ? (
        <div className="pointer-events-none absolute z-10 p-3">
          <button
            type="button"
            onClick={() => {
              void onDelete(item)
            }}
            aria-label={deleteLabel}
            title={deleteLabel}
            className="pointer-events-auto inline-flex h-12 w-12 items-center justify-center text-[2rem] font-semibold leading-none text-red-500/75 transition hover:scale-105 hover:text-red-600 disabled:opacity-50 dark:text-red-300/80 dark:hover:text-red-200"
          >
            ×
          </button>
        </div>
      ) : null}
      <Link href={href} className="flex flex-col overflow-hidden">
        <div className="relative h-48 overflow-hidden">
          {thumbnailUrl ? (
            <>
              <Image
                src={thumbnailUrl}
                alt={`${item.title} thumbnail`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
            </>
          ) : (
            <>
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(135deg, ${item.palette.from}, ${item.palette.to})`,
                }}
              />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.35),transparent_28%)]" />
            </>
          )}
          <div className="absolute bottom-4 left-4 rounded-full bg-white/28 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
            {item.thumbnailLabel}
          </div>
          {mode === 'quiz' ? (
            <div className="absolute right-4 top-4 rounded-full bg-white/24 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
              {item.quizVocabKeys.length} {quizLabel}
            </div>
          ) : (
            <div className="absolute right-4 top-4 rounded-full bg-white/24 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
              {item.isPublished ? publishedLabel : draftLabel}
            </div>
          )}
        </div>
        <div className="space-y-2 p-4">
          <p className="text-sm font-medium text-muted">{item.artist}</p>
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-heading text-xl font-bold tracking-tight">
              {item.title}
            </h3>
            <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-strong">
              {item.genre}
            </span>
          </div>
          {mode === 'music' ? (
            <div className="space-y-1.5 text-xs">
              <p className="font-semibold text-muted">{sourceLabel}</p>
            </div>
          ) : null}
        </div>
      </Link>
    </div>
  )
}

export function AdminMusicLibrary({
  items,
  locale,
  mode,
  basePath = 'admin',
  searchPlaceholder,
  newLabel,
  publishedLabel,
  draftLabel,
  quizLabel,
  allowDelete = false,
  deleteLabel = 'Delete',
  deleteConfirmTitle = 'Confirm delete?',
  deleteConfirmDescription = 'Only unpublished music can be deleted.',
  cancelLabel = 'Cancel',
  confirmDeleteLabel = 'Delete',
}: {
  items: MusicItem[]
  locale: string
  mode: 'music' | 'quiz'
  basePath?: 'admin' | 'upload'
  searchPlaceholder: string
  newLabel: string
  publishedLabel: string
  draftLabel: string
  quizLabel: string
  allowDelete?: boolean
  deleteLabel?: string
  deleteConfirmTitle?: string
  deleteConfirmDescription?: string
  cancelLabel?: string
  confirmDeleteLabel?: string
}) {
  const router = useRouter()
  const [draftQuery, setDraftQuery] = useState('')
  const [query, setQuery] = useState('')
  const [selectedSource, setSelectedSource] = useState<
    'all' | 'wish' | 'upload' | 'admin'
  >('all')
  const [selectedPublishState, setSelectedPublishState] = useState<
    'all' | 'published' | 'draft'
  >('all')
  const [showUploadNotice, setShowUploadNotice] = useState(false)
  const [itemsState, setItemsState] = useState(items)
  const [statusMessage, setStatusMessage] = useState('')
  const [pendingDeleteItem, setPendingDeleteItem] = useState<MusicItem | null>(
    null,
  )
  const [isDeleting, setIsDeleting] = useState(false)
  const searchSuggestionArtistLabel =
    locale === 'en' ? 'Artist' : locale === 'ja' ? 'Artist' : '歌手'
  const searchSuggestionSongLabel =
    locale === 'en' ? 'Song' : locale === 'ja' ? 'Song' : '歌曲'

  useEffect(() => {
    setItemsState(items)
  }, [items])

  const suggestions = useMemo<AutocompleteOption[]>(() => {
    const keyword = draftQuery.trim().toLowerCase()
    if (!keyword) {
      return []
    }

    const unique = new Map<string, AutocompleteOption>()

    for (const item of itemsState) {
      if (
        item.artist.toLowerCase().includes(keyword) &&
        !unique.has(`artist:${item.artist}`)
      ) {
        unique.set(`artist:${item.artist}`, {
          key: `artist:${item.artist}`,
          value: item.artist,
          meta: searchSuggestionArtistLabel,
        })
      }

      if (
        item.title.toLowerCase().includes(keyword) &&
        !unique.has(`song:${item.title}`)
      ) {
        unique.set(`song:${item.title}`, {
          key: `song:${item.title}`,
          value: item.title,
          meta: searchSuggestionSongLabel,
        })
      }

      if (unique.size >= 5) {
        break
      }
    }

    return [...unique.values()]
  }, [
    draftQuery,
    itemsState,
    searchSuggestionArtistLabel,
    searchSuggestionSongLabel,
  ])

  const filteredItems = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return itemsState
      .filter((item) =>
        [item.title, item.artist, item.genre].some((value) =>
          value.toLowerCase().includes(keyword),
        ),
      )
      .filter((item) => {
        if (selectedSource === 'all') {
          return true
        }

        if (selectedSource === 'admin') {
          return item.creatorRole === 'admin'
        }

        return item.submissionSource === selectedSource
      })
      .filter((item) => {
        if (selectedPublishState === 'all') {
          return true
        }

        return selectedPublishState === 'published'
          ? Boolean(item.isPublished)
          : !item.isPublished
      })
      .filter((item) => {
        if (!keyword) {
          return true
        }

        return [item.title, item.artist, item.genre].some((value) =>
          value.toLowerCase().includes(keyword),
        )
      })
  }, [itemsState, query, selectedPublishState, selectedSource])

  const sourceFilterLabel =
    locale === 'en'
      ? 'Source filter'
      : locale === 'ja'
        ? '作成元絞り込み'
        : '來源篩選'
  const publishFilterLabel =
    locale === 'en'
      ? 'Status filter'
      : locale === 'ja'
        ? '公開状態絞り込み'
        : '狀態篩選'
  const clearFiltersLabel =
    locale === 'en'
      ? 'Clear filters'
      : locale === 'ja'
        ? '絞り込み解除'
        : '清除篩選'
  const suggestionArtistLabel =
    locale === 'en'
      ? 'Artist'
      : locale === 'ja'
        ? 'ã‚¢ãƒ¼ãƒ†ã‚£ã‚¹ãƒˆ'
        : 'æ­Œæ‰‹'
  const suggestionSongLabel =
    locale === 'en' ? 'Song' : locale === 'ja' ? 'æ¥½æ›²' : 'æ­Œæ›²'
  void suggestionArtistLabel
  void suggestionSongLabel

  const sourceOptions = [
    {
      key: 'wish' as const,
      label: locale === 'en' ? 'Wish' : locale === 'ja' ? '祈願' : '許願',
    },
    {
      key: 'upload' as const,
      label:
        locale === 'en'
          ? 'User upload'
          : locale === 'ja'
            ? 'ユーザー投稿'
            : '使用者上傳',
    },
    {
      key: 'admin' as const,
      label:
        locale === 'en'
          ? 'Admin created'
          : locale === 'ja'
            ? '管理者建立'
            : '管理員建立',
    },
  ]
  const publishOptions = [
    {
      key: 'published' as const,
      label: publishedLabel,
    },
    {
      key: 'draft' as const,
      label: draftLabel,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-2xl">
          <form
            onSubmit={(event) => {
              event.preventDefault()
              setQuery(draftQuery)
            }}
          >
            <AutocompleteInput
              value={draftQuery}
              onValueChange={setDraftQuery}
              suggestions={suggestions}
              placeholder={searchPlaceholder}
              onSelect={(option) => {
                setDraftQuery(option.value)
                setQuery(option.value)
              }}
              onCommit={(nextValue) => {
                setQuery(nextValue)
              }}
              wrapperClassName="flex w-full items-center gap-3 rounded-[24px] border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-border dark:bg-surface"
              inputClassName="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-foreground dark:placeholder:text-muted"
            />
          </form>
        </div>
        {mode === 'music' ? (
          <button
            type="button"
            onClick={() => {
              if (basePath === 'upload') {
                setShowUploadNotice(true)
                return
              }

              router.push(`/${locale}/${basePath}/music/new`)
            }}
            className="rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white"
          >
            {newLabel}
          </button>
        ) : null}
      </div>

      {mode === 'music' ? (
        <div className="space-y-4">
          {basePath === 'admin' ? (
            <div className="grid gap-3 md:grid-cols-[8rem_minmax(0,1fr)] md:items-start">
              <div className="pt-2 text-sm font-semibold text-muted">
                {sourceFilterLabel}
              </div>
              <div className="flex flex-wrap gap-2">
                {sourceOptions.map((option) => {
                  const isActive = selectedSource === option.key

                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() =>
                        setSelectedSource((current) =>
                          current === option.key ? 'all' : option.key,
                        )
                      }
                      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                        isActive
                          ? 'border-brand bg-brand-soft text-brand-strong'
                          : 'border-border bg-surface text-muted hover:border-brand hover:text-brand-strong'
                      }`}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-[8rem_minmax(0,1fr)] md:items-start">
            <div className="pt-2 text-sm font-semibold text-muted">
              {publishFilterLabel}
            </div>
            <div className="flex flex-wrap gap-2">
              {publishOptions.map((option) => {
                const isActive = selectedPublishState === option.key

                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() =>
                      setSelectedPublishState((current) =>
                        current === option.key ? 'all' : option.key,
                      )
                    }
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      isActive
                        ? 'border-brand bg-brand-soft text-brand-strong'
                        : 'border-border bg-surface text-muted hover:border-brand hover:text-brand-strong'
                    }`}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>

          {selectedSource !== 'all' || selectedPublishState !== 'all' ? (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setSelectedSource('all')
                  setSelectedPublishState('all')
                }}
                className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-muted transition hover:border-brand hover:text-brand-strong"
              >
                {clearFiltersLabel}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filteredItems.map((item) => {
          const href =
            mode === 'music'
              ? `/${locale}/${basePath}/music/${item.id}`
              : `/${locale}/${basePath}/music/quiz/${item.id}`

          return (
            <AdminMusicLibraryCard
              key={item.id}
              item={item}
              href={href}
              mode={mode}
              locale={locale}
              quizLabel={quizLabel}
              publishedLabel={publishedLabel}
              draftLabel={draftLabel}
              showDeleteButton={
                allowDelete && mode === 'music' && !item.isPublished
              }
              deleteLabel={deleteLabel}
              onDelete={async (target) => {
                setPendingDeleteItem(target)
              }}
            />
          )
        })}
      </div>
      {statusMessage ? (
        <div className="glass-panel rounded-[24px] border border-border px-4 py-3 text-sm text-muted">
          {statusMessage}
        </div>
      ) : null}

      {showUploadNotice ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="glass-panel w-full max-w-2xl rounded-[32px] border border-border p-6">
            <h2 className="font-heading text-2xl font-bold">
              {locale === 'en'
                ? 'Before you upload a song'
                : locale === 'ja'
                  ? '楽曲を投稿する前に'
                  : '在你上傳歌曲之前'}
            </h2>
            <div className="mt-4 space-y-3 text-sm text-muted">
              <p>
                {locale === 'en'
                  ? '1. You can publish your own song once the content is ready.'
                  : locale === 'ja'
                    ? '1. 品質を保つため、すべての投稿は公開前に管理者の審査が必要です。'
                    : '1. 歌曲在上傳後只有你和管理員能看到你上傳了什麽歌曲，在完成歌詞，翻譯等内容後選擇“發佈”，本站的所有使用者便能瀏覽。'}
              </p>
              <p>
                {locale === 'en'
                  ? '2. Please make sure the lyrics, timeline, and vocab are accurate before publishing.'
                  : locale === 'ja'
                    ? '2. 投稿後 7 日間は投稿者が優先して編集できます。期間を過ぎても歌詞や単語が未完成の場合、管理者が補完して公開することがあります。'
                    : '2. “發佈”前请自行确认歌詞、時間軸、單詞内容准确。'}
              </p>
              <p>
                {locale === 'en'
                  ? '3. Administrators may unpublish or delete content if it is inappropriate, misleading, or clearly incorrect.'
                  : locale === 'ja'
                    ? '3. 歌詞と単語の内容が整ったら「完成」を押してください。管理者が優先して審査・公開します。'
                    : '3. 歌曲上傳後，你有 7 天的優先編輯權；若超過期限且歌詞與單字內容仍未完善，管理員可能會協助完善並發佈。'}
              </p>
              <p>
                {locale === 'en'
                  ? '4. You can continue updating your own song after publishing if you need to fix or improve it.'
                  : locale === 'ja'
                    ? '4. 公開後の内容は一般ユーザーは編集できません。'
                    : '4. 在你的發佈前后, 管理员如果判斷内容不当或明显有误，有權撤下或删除以保證本站内容質量。'}
              </p>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowUploadNotice(false)}
                className="rounded-full border border-border bg-surface px-5 py-3 text-sm font-semibold text-foreground transition hover:border-brand"
              >
                {locale === 'en' ? 'Cancel' : locale === 'ja' ? '戻る' : '返回'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUploadNotice(false)
                  router.push(`/${locale}/${basePath}/music/new`)
                }}
                className="rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white"
              >
                {locale === 'en'
                  ? 'I understand'
                  : locale === 'ja'
                    ? '理解しました'
                    : '我了解了'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {pendingDeleteItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="glass-panel w-full max-w-lg rounded-[32px] border border-border p-6">
            <h2 className="font-heading text-2xl font-bold">
              {deleteConfirmTitle}
            </h2>
            <p className="mt-3 text-sm text-muted">
              {deleteConfirmDescription}
            </p>
            <p className="mt-3 text-sm font-semibold text-foreground">
              {pendingDeleteItem.artist} - {pendingDeleteItem.title}
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingDeleteItem(null)}
                disabled={isDeleting}
                className="rounded-full border border-border bg-surface px-5 py-3 text-sm font-semibold text-foreground transition hover:border-brand disabled:opacity-70"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!pendingDeleteItem) {
                    return
                  }

                  setIsDeleting(true)

                  void backendService
                    .deleteMusic(pendingDeleteItem.id)
                    .then(() => {
                      setItemsState((current) =>
                        current.filter(
                          (item) => item.id !== pendingDeleteItem.id,
                        ),
                      )
                      setStatusMessage(
                        locale === 'en'
                          ? 'Music deleted.'
                          : locale === 'ja'
                            ? '楽曲を削除しました。'
                            : '歌曲已刪除。',
                      )
                      setPendingDeleteItem(null)
                    })
                    .catch((error) => {
                      setStatusMessage(
                        error instanceof Error
                          ? error.message
                          : locale === 'en'
                            ? 'Delete failed.'
                            : locale === 'ja'
                              ? '削除に失敗しました。'
                              : '刪除失敗。',
                      )
                    })
                    .finally(() => {
                      setIsDeleting(false)
                    })
                }}
                disabled={isDeleting}
                className="rounded-full border border-red-300 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 transition hover:border-red-400 hover:bg-red-100 disabled:opacity-70 dark:border-red-700 dark:bg-red-950/40 dark:text-red-100 dark:hover:bg-red-950/60"
              >
                {isDeleting
                  ? locale === 'en'
                    ? 'Deleting...'
                    : locale === 'ja'
                      ? '削除中...'
                      : '刪除中...'
                  : confirmDeleteLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
