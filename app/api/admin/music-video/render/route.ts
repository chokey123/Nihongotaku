import { randomUUID } from 'crypto'
import { mkdir, stat } from 'fs/promises'
import path from 'path'

import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'

import {
  MUSIC_VIDEO_COMPOSITION_ID,
  type MusicVideoRenderProps,
  type MusicVideoSlide,
} from '@/lib/music-video-render-types'
import type { Locale, MusicItem } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface RenderRequestBody {
  item?: MusicItem
  slides?: MusicVideoSlide[]
  locale?: Locale
  sectionLabel?: string
  backgroundImageUrl?: string
}

function getAbsoluteAssetUrls(request: Request, item: MusicItem, backgroundImageUrl: string) {
  const origin = new URL(request.url).origin
  const trimmedBackgroundImageUrl = backgroundImageUrl.trim()

  return {
    backgroundImageUrl: trimmedBackgroundImageUrl
      ? `${origin}/api/image-proxy?url=${encodeURIComponent(trimmedBackgroundImageUrl)}`
      : item.youtubeId
        ? `${origin}/api/youtube-thumbnail?videoId=${encodeURIComponent(item.youtubeId)}`
        : '',
    logoUrl: `${origin}/api/brand-logo?variant=text`,
  }
}

function validateRequestBody(body: RenderRequestBody) {
  if (!body.item) {
    throw new Error('Missing music item.')
  }

  if (!Array.isArray(body.slides) || body.slides.length === 0) {
    throw new Error('Missing video slides.')
  }

  if (!body.slides.some((slide) => slide.type === 'lyric')) {
    throw new Error('Select at least one lyric slide.')
  }

  return {
    item: body.item,
    slides: body.slides,
    locale:
      body.locale === 'en' || body.locale === 'ja' || body.locale === 'zh'
        ? body.locale
        : 'zh',
    sectionLabel: body.sectionLabel?.trim() || 'サビ / 副歌',
    backgroundImageUrl: body.backgroundImageUrl ?? '',
  }
}

export async function POST(request: Request) {
  try {
    const body = validateRequestBody((await request.json()) as RenderRequestBody)
    const assets = getAbsoluteAssetUrls(request, body.item, body.backgroundImageUrl)
    const inputProps: MusicVideoRenderProps = {
      item: body.item,
      slides: body.slides,
      locale: body.locale,
      sectionLabel: body.sectionLabel,
      backgroundImageUrl: assets.backgroundImageUrl,
      logoUrl: assets.logoUrl,
    }
    const remotionInputProps = inputProps as unknown as Record<string, unknown>

    const entryPoint = path.join(process.cwd(), 'remotion', 'music-video-root.tsx')
    const serveUrl = await bundle({
      entryPoint,
      publicDir: path.join(process.cwd(), 'public'),
    })

    const composition = await selectComposition({
      serveUrl,
      id: MUSIC_VIDEO_COMPOSITION_ID,
      inputProps: remotionInputProps,
      timeoutInMilliseconds: 120_000,
      logLevel: 'warn',
    })

    const outputDir = path.join(process.cwd(), 'public', 'generated-videos')
    await mkdir(outputDir, { recursive: true })

    const outputFileName = `${randomUUID()}.mp4`
    const outputLocation = path.join(outputDir, outputFileName)

    await renderMedia({
      composition,
      serveUrl,
      codec: 'h264',
      audioCodec: 'aac',
      enforceAudioTrack: true,
      muted: true,
      pixelFormat: 'yuv420p',
      inputProps: remotionInputProps,
      outputLocation,
      overwrite: true,
      timeoutInMilliseconds: 180_000,
      videoBitrate: '8M',
      logLevel: 'warn',
    })

    const outputStat = await stat(outputLocation)

    return Response.json({
      url: `/generated-videos/${outputFileName}`,
      mimeType: 'video/mp4',
      size: outputStat.size,
    })
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to render Remotion video.',
      },
      { status: 500 },
    )
  }
}
