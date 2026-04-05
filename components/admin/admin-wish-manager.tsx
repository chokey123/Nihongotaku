'use client'

import { useEffect, useState, useTransition } from 'react'
import { usePathname } from 'next/navigation'

import { useAuth } from '@/components/providers/auth-provider'
import { backendService } from '@/lib/services/backend-service'
import type { WishRequestItem } from '@/lib/types'

const wishManagerCopy = {
  ja: {
    loading: '正在載入許願清單...',
    failedLoad: '載入許願清單失敗。',
    empty: '目前還沒有許願請求。',
    openLink: '開啟連結',
    deleting: '刪除中...',
    delete: '刪除',
    deletedPrefix: '已刪除許願：',
    failedDelete: '刪除許願失敗。',
    pending: '待處理',
  },
  en: {
    loading: 'Loading wish requests...',
    failedLoad: 'Failed to load wish requests.',
    empty: 'No wish requests yet.',
    openLink: 'Open link',
    deleting: 'Deleting...',
    delete: 'Delete',
    deletedPrefix: 'Deleted wish: ',
    failedDelete: 'Failed to delete wish.',
    pending: 'pending',
  },
  zh: {
    loading: '正在載入許願清單...',
    failedLoad: '載入許願清單失敗。',
    empty: '目前還沒有許願請求。',
    openLink: '開啟連結',
    deleting: '刪除中...',
    delete: '刪除',
    deletedPrefix: '已刪除許願：',
    failedDelete: '刪除許願失敗。',
    pending: '待處理',
  },
} as const

function formatWishDate(value?: string) {
  if (!value) return ''

  try {
    return new Intl.DateTimeFormat('en-SG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(value))
  } catch {
    return value
  }
}

export function AdminWishManager() {
  const pathname = usePathname()
  const { user, isLoading } = useAuth()
  const [items, setItems] = useState<WishRequestItem[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()
  const locale =
    pathname.split('/')[1] === 'zh' || pathname.split('/')[1] === 'en'
      ? pathname.split('/')[1]
      : 'ja'
  const copy = wishManagerCopy[locale as keyof typeof wishManagerCopy]

  useEffect(() => {
    if (isLoading || user?.role !== 'admin') {
      return
    }

    let isMounted = true

    backendService
      .getWishRequests()
      .then((nextItems) => {
        if (!isMounted) return
        setItems(nextItems)
        setStatus('ready')
      })
      .catch((error) => {
        if (!isMounted) return
        setStatus('error')
        setMessage(error instanceof Error ? error.message : copy.failedLoad)
      })

    return () => {
      isMounted = false
    }
  }, [copy.failedLoad, isLoading, user?.role])

  if (isLoading || status === 'loading') {
    return (
        <div className="glass-panel rounded-[32px] border border-border p-6 text-sm text-muted">
        {copy.loading}
      </div>
    )
  }

  if (status === 'error') {
    return (
        <div className="glass-panel rounded-[32px] border border-border p-6 text-sm text-red-600">
        {message || copy.failedLoad}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {message ? (
        <div className="rounded-[24px] border border-border bg-surface px-4 py-3 text-sm text-muted">
          {message}
        </div>
      ) : null}

      {items.length === 0 ? (
        <div className="glass-panel rounded-[32px] border border-border p-6 text-sm text-muted">
          {copy.empty}
        </div>
      ) : (
        <div className="grid gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="glass-panel rounded-[28px] border border-border p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span className="rounded-full border border-border bg-white px-3 py-1 dark:bg-white">
                      {item.status ?? copy.pending}
                    </span>
                    {item.createdAt ? <span>{formatWishDate(item.createdAt)}</span> : null}
                  </div>
                  <h2 className="font-heading text-2xl font-bold">{item.title}</h2>
                  <p className="text-sm text-muted">{item.artist}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-muted">
                    {item.genre ? (
                      <span className="rounded-full bg-brand-soft px-3 py-1 font-semibold text-brand-strong">
                        {item.genre}
                      </span>
                    ) : null}
                    {item.url ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-border px-3 py-1 hover:border-brand hover:text-brand-strong"
                      >
                        {copy.openLink}
                      </a>
                    ) : null}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      try {
                        await backendService.deleteWishRequest(item.id)
                        setItems((current) =>
                          current.filter((entry) => entry.id !== item.id),
                        )
                        setMessage(`${copy.deletedPrefix}${item.title}`)
                      } catch (error) {
                        setMessage(
                          error instanceof Error
                            ? error.message
                            : copy.failedDelete,
                        )
                      }
                    })
                  }
                  className="rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:border-red-300 disabled:opacity-70 dark:bg-white"
                >
                  {isPending ? copy.deleting : copy.delete}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
