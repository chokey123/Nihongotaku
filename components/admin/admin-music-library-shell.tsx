'use client'

import { useEffect, useState } from 'react'

import { useAuth } from '@/components/providers/auth-provider'
import { AdminMusicLibrary } from '@/components/admin/admin-music-library'
import { backendService } from '@/lib/services/backend-service'
import type { MusicItem } from '@/lib/types'

export function AdminMusicLibraryShell({
  locale,
  mode,
  basePath = 'admin',
  scope = 'admin',
  searchPlaceholder,
  loadingLabel,
  errorLabel,
  newLabel,
  publishedLabel,
  draftLabel,
  quizLabel,
}: {
  locale: string
  mode: 'music' | 'quiz'
  basePath?: 'admin' | 'upload'
  scope?: 'admin' | 'upload'
  searchPlaceholder: string
  loadingLabel: string
  errorLabel: string
  newLabel: string
  publishedLabel: string
  draftLabel: string
  quizLabel: string
}) {
  const { user, isLoading } = useAuth()
  const [items, setItems] = useState<MusicItem[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    if (isLoading || !user || (scope === 'admin' && user.role !== 'admin')) {
      return
    }

    let isMounted = true

    const loadItems =
      scope === 'admin'
        ? backendService.searchMusic('', { includeUnpublished: true })
        : backendService.searchMusicUploads(
            user.role === 'admin' ? undefined : user.id,
          )

    loadItems
      .then((nextItems) => {
        if (!isMounted) return
        setItems(nextItems)
        setStatus('ready')
      })
      .catch(() => {
        if (!isMounted) return
        setStatus('error')
      })

    return () => {
      isMounted = false
    }
  }, [isLoading, scope, user])

  if (isLoading || status === 'loading') {
    return (
        <div className="glass-panel rounded-[32px] border border-border p-6 text-sm text-muted">
        {loadingLabel}
      </div>
    )
  }

  if (status === 'error') {
    return (
        <div className="glass-panel rounded-[32px] border border-border p-6 text-sm text-red-600">
        {errorLabel}
      </div>
    )
  }

  return (
    <AdminMusicLibrary
      items={items}
      locale={locale}
      mode={mode}
      basePath={basePath}
      searchPlaceholder={searchPlaceholder}
      newLabel={newLabel}
      publishedLabel={publishedLabel}
      draftLabel={draftLabel}
      quizLabel={quizLabel}
      allowDelete={
        mode === 'music' &&
        ((scope === 'admin' && user?.role === 'admin') || scope === 'upload')
      }
      deleteLabel={
        locale === 'en' ? 'Delete' : locale === 'ja' ? '削除' : '刪除'
      }
      deleteConfirmTitle={
        locale === 'en'
          ? 'Are you sure you want to delete this music?'
          : locale === 'ja'
            ? 'この楽曲を削除してもよろしいですか？'
            : '確定要刪除嗎？'
      }
      deleteConfirmDescription={
        locale === 'en'
          ? 'Only unpublished music can be deleted. You can either confirm or cancel.'
          : locale === 'ja'
            ? '未公開の楽曲のみ削除できます。確認するか、キャンセルしてください。'
            : '只能刪除未發佈的歌曲。你可以確認刪除，或選擇取消。'
      }
      cancelLabel={locale === 'en' ? 'Cancel' : locale === 'ja' ? 'キャンセル' : '取消'}
      confirmDeleteLabel={
        locale === 'en' ? 'Confirm delete' : locale === 'ja' ? '削除を確認' : '確認刪除'
      }
    />
  )
}
