'use client'

import { useMemo, useRef, useState } from 'react'

import type { Locale, LyricLine, MusicItem, MusicVocabItem } from '@/lib/types'

const VIDEO_WIDTH = 1080
const VIDEO_HEIGHT = 1920
const FPS = 30

const MIME_CANDIDATES = [
  'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
  'video/mp4',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
]

const MUSIC_SECTION_LABELS = [
  { ja: 'イントロ', zh: '前奏' },
  { ja: 'Aメロ', zh: '主歌' },
  { ja: 'Bメロ', zh: '前副歌' },
  { ja: 'サビ', zh: '副歌' },
  { ja: '間奏', zh: '間奏' },
  { ja: 'Cメロ', zh: '2段主歌' },
  { ja: '落ちサビ', zh: '靜止副歌' },
  { ja: '大サビ', zh: '最後大副歌' },
  { ja: 'アウトロ', zh: '尾奏' },
].map((section) => ({
  ...section,
  label: `${section.ja} / ${section.zh}`,
}))

type VideoSlide =
  | {
      type: 'opening'
      durationMs: number
    }
  | {
      type: 'lyric'
      durationMs: number
      line: LyricLine
      lineNumber: number
    }
  | {
      type: 'ending'
      durationMs: number
    }

function getLocalizedText(
  value: Partial<Record<Locale, string>>,
  locale: Locale,
) {
  return value[locale] || value.zh || value.en || value.ja || ''
}

function getLineVocabs(item: MusicItem, lineId: string) {
  return item.vocab.filter((entry) => entry.lineId === lineId)
}

function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function getSupportedMimeType() {
  if (typeof MediaRecorder === 'undefined') {
    return ''
  }

  return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type)) ?? ''
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Image failed to load'))
    image.src = src
  })
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight)
  const drawWidth = image.naturalWidth * scale
  const drawHeight = image.naturalHeight * scale
  const drawX = x + (width - drawWidth) / 2
  const drawY = y + (height - drawHeight) / 2

  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight)
}

function drawContainImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight)
  const drawWidth = image.naturalWidth * scale
  const drawHeight = image.naturalHeight * scale
  const drawX = x + (width - drawWidth) / 2
  const drawY = y + (height - drawHeight) / 2

  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight)
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (!normalized) {
    return []
  }

  const words = normalized.includes(' ')
    ? normalized.split(' ')
    : [...normalized]
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const separator = normalized.includes(' ') ? ' ' : ''
    const nextLine = currentLine ? `${currentLine}${separator}${word}` : word

    if (ctx.measureText(nextLine).width <= maxWidth || !currentLine) {
      currentLine = nextLine
      continue
    }

    lines.push(currentLine)
    currentLine = word
  }

  if (currentLine) {
    lines.push(currentLine)
  }

  return lines
}

function balanceWrappedLines(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  maxWidth: number,
) {
  const balanced = [...lines]

  for (let index = balanced.length - 1; index > 0; index -= 1) {
    let current = balanced[index]
    let previous = balanced[index - 1]

    while (previous.length - current.length > 3) {
      const moved = previous.at(-1)
      if (!moved) break

      const nextCurrent = `${moved}${current}`
      if (ctx.measureText(nextCurrent).width > maxWidth) {
        break
      }

      previous = previous.slice(0, -1)
      current = nextCurrent
    }

    balanced[index - 1] = previous
    balanced[index] = current
  }

  return balanced
}

function drawFallbackBackground(
  ctx: CanvasRenderingContext2D,
  item: MusicItem,
) {
  const gradient = ctx.createLinearGradient(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT)
  gradient.addColorStop(0, item.palette.from)
  gradient.addColorStop(1, item.palette.to)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT)
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  item: MusicItem,
  backgroundImage?: HTMLImageElement,
) {
  drawFallbackBackground(ctx, item)

  if (backgroundImage) {
    ctx.save()
    ctx.filter = 'blur(10px) brightness(0.96) saturate(1.12)'
    drawCoverImage(ctx, backgroundImage, -28, -28, VIDEO_WIDTH + 56, VIDEO_HEIGHT + 56)
    ctx.restore()
  }

  const overlay = ctx.createLinearGradient(0, 0, 0, VIDEO_HEIGHT)
  overlay.addColorStop(0, 'rgba(255, 255, 255, 0.24)')
  overlay.addColorStop(0.55, 'rgba(255, 255, 255, 0.30)')
  overlay.addColorStop(1, 'rgba(255, 247, 237, 0.56)')
  ctx.fillStyle = overlay
  ctx.fillRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT)
}

function drawFooter(ctx: CanvasRenderingContext2D) {
  ctx.save()
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = 'rgba(255, 255, 255, 0.84)'
  ctx.shadowBlur = 14
  ctx.strokeStyle = '#7c2d12'
  ctx.lineWidth = 5
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(150, 1760)
  ctx.lineTo(216, 1760)
  ctx.moveTo(190, 1736)
  ctx.lineTo(218, 1760)
  ctx.lineTo(190, 1784)
  ctx.stroke()

  ctx.fillStyle = '#7c2d12'
  ctx.font = '900 46px system-ui, sans-serif'
  ctx.fillText('滑動查看歌詞與文法解析', 270, 1738)
  ctx.fillStyle = 'rgba(4, 1, 0, 0.78)'
  ctx.font = '700 34px system-ui, sans-serif'
  ctx.fillText('右にスワイプして歌詞と文法解説をチェック！', 270, 1794)
  ctx.restore()
}

function fitFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  startSize: number,
  minSize: number,
  weight = 900,
) {
  let size = startSize
  ctx.font = `${weight} ${size}px system-ui, sans-serif`

  while (ctx.measureText(text).width > maxWidth && size > minSize) {
    size -= 2
    ctx.font = `${weight} ${size}px system-ui, sans-serif`
  }

  return size
}

function drawOpeningSlide(
  ctx: CanvasRenderingContext2D,
  item: MusicItem,
  sectionLabel: string,
  backgroundImage?: HTMLImageElement,
  logo?: HTMLImageElement,
) {
  drawBackground(ctx, item, backgroundImage)

  ctx.save()
  ctx.shadowColor = 'rgba(15, 23, 42, 0.24)'
  ctx.shadowBlur = 34
  ctx.shadowOffsetY = 18
  ctx.fillStyle = 'rgba(255, 255, 255, 0.70)'
  roundRect(ctx, 70, 96, VIDEO_WIDTH - 140, 1588, 52)
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.46)'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.fillStyle = 'rgba(249, 115, 22, 0.86)'
  roundRect(ctx, 70, 96, 20, 1588, 10)
  ctx.fill()
  ctx.restore()

  if (logo) {
    ctx.save()
    ctx.shadowColor = 'rgba(255, 255, 255, 0.78)'
    ctx.shadowBlur = 20
    drawContainImage(ctx, logo, 190, 168, 700, 118)
    ctx.restore()
  }

  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.shadowColor = 'rgba(255, 255, 255, 0.82)'
  ctx.shadowBlur = 16
  ctx.fillStyle = '#111827'
  ctx.font = '900 72px system-ui, sans-serif'
  ctx.fillText('歌詞から日本語を学ぶ', VIDEO_WIDTH / 2, 430)
  ctx.fillStyle = '#7c2d12'
  ctx.font = '900 92px system-ui, sans-serif'
  ctx.fillText('從歌詞學日語', VIDEO_WIDTH / 2, 540)
  ctx.restore()

  ctx.save()
  const divider = ctx.createLinearGradient(190, 710, 890, 710)
  divider.addColorStop(0, 'rgba(249, 115, 22, 0)')
  divider.addColorStop(0.18, 'rgba(249, 115, 22, 0.64)')
  divider.addColorStop(0.5, 'rgba(124, 45, 18, 0.72)')
  divider.addColorStop(0.82, 'rgba(249, 115, 22, 0.64)')
  divider.addColorStop(1, 'rgba(249, 115, 22, 0)')
  ctx.strokeStyle = divider
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(190, 710)
  ctx.lineTo(890, 710)
  ctx.stroke()
  ctx.restore()

  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  const artistSize = fitFontSize(ctx, item.artist, 810, 62, 36)
  ctx.font = `900 ${artistSize}px system-ui, sans-serif`
  ctx.fillStyle = '#7c2d12'
  ctx.fillText(item.artist, VIDEO_WIDTH / 2, 830)

  const titleSize = fitFontSize(ctx, item.title, 840, 88, 48)
  ctx.font = `900 ${titleSize}px system-ui, sans-serif`
  ctx.fillStyle = '#111827'
  ctx.fillText(item.title, VIDEO_WIDTH / 2, 930)

  ctx.fillStyle = 'rgba(255, 247, 237, 0.88)'
  roundRect(ctx, 210, 1110, 660, 96, 48)
  ctx.fill()
  ctx.strokeStyle = 'rgba(249, 115, 22, 0.34)'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.fillStyle = '#7c2d12'
  ctx.font = '800 46px system-ui, sans-serif'
  ctx.fillText(sectionLabel, VIDEO_WIDTH / 2, 1134)
  ctx.restore()

  drawFooter(ctx)
}

function drawLyricSlide(
  ctx: CanvasRenderingContext2D,
  item: MusicItem,
  slide: Extract<VideoSlide, { type: 'lyric' }>,
  locale: Locale,
  backgroundImage?: HTMLImageElement,
  logo?: HTMLImageElement,
) {
  drawBackground(ctx, item, backgroundImage)

  ctx.save()
  ctx.shadowColor = 'rgba(15, 23, 42, 0.24)'
  ctx.shadowBlur = 34
  ctx.shadowOffsetY = 18
  ctx.fillStyle = 'rgba(255, 255, 255, 0.72)'
  roundRect(ctx, 70, 96, VIDEO_WIDTH - 140, 1588, 52)
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.46)'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.fillStyle = 'rgba(249, 115, 22, 0.86)'
  roundRect(ctx, 70, 96, 20, 1588, 10)
  ctx.fill()
  ctx.restore()

  if (logo) {
    ctx.save()
    ctx.shadowColor = 'rgba(255, 255, 255, 0.78)'
    ctx.shadowBlur = 20
    drawContainImage(ctx, logo, 150, 108, 780, 308)
    ctx.restore()
  }

  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillStyle = '#9a3412'
  ctx.font = '800 44px system-ui, sans-serif'
  ctx.fillText(slide.line.timeLabel || `Line ${slide.lineNumber}`, VIDEO_WIDTH / 2, 430)
  ctx.fillStyle = '#7c2d12'
  const artistSize = fitFontSize(ctx, item.artist, 760, 54, 34)
  ctx.font = `900 ${artistSize}px system-ui, sans-serif`
  ctx.fillText(item.artist, VIDEO_WIDTH / 2, 484)
  ctx.fillStyle = '#7c2d12'
  const titleSize = fitFontSize(ctx, item.title, 800, 56, 34)
  ctx.font = `900 ${titleSize}px system-ui, sans-serif`
  ctx.fillText(item.title, VIDEO_WIDTH / 2, 548)

  const lyricMaxWidth = 820
  let lyricFontSize = 68
  let lyricLines: string[] = []
  while (lyricFontSize >= 40) {
    ctx.font = `900 ${lyricFontSize}px system-ui, sans-serif`
    lyricLines = balanceWrappedLines(
      ctx,
      wrapText(ctx, slide.line.japanese, lyricMaxWidth).slice(0, 4),
      lyricMaxWidth,
    )
    const lyricHeight = lyricLines.length * lyricFontSize * 1.2
    if (lyricHeight <= 330) {
      break
    }
    lyricFontSize -= 2
  }

  const lyricLineHeight = Math.round(lyricFontSize * 1.18)
  const lyricTop = 690
  ctx.fillStyle = '#111827'
  ctx.font = `900 ${lyricFontSize}px system-ui, sans-serif`
  lyricLines.forEach((line, index) => {
    ctx.fillText(line, VIDEO_WIDTH / 2, lyricTop + index * lyricLineHeight)
  })

  const translation = getLocalizedText(slide.line.translation, locale)
  let contentBottom = lyricTop + lyricLines.length * lyricLineHeight
  if (translation) {
    ctx.fillStyle = '#4b5563'
    ctx.font = '800 50px system-ui, sans-serif'
    const translationLines = balanceWrappedLines(
      ctx,
      wrapText(ctx, translation, 780).slice(0, 3),
      780,
    )
    translationLines.forEach((line, index) => {
      ctx.fillText(line, VIDEO_WIDTH / 2, contentBottom + 30 + index * 66)
    })
    contentBottom += 30 + translationLines.length * 66
  }

  const vocabs = getLineVocabs(item, slide.line.id)
  if (vocabs.length > 0) {
    ctx.textAlign = 'left'
    const vocabTop = Math.max(contentBottom + 62, 1050)
    const bottomBound = 1632
    const gap = vocabs.length > 3 ? 14 : 22
    const cardHeight = Math.max(
      86,
      Math.min(132, (bottomBound - vocabTop - gap * (vocabs.length - 1)) / vocabs.length),
    )
    const totalCardHeight = vocabs.length * cardHeight + (vocabs.length - 1) * gap
    const startY =
      vocabs.length <= 2
        ? vocabTop + Math.max(0, (bottomBound - vocabTop - totalCardHeight) / 2)
        : vocabTop
    vocabs.forEach((vocab, index) => {
      drawVideoVocabChip(ctx, vocab, 170, startY + index * (cardHeight + gap), 740, cardHeight)
    })
  }

  ctx.restore()
  drawFooter(ctx)
}

function drawVideoVocabChip(
  ctx: CanvasRenderingContext2D,
  vocab: MusicVocabItem,
  x: number,
  y: number,
  width: number,
  height = 68,
) {
  ctx.save()
  ctx.fillStyle = 'rgba(255, 247, 237, 0.86)'
  roundRect(ctx, x, y, width, height, 30)
  ctx.fill()
  ctx.strokeStyle = 'rgba(249, 115, 22, 0.28)'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.fillStyle = '#7c2d12'
  ctx.font = '900 40px system-ui, sans-serif'
  ctx.fillText(vocab.word, x + 34, y + 20)
  if (vocab.furigana) {
    ctx.fillStyle = '#9a3412'
    ctx.font = '700 24px system-ui, sans-serif'
    ctx.fillText(vocab.furigana, x + 34, y + height - 36)
  }
  const meaning = getLocalizedText(vocab.meaning, 'zh')
  if (meaning) {
    ctx.fillStyle = '#4b5563'
    ctx.font = '800 30px system-ui, sans-serif'
    const meaningLines = wrapText(ctx, meaning, width - 310).slice(0, 2)
    meaningLines.forEach((line, index) => {
      ctx.fillText(line, x + 286, y + 22 + index * 38)
    })
  }
  ctx.restore()
}

function drawEndingSlide(
  ctx: CanvasRenderingContext2D,
  item: MusicItem,
  backgroundImage?: HTMLImageElement,
  logo?: HTMLImageElement,
  mobileLogo?: HTMLImageElement,
) {
  drawBackground(ctx, item, backgroundImage)

  ctx.save()
  ctx.shadowColor = 'rgba(15, 23, 42, 0.24)'
  ctx.shadowBlur = 34
  ctx.shadowOffsetY = 18
  ctx.fillStyle = 'rgba(255, 255, 255, 0.72)'
  roundRect(ctx, 70, 96, VIDEO_WIDTH - 140, 1588, 52)
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.46)'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.fillStyle = 'rgba(249, 115, 22, 0.86)'
  roundRect(ctx, 70, 96, 20, 1588, 10)
  ctx.fill()
  ctx.restore()

  if (logo) {
    ctx.save()
    ctx.shadowColor = 'rgba(255, 255, 255, 0.78)'
    ctx.shadowBlur = 20
    drawContainImage(ctx, logo, 140, 112, 800, 300)
    ctx.restore()
  } else {
    ctx.save()
    ctx.strokeStyle = '#40523f'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.arc(VIDEO_WIDTH / 2, 148, 54, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = '#40523f'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = '900 42px system-ui, sans-serif'
    ctx.fillText('日文', VIDEO_WIDTH / 2, 148)
    ctx.restore()
  }

  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillStyle = '#3a1f0d'
  ctx.shadowColor = 'rgba(80, 42, 16, 0.14)'
  ctx.shadowBlur = 8
  ctx.font = '900 82px system-ui, sans-serif'
  ctx.fillText('もっと学びたい？', VIDEO_WIDTH / 2, 650)
  ctx.font = '900 106px system-ui, sans-serif'
  ctx.fillText('フォローしてね！', VIDEO_WIDTH / 2, 792)
  ctx.font = '900 62px system-ui, sans-serif'
  ctx.fillText('關注我觀看更多內容！', VIDEO_WIDTH / 2, 980)
  ctx.restore()

  if (mobileLogo) {
    ctx.save()
    ctx.shadowColor = 'rgba(15, 23, 42, 0.18)'
    ctx.shadowBlur = 24
    ctx.shadowOffsetY = 10
    drawContainImage(ctx, mobileLogo, 330, 1138, 420, 300)
    ctx.restore()
  }
}

function drawSlide(
  ctx: CanvasRenderingContext2D,
  item: MusicItem,
  slide: VideoSlide,
  locale: Locale,
  sectionLabel: string,
  backgroundImage?: HTMLImageElement,
  logo?: HTMLImageElement,
  mobileLogo?: HTMLImageElement,
) {
  if (slide.type === 'opening') {
    drawOpeningSlide(ctx, item, sectionLabel, backgroundImage, logo)
    return
  }

  if (slide.type === 'ending') {
    drawEndingSlide(ctx, item, backgroundImage, logo, mobileLogo)
    return
  }

  drawLyricSlide(ctx, item, slide, locale, backgroundImage, logo)
}

function buildSlides(
  lines: LyricLine[],
  startIndex: number,
  endIndex: number,
  openingDurationMs: number,
  fallbackLastDurationMs: number,
  endingDurationMs: number,
) {
  const slides: VideoSlide[] = [{ type: 'opening', durationMs: openingDurationMs }]
  const selectedLines = lines.slice(startIndex, endIndex + 1)

  selectedLines.forEach((line, index) => {
    const absoluteIndex = startIndex + index
    const nextLine = lines[absoluteIndex + 1]
    const durationMs = nextLine
      ? Math.max(500, nextLine.atMs - line.atMs)
      : fallbackLastDurationMs

    slides.push({
      type: 'lyric',
      durationMs,
      line,
      lineNumber: absoluteIndex + 1,
    })
  })

  slides.push({ type: 'ending', durationMs: endingDurationMs })

  return slides
}

function getBackgroundUrl(item: MusicItem, backgroundImageUrl: string) {
  const trimmed = backgroundImageUrl.trim()
  if (trimmed) {
    return `/api/image-proxy?url=${encodeURIComponent(trimmed)}`
  }

  return item.youtubeId
    ? `/api/youtube-thumbnail?videoId=${encodeURIComponent(item.youtubeId)}`
    : ''
}

async function renderVideo({
  canvas,
  item,
  slides,
  locale,
  sectionLabel,
  backgroundImageUrl,
  onProgress,
}: {
  canvas: HTMLCanvasElement
  item: MusicItem
  slides: VideoSlide[]
  locale: Locale
  sectionLabel: string
  backgroundImageUrl: string
  onProgress: (progress: number) => void
}) {
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas is not supported.')
  }

  const backgroundUrl = getBackgroundUrl(item, backgroundImageUrl)
  const [backgroundImage, logo, mobileLogo] = await Promise.all([
    backgroundUrl ? loadImage(backgroundUrl).catch(() => undefined) : undefined,
    loadImage('/api/brand-logo?variant=text').catch(() => undefined),
    loadImage('/api/brand-logo').catch(() => undefined),
  ])

  const mimeType = getSupportedMimeType()
  if (!mimeType) {
    throw new Error('This browser does not support video recording.')
  }

  const canvasStream = canvas.captureStream(FPS)
  const audioContext = new AudioContext()
  const destination = audioContext.createMediaStreamDestination()
  const oscillator = audioContext.createOscillator()
  const gain = audioContext.createGain()
  gain.gain.value = 0
  oscillator.connect(gain)
  gain.connect(destination)
  oscillator.start()

  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...destination.stream.getAudioTracks(),
  ])
  const recorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: 8_000_000,
  })
  const chunks: BlobPart[] = []
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data)
    }
  }

  const totalDurationMs = slides.reduce(
    (total, slide) => total + slide.durationMs,
    0,
  )
  const slideStartTimes = slides.reduce<number[]>((starts, slide, index) => {
    starts[index] =
      index === 0 ? 0 : starts[index - 1] + slides[index - 1].durationMs
    return starts
  }, [])

  const stopped = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: mimeType }))
    }
  })

  recorder.start(250)
  const startedAt = performance.now()

  await new Promise<void>((resolve) => {
    const tick = (now: number) => {
      const elapsedMs = Math.min(now - startedAt, totalDurationMs)
      const matchedSlideIndex = slideStartTimes.findLastIndex(
        (start) => elapsedMs >= start,
      )
      const slideIndex = Math.min(
        slides.length - 1,
        Math.max(0, matchedSlideIndex),
      )
      drawSlide(
        ctx,
        item,
        slides[slideIndex],
        locale,
        sectionLabel,
        backgroundImage,
        logo,
        mobileLogo,
      )
      onProgress(totalDurationMs === 0 ? 1 : elapsedMs / totalDurationMs)

      if (elapsedMs < totalDurationMs) {
        requestAnimationFrame(tick)
        return
      }

      resolve()
    }

    requestAnimationFrame(tick)
  })

  await new Promise((resolve) => setTimeout(resolve, 180))
  recorder.stop()
  oscillator.stop()
  canvasStream.getTracks().forEach((track) => track.stop())
  destination.stream.getTracks().forEach((track) => track.stop())
  await audioContext.close()

  return {
    blob: await stopped,
    mimeType,
  }
}

void renderVideo

export function AdminMusicVideoGenerator({
  locale,
  music,
}: {
  locale: string
  music: MusicItem[]
}) {
  const normalizedLocale: Locale =
    locale === 'en' || locale === 'ja' || locale === 'zh' ? locale : 'zh'
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [selectedMusicId, setSelectedMusicId] = useState(music[0]?.id ?? '')
  const selectedMusic = useMemo(
    () => music.find((item) => item.id === selectedMusicId) ?? music[0],
    [music, selectedMusicId],
  )
  const lyrics = selectedMusic?.lyrics ?? []
  const [startLineId, setStartLineId] = useState(lyrics[0]?.id ?? '')
  const [endLineId, setEndLineId] = useState(lyrics[Math.min(lyrics.length - 1, 5)]?.id ?? '')
  const [sectionLabel, setSectionLabel] = useState(
    MUSIC_SECTION_LABELS[3]?.label ?? '',
  )
  const [openingDurationMs, setOpeningDurationMs] = useState(2500)
  const [endingDurationMs, setEndingDurationMs] = useState(3000)
  const [fallbackLastDurationMs, setFallbackLastDurationMs] = useState(4000)
  const [backgroundImageUrl, setBackgroundImageUrl] = useState('')
  const [status, setStatus] = useState('')
  const [progress, setProgress] = useState(0)
  const [isRendering, setIsRendering] = useState(false)
  const [videoUrl, setVideoUrl] = useState('')
  const [videoMimeType, setVideoMimeType] = useState('')
  const [videoSize, setVideoSize] = useState(0)

  const startIndex = Math.max(
    0,
    lyrics.findIndex((line) => line.id === startLineId),
  )
  const rawEndIndex = lyrics.findIndex((line) => line.id === endLineId)
  const endIndex = Math.max(startIndex, rawEndIndex >= 0 ? rawEndIndex : startIndex)
  const selectedSlides = selectedMusic
    ? buildSlides(
        lyrics,
        startIndex,
        endIndex,
        openingDurationMs,
        fallbackLastDurationMs,
        endingDurationMs,
      )
    : []
  const totalDurationMs = selectedSlides.reduce(
    (total, slide) => total + slide.durationMs,
    0,
  )
  const supportedMimeType = getSupportedMimeType()
  const outputExtension = videoMimeType.includes('mp4') ? 'mp4' : 'webm'
  const downloadName = selectedMusic
    ? `${selectedMusic.artist}-${selectedMusic.title}-lyric-slideshow.${outputExtension}`
        .replace(/[^\w.-]+/g, '-')
        .toLowerCase()
    : `lyric-slideshow.${outputExtension}`

  const handleMusicChange = (musicId: string) => {
    const nextMusic = music.find((item) => item.id === musicId)
    const nextLyrics = nextMusic?.lyrics ?? []
    setSelectedMusicId(musicId)
    setStartLineId(nextLyrics[0]?.id ?? '')
    setEndLineId(nextLyrics[Math.min(nextLyrics.length - 1, 5)]?.id ?? '')
    setBackgroundImageUrl('')
    setVideoUrl('')
    setVideoMimeType('')
    setVideoSize(0)
    setProgress(0)
    setStatus('')
  }

  const handleRender = async () => {
    if (!selectedMusic || lyrics.length === 0) {
      setStatus('Select a song with lyric timeline first.')
      return
    }

    setIsRendering(true)
    setStatus('Rendering MP4 with Remotion...')
    setProgress(0)
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl)
      setVideoUrl('')
    }
    setVideoMimeType('')
    setVideoSize(0)

    let progressTimer: number | undefined

    try {
      progressTimer = window.setInterval(() => {
        setProgress((current) => Math.min(0.92, current + 0.02))
      }, 1000)

      const response = await fetch('/api/admin/music-video/render', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          item: selectedMusic,
          slides: selectedSlides,
          locale: normalizedLocale,
          sectionLabel,
          backgroundImageUrl,
        }),
      })

      window.clearInterval(progressTimer)
      progressTimer = undefined

      const payload = (await response.json()) as {
        url?: string
        mimeType?: string
        size?: number
        error?: string
      }

      if (!response.ok || !payload.url) {
        throw new Error(payload.error || 'Remotion render failed.')
      }

      const cacheBustedUrl = `${payload.url}?v=${Date.now()}`
      setVideoUrl(cacheBustedUrl)
      setVideoMimeType(payload.mimeType || 'video/mp4')
      setVideoSize(payload.size ?? 0)
      setProgress(1)
      setStatus(
        `MP4 video ready${
          payload.size ? ` (${(payload.size / 1024 / 1024).toFixed(1)} MB)` : ''
        }.`,
      )
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Render failed.')
    } finally {
      if (progressTimer !== undefined) {
        window.clearInterval(progressTimer)
      }
      setIsRendering(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <section className="glass-panel space-y-5 rounded-[32px] border border-border p-6">
        <div>
          <h2 className="font-heading text-2xl font-bold">Video source</h2>
          <p className="mt-2 text-sm text-muted">
            Generate a vertical slideshow from the selected lyric timeline.
          </p>
        </div>

        <label className="block space-y-2 text-sm">
          <span className="font-semibold">Song</span>
          <select
            value={selectedMusic?.id ?? ''}
            onChange={(event) => handleMusicChange(event.target.value)}
            className="w-full rounded-2xl border border-border bg-surface px-4 py-3 outline-none"
          >
            {music.map((item) => (
              <option key={item.id} value={item.id}>
                {item.artist} - {item.title}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-2 text-sm">
            <span className="font-semibold">Start lyric</span>
            <select
              value={startLineId}
              onChange={(event) => {
                const nextStartId = event.target.value
                const nextStartIndex = lyrics.findIndex(
                  (line) => line.id === nextStartId,
                )
                setStartLineId(nextStartId)
                if (rawEndIndex >= 0 && nextStartIndex > rawEndIndex) {
                  setEndLineId(nextStartId)
                }
                setVideoUrl('')
                setStatus('')
              }}
              className="w-full rounded-2xl border border-border bg-surface px-4 py-3 outline-none"
            >
              {lyrics.map((line, index) => (
                <option key={line.id} value={line.id}>
                  {index + 1}. {line.timeLabel || formatDuration(line.atMs)} /{' '}
                  {line.japanese}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2 text-sm">
            <span className="font-semibold">End lyric</span>
            <select
              value={endLineId}
              onChange={(event) => {
                setEndLineId(event.target.value)
                setVideoUrl('')
                setStatus('')
              }}
              className="w-full rounded-2xl border border-border bg-surface px-4 py-3 outline-none"
            >
              {lyrics.map((line, index) => (
                <option
                  key={line.id}
                  value={line.id}
                  disabled={index < startIndex}
                >
                  {index + 1}. {line.timeLabel || formatDuration(line.atMs)} /{' '}
                  {line.japanese}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block space-y-2 text-sm">
          <span className="font-semibold">Opening section label</span>
          <select
            value={sectionLabel}
            onChange={(event) => {
              setSectionLabel(event.target.value)
              setVideoUrl('')
              setStatus('')
            }}
            className="w-full rounded-2xl border border-border bg-surface px-4 py-3 outline-none"
          >
            {MUSIC_SECTION_LABELS.map((section) => (
              <option key={section.label} value={section.label}>
                {section.ja} - {section.zh}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-2 text-sm">
          <span className="font-semibold">Background image URL</span>
          <input
            type="url"
            value={backgroundImageUrl}
            onChange={(event) => {
              setBackgroundImageUrl(event.target.value)
              setVideoUrl('')
              setStatus('')
            }}
            placeholder="Paste an image link, or leave blank for YouTube thumbnail"
            className="w-full rounded-2xl border border-border bg-surface px-4 py-3 outline-none"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="block space-y-2 text-sm">
            <span className="font-semibold">Opening duration</span>
            <input
              type="number"
              min={1}
              max={8}
              step={0.5}
              value={openingDurationMs / 1000}
              onChange={(event) => {
                setOpeningDurationMs(Number(event.target.value) * 1000)
                setVideoUrl('')
                setStatus('')
              }}
              className="w-full rounded-2xl border border-border bg-surface px-4 py-3 outline-none"
            />
          </label>

          <label className="block space-y-2 text-sm">
            <span className="font-semibold">Ending duration</span>
            <input
              type="number"
              min={1}
              max={8}
              step={0.5}
              value={endingDurationMs / 1000}
              onChange={(event) => {
                setEndingDurationMs(Number(event.target.value) * 1000)
                setVideoUrl('')
                setStatus('')
              }}
              className="w-full rounded-2xl border border-border bg-surface px-4 py-3 outline-none"
            />
          </label>

          <label className="block space-y-2 text-sm">
            <span className="font-semibold">Last line duration</span>
            <input
              type="number"
              min={1}
              max={10}
              step={0.5}
              value={fallbackLastDurationMs / 1000}
              onChange={(event) => {
                setFallbackLastDurationMs(Number(event.target.value) * 1000)
                setVideoUrl('')
                setStatus('')
              }}
              className="w-full rounded-2xl border border-border bg-surface px-4 py-3 outline-none"
            />
          </label>
        </div>

        <div className="rounded-[24px] border border-border bg-surface p-4 text-sm">
          <p className="font-semibold">Estimated output</p>
          <p className="mt-2 text-muted">
            {selectedSlides.length} slides / {formatDuration(totalDurationMs)} /{' '}
            1080 x 1920
          </p>
          <p className="mt-2 text-muted">
            Browser output:{' '}
            {supportedMimeType
              ? supportedMimeType.includes('mp4')
                ? 'MP4 supported'
                : 'WebM only in this browser'
              : 'not supported'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleRender}
            disabled={isRendering || !selectedMusic || selectedSlides.length <= 1}
            className="rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isRendering ? 'Generating...' : 'Generate video'}
          </button>
          {videoUrl ? (
            <a
              href={videoUrl}
              download={downloadName}
              className="rounded-full border border-border bg-white px-5 py-3 text-sm font-semibold text-foreground transition hover:border-brand dark:bg-white"
            >
              Download {outputExtension.toUpperCase()}
            </a>
          ) : null}
        </div>

        {isRendering ? (
          <div className="h-2 overflow-hidden rounded-full bg-surface-strong">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        ) : null}

        {status ? <p className="text-sm text-muted">{status}</p> : null}
      </section>

      <section className="glass-panel rounded-[32px] border border-border p-6">
        <div className="mb-4">
          <h2 className="font-heading text-2xl font-bold">Preview</h2>
          <p className="mt-1 text-sm text-muted">9:16 / 1080 x 1920 video</p>
        </div>

        <div className="mx-auto aspect-[9/16] w-full max-w-[320px] overflow-hidden rounded-[24px] border border-border bg-surface-strong">
          <canvas
            ref={canvasRef}
            width={VIDEO_WIDTH}
            height={VIDEO_HEIGHT}
            className="h-full w-full object-cover"
          />
        </div>

        {videoUrl ? (
          <div className="mt-6 space-y-4">
            <div className="mx-auto aspect-[9/16] w-full max-w-[320px] overflow-hidden rounded-[24px] border border-border bg-surface-strong">
              <video
                src={videoUrl}
                controls
                preload="metadata"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                href={videoUrl}
                download={downloadName}
                className="rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white"
              >
                Download {outputExtension.toUpperCase()}
              </a>
              <span className="text-xs text-muted">
                {videoMimeType || 'video'} / {(videoSize / 1024 / 1024).toFixed(1)} MB
              </span>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  )
}
