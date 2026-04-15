export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const logoVariant = searchParams.get('variant')
  const logoUrl =
    logoVariant === 'text'
      ? process.env.NEXT_PUBLIC_NIHONGOTAKU_LOGO_TEXT_URL
      : process.env.NEXT_PUBLIC_NIHONGOTAKU_MOBILE_LOGO_URL

  if (!logoUrl) {
    return new Response('Logo URL is not configured', { status: 404 })
  }

  try {
    const response = await fetch(logoUrl)

    if (!response.ok) {
      return new Response('Logo not found', { status: response.status })
    }

    const contentType = response.headers.get('content-type') ?? 'image/png'
    const body = await response.arrayBuffer()

    return new Response(body, {
      headers: {
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'Content-Type': contentType,
      },
    })
  } catch {
    return new Response('Logo fetch failed', { status: 502 })
  }
}
