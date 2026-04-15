function isPrivateIpv4(hostname: string) {
  const parts = hostname.split('.').map((part) => Number(part))

  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) {
    return false
  }

  const [first, second] = parts

  return (
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    first === 0
  )
}

function isBlockedHostname(hostname: string) {
  const normalized = hostname.toLowerCase()

  return (
    normalized === 'localhost' ||
    normalized.endsWith('.localhost') ||
    normalized === '0.0.0.0' ||
    normalized === '::1' ||
    isPrivateIpv4(normalized)
  )
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const rawUrl = searchParams.get('url') ?? ''

  let imageUrl: URL

  try {
    imageUrl = new URL(rawUrl)
  } catch {
    return new Response('Invalid image URL', { status: 400 })
  }

  if (!['http:', 'https:'].includes(imageUrl.protocol)) {
    return new Response('Unsupported image URL', { status: 400 })
  }

  if (isBlockedHostname(imageUrl.hostname)) {
    return new Response('Blocked image URL', { status: 400 })
  }

  try {
    const response = await fetch(imageUrl)

    if (!response.ok) {
      return new Response('Image not found', { status: response.status })
    }

    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.startsWith('image/')) {
      return new Response('URL is not an image', { status: 415 })
    }

    const contentLength = Number(response.headers.get('content-length') ?? 0)
    if (contentLength > 12 * 1024 * 1024) {
      return new Response('Image is too large', { status: 413 })
    }

    const body = await response.arrayBuffer()

    if (body.byteLength > 12 * 1024 * 1024) {
      return new Response('Image is too large', { status: 413 })
    }

    return new Response(body, {
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        'Content-Type': contentType,
      },
    })
  } catch {
    return new Response('Image fetch failed', { status: 502 })
  }
}
