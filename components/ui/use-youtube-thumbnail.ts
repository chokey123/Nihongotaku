'use client'

import { useEffect, useState } from 'react'

const thumbnailCache = new Map<string, string | null>()
const pendingCache = new Map<string, Promise<string | null>>()

function getYoutubeThumbnailCandidates(videoId: string) {
  return [
    `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    `https://img.youtube.com/vi/${videoId}/sddefault.jpg`,
    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
  ]
}

async function probeYoutubeThumbnail(videoId: string) {
  if (!videoId) return null

  if (thumbnailCache.has(videoId)) {
    return thumbnailCache.get(videoId) ?? null
  }

  if (pendingCache.has(videoId)) {
    return pendingCache.get(videoId) ?? null
  }

  const pending = (async () => {
    for (const url of getYoutubeThumbnailCandidates(videoId)) {
      try {
        const response = await fetch(url, { method: 'HEAD' })
        if (response.ok) {
          thumbnailCache.set(videoId, url)
          pendingCache.delete(videoId)
          return url
        }
      } catch {
        continue
      }
    }

    thumbnailCache.set(videoId, null)
    pendingCache.delete(videoId)
    return null
  })()

  pendingCache.set(videoId, pending)
  return pending
}

export function useYoutubeThumbnail(videoId: string) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(() =>
    videoId ? (thumbnailCache.get(videoId) ?? null) : null,
  )

  useEffect(() => {
    let isMounted = true

    if (!videoId) {
      void Promise.resolve().then(() => {
        if (!isMounted) return
        setThumbnailUrl(null)
      })
      return
    }

    void probeYoutubeThumbnail(videoId).then((url) => {
      if (!isMounted) return
      setThumbnailUrl(url)
    })

    return () => {
      isMounted = false
    }
  }, [videoId])

  return thumbnailUrl
}
