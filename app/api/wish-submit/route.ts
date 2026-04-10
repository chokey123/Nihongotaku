import { createClient } from '@supabase/supabase-js'

function extractYoutubeId(value: string) {
  const normalized = value.trim()

  if (!normalized) {
    return ''
  }

  try {
    const url = new URL(normalized)

    if (url.hostname.includes('youtu.be')) {
      return url.pathname.replace('/', '')
    }

    if (url.searchParams.get('v')) {
      return url.searchParams.get('v') ?? ''
    }

    const segments = url.pathname.split('/').filter(Boolean)
    return segments.at(-1) ?? ''
  } catch {
    return ''
  }
}

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    return null
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export async function POST(request: Request) {
  const supabase = getServiceSupabase()

  if (!supabase) {
    return Response.json(
      {
        error:
          'Missing Supabase service role configuration. Please set SUPABASE_SERVICE_ROLE_KEY.',
      },
      { status: 500 },
    )
  }

  const body = (await request.json().catch(() => null)) as {
    artist?: string
    title?: string
    genre?: string
    url?: string
  } | null

  const artist = body?.artist?.trim() ?? ''
  const title = body?.title?.trim() ?? ''
  const genre = body?.genre?.trim() ?? ''
  const url = body?.url?.trim() ?? ''
  const youtubeId = extractYoutubeId(url)

  if (!artist || !title || !genre || !url || !youtubeId) {
    return Response.json(
      { error: 'Please complete every field with a valid YouTube link.' },
      { status: 400 },
    )
  }

  const { data: duplicate, error: duplicateError } = await supabase
    .from('music')
    .select('id, title, artist, is_published')
    .eq('youtube_video_id', youtubeId)
    .eq('is_published', true)
    .limit(1)
    .maybeSingle()

  if (duplicateError) {
    return Response.json({ error: duplicateError.message }, { status: 500 })
  }

  if (duplicate) {
    return Response.json(
      {
        error: `此鏈接已在本站被使用："${duplicate.artist} - ${duplicate.title}".`,
      },
      { status: 400 },
    )
  }

  const musicId = crypto.randomUUID()

  const { error: musicError } = await supabase.from('music').insert({
    id: musicId,
    title,
    artist,
    genre,
    source_url: url,
    youtube_video_id: youtubeId,
    submission_source: 'wish',
    is_published: false,
  })

  if (musicError) {
    return Response.json({ error: musicError.message }, { status: 500 })
  }

  const { data: wish, error: wishError } = await supabase
    .from('wish_request')
    .insert({
      artist,
      title,
      genre,
      url,
    })
    .select('id')
    .single()

  if (wishError) {
    return Response.json({ error: wishError.message }, { status: 500 })
  }

  return Response.json({
    ok: true,
    id: wish.id,
    musicId,
    message: `Wish submitted for ${artist} - ${title}`,
  })
}
