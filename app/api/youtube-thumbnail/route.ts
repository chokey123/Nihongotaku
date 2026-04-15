const YOUTUBE_THUMBNAIL_ORIGIN = 'https://img.youtube.com'

function getThumbnailCandidates(videoId: string) {
  return [
    `${YOUTUBE_THUMBNAIL_ORIGIN}/vi/${videoId}/maxresdefault.jpg`,
    `${YOUTUBE_THUMBNAIL_ORIGIN}/vi/${videoId}/sddefault.jpg`,
    `${YOUTUBE_THUMBNAIL_ORIGIN}/vi/${videoId}/hqdefault.jpg`,
  ]
}

function isSafeYoutubeVideoId(value: string) {
  return /^[a-zA-Z0-9_-]{6,32}$/.test(value)
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const videoId = url.searchParams.get('videoId') ?? ''

  if (!isSafeYoutubeVideoId(videoId)) {
    return new Response('Invalid videoId', { status: 400 })
  }

  for (const thumbnailUrl of getThumbnailCandidates(videoId)) {
    try {
      const response = await fetch(thumbnailUrl)

      if (!response.ok) {
        continue
      }

      const contentType = response.headers.get('content-type') ?? 'image/jpeg'
      const body = await response.arrayBuffer()

      return new Response(body, {
        headers: {
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
          'Content-Type': contentType,
        },
      })
    } catch {
      continue
    }
  }

  return new Response('Thumbnail not found', { status: 404 })
}
