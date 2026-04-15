import { backendService } from '@/lib/services/backend-service'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 6

function parsePositiveInteger(value: string | null, fallback: number) {
  if (!value) {
    return fallback
  }

  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function parseOffset(value: string | null) {
  if (!value) {
    return 0
  }

  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const query = url.searchParams.get('q') ?? ''
  const artist = url.searchParams.get('artist')
  const genre = url.searchParams.get('genre')
  const limit = parsePositiveInteger(url.searchParams.get('limit'), PAGE_SIZE)
  const offset = parseOffset(url.searchParams.get('offset'))

  const page = await backendService.searchMusicPage(query, {
    artist,
    genre,
    limit,
    offset,
  })

  return Response.json(page)
}
