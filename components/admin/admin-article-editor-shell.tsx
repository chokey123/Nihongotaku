'use client'

import { useEffect, useState } from 'react'

import { useAuth } from '@/components/providers/auth-provider'
import { AdminArticleForm } from '@/components/admin/admin-article-form'
import { backendService } from '@/lib/services/backend-service'
import type { Dictionary } from '@/lib/i18n'
import type { ArticleItem } from '@/lib/types'

export function AdminArticleEditorShell({
  dict,
  mode,
  articleId,
  locale,
  scope = 'admin',
  basePath = 'admin',
}: {
  dict: Dictionary
  mode: 'create' | 'edit'
  articleId?: string
  locale: string
  scope?: 'admin' | 'upload'
  basePath?: 'admin' | 'upload'
}) {
  const { user, isLoading } = useAuth()
  const copy = dict.status
  const [article, setArticle] = useState<ArticleItem | undefined>()
  const [status, setStatus] = useState<'loading' | 'ready' | 'not-found' | 'error'>(
    mode === 'edit' ? 'loading' : 'ready',
  )

  useEffect(() => {
    if (
      mode !== 'edit' ||
      !articleId ||
      isLoading ||
      !user ||
      (scope === 'admin' && user.role !== 'admin')
    ) {
      return
    }

    let isMounted = true

    backendService
      .getArticleById(articleId, { includeUnpublished: true })
      .then((item) => {
        if (!isMounted) return
        if (!item) {
          setStatus('not-found')
          return
        }

        if (scope === 'upload' && user.role !== 'admin' && item.createdBy !== user.id) {
          setStatus('not-found')
          return
        }

        setArticle(item)
        setStatus('ready')
      })
      .catch(() => {
        if (!isMounted) return
        setStatus('error')
      })

    return () => {
      isMounted = false
    }
  }, [articleId, isLoading, mode, scope, user])

  if (isLoading || status === 'loading') {
    return (
        <div className="glass-panel rounded-[32px] border border-border p-6 text-sm text-muted">
        {copy.loadingArticleEntry}
      </div>
    )
  }

  if (status === 'not-found') {
    return (
        <div className="glass-panel rounded-[32px] border border-border p-6 text-sm text-muted">
        {copy.articleNotFound}
      </div>
    )
  }

  if (status === 'error') {
    return (
        <div className="glass-panel rounded-[32px] border border-border p-6 text-sm text-red-600">
        {copy.failedArticleEntry}
      </div>
    )
  }

  return (
    <AdminArticleForm
      dict={dict}
      initialArticle={article}
      mode={mode}
      locale={locale}
      basePath={basePath}
      canPublish={user?.role === 'admin'}
    />
  )
}
