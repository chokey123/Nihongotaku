'use client'

import { useEffect, useState } from 'react'

import { useAuth } from '@/components/providers/auth-provider'
import { AdminArticleLibrary } from '@/components/admin/admin-article-library'
import { backendService } from '@/lib/services/backend-service'
import type { ArticleItem } from '@/lib/types'

export function AdminArticleLibraryShell({
  locale,
  searchPlaceholder,
  loadingLabel,
  errorLabel,
  newLabel,
  publishedLabel,
  draftLabel,
}: {
  locale: string
  searchPlaceholder: string
  loadingLabel: string
  errorLabel: string
  newLabel: string
  publishedLabel: string
  draftLabel: string
}) {
  const { user, isLoading } = useAuth()
  const [items, setItems] = useState<ArticleItem[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    if (isLoading || user?.role !== 'admin') {
      return
    }

    let isMounted = true

    backendService
      .searchAdminArticles()
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
  }, [isLoading, user?.role])

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
    <AdminArticleLibrary
      items={items}
      locale={locale}
      searchPlaceholder={searchPlaceholder}
      newLabel={newLabel}
      publishedLabel={publishedLabel}
      draftLabel={draftLabel}
    />
  )
}
