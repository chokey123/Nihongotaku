'use client'

import { useEffect, useMemo, useState } from 'react'

import type { Locale, MusicItem, MusicVocabItem } from '@/lib/types'

const CANVAS_WIDTH = 1080
const CANVAS_HEIGHT = 1080

function getLocalizedText(
  value: Partial<Record<Locale, string>>,
  locale: Locale,
) {
  return value[locale] || value.zh || value.en || value.ja || ''
}

function getChineseText(value: Partial<Record<Locale, string>>) {
  return value.zh || value.en || value.ja || ''
}

function getLineVocabs(item: MusicItem, lineId: string) {
  return item.vocab.filter((entry) => entry.lineId === lineId).slice(0, 5)
}

function parseHighlightWords(value: string) {
  return value
    .split(/[\n,，、]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Image failed to load'))
    image.src = src
  })
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

function buildHighlightTokens(text: string, highlightWords: string[]) {
  const normalizedWords = [...new Set(highlightWords.map((word) => word.trim()))]
    .filter(Boolean)
    .sort((left, right) => right.length - left.length)
  const tokens: Array<{ text: string; highlight: boolean }> = []
  let index = 0

  while (index < text.length) {
    const matchedWord = normalizedWords.find((word) =>
      text.startsWith(word, index),
    )

    if (matchedWord) {
      tokens.push({ text: matchedWord, highlight: true })
      index += matchedWord.length
      continue
    }

    tokens.push({ text: text[index], highlight: false })
    index += 1
  }

  return tokens
}

function getHighlightTokenGap(
  previousToken: { highlight: boolean } | undefined,
  token: { highlight: boolean },
) {
  return previousToken?.highlight && token.highlight ? 8 : 0
}

function measureHighlightTokenLine(
  ctx: CanvasRenderingContext2D,
  tokens: Array<{ text: string; highlight: boolean }>,
) {
  return tokens.reduce((total, token, index) => {
    const previousToken = index > 0 ? tokens[index - 1] : undefined

    return (
      total +
      getHighlightTokenGap(previousToken, token) +
      ctx.measureText(token.text).width
    )
  }, 0)
}

function getHighlightedTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  highlightWords: string[],
  maxWidth: number,
  maxLines: number,
) {
  const tokens = buildHighlightTokens(text, highlightWords)
  const lines: Array<Array<{ text: string; highlight: boolean }>> = []
  let currentLine: Array<{ text: string; highlight: boolean }> = []

  for (const token of tokens) {
    const nextLine = [...currentLine, token]

    if (
      measureHighlightTokenLine(ctx, nextLine) <= maxWidth ||
      currentLine.length === 0
    ) {
      currentLine = nextLine
      continue
    }

    lines.push(currentLine)
    currentLine = [token]

    if (lines.length >= maxLines) {
      break
    }
  }

  if (currentLine.length > 0 && lines.length < maxLines) {
    lines.push(currentLine)
  }

  return lines
}

function drawHighlightedWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  highlightWords: string[],
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
  colors = {
    text: '#ffffff',
    highlightText: '#fff7ed',
    highlightGlow: 'rgba(255, 237, 213, 0.42)',
    highlightLine: 'rgba(249, 115, 22, 0.54)',
  },
) {
  ctx.save()
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'

  const lines = getHighlightedTextLines(
    ctx,
    text,
    highlightWords,
    maxWidth,
    maxLines,
  )

  lines.forEach((line, lineIndex) => {
    let cursorX = x - measureHighlightTokenLine(ctx, line) / 2
    const lineY = y + lineIndex * lineHeight

    line.forEach((token, index) => {
      const previousToken = index > 0 ? line[index - 1] : undefined
      cursorX += getHighlightTokenGap(previousToken, token)

      const tokenWidth = ctx.measureText(token.text).width

      if (token.highlight) {
        ctx.save()
        ctx.shadowColor = 'rgba(251, 146, 60, 0.36)'
        ctx.shadowBlur = 16
        ctx.fillStyle = colors.highlightGlow
        roundRect(ctx, cursorX - 4, lineY + lineHeight - 24, tokenWidth + 8, 16, 8)
        ctx.fill()
        ctx.shadowBlur = 0
        ctx.fillStyle = colors.highlightLine
        roundRect(ctx, cursorX, lineY + lineHeight - 12, tokenWidth, 4, 2)
        ctx.fill()
        ctx.restore()
      }

      ctx.fillStyle = colors.text
      ctx.fillText(token.text, cursorX, lineY)
      cursorX += tokenWidth
    })
  })

  ctx.restore()
  return y + lines.length * lineHeight
}

function drawVocabCard(
  ctx: CanvasRenderingContext2D,
  vocab: MusicVocabItem,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const scale = Math.max(0.9, Math.min(1.85, height / 86))

  ctx.save()
  ctx.shadowColor = 'rgba(15, 23, 42, 0.22)'
  ctx.shadowBlur = 18
  ctx.shadowOffsetY = 10
  ctx.fillStyle = 'rgba(255, 255, 255, 0.94)'
  roundRect(ctx, x, y, width, height, 18 * scale)
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0
  ctx.strokeStyle = 'rgba(249, 115, 22, 0.24)'
  ctx.lineWidth = 2
  ctx.stroke()

  const leftWidth = Math.min(width * 0.38, 154 * scale)
  const contentX = x + leftWidth + 22 * scale
  const contentWidth = width - leftWidth - 40 * scale
  const centerY = y + height / 2

  ctx.fillStyle = 'rgba(249, 115, 22, 0.13)'
  roundRect(ctx, x + 12 * scale, y + 12 * scale, leftWidth - 24 * scale, height - 24 * scale, 14 * scale)
  ctx.fill()
  ctx.fillStyle = 'rgba(249, 115, 22, 0.78)'
  roundRect(ctx, x + 12 * scale, y + 12 * scale, 8 * scale, height - 24 * scale, 4 * scale)
  ctx.fill()

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  if (vocab.furigana) {
    ctx.fillStyle = '#9a3412'
    ctx.font = `700 ${13.5 * scale}px system-ui, sans-serif`
    ctx.fillText(vocab.furigana, x + leftWidth / 2, centerY - 22 * scale)
  }

  const wordMaxWidth = leftWidth - 58 * scale
  const baseWordFontSize = 27 * scale
  let wordFontSize = baseWordFontSize

  ctx.font = `900 ${wordFontSize}px system-ui, sans-serif`

  while (
    ctx.measureText(vocab.word).width > wordMaxWidth &&
    wordFontSize > 11 * scale
  ) {
    wordFontSize -= 1
    ctx.font = `900 ${wordFontSize}px system-ui, sans-serif`
  }

  ctx.fillStyle = '#111827'
  ctx.fillText(vocab.word, x + leftWidth / 2, centerY + 10 * scale)

  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'

  const meaning = getChineseText(vocab.meaning)
  const exampleTranslation = getChineseText(vocab.exampleTranslation)
  const meaningFontSize = 17.5 * scale
  const exampleFontSize = 15.5 * scale
  const translationFontSize = 14.5 * scale
  const meaningLineHeight = 21 * scale
  const exampleLineHeight = 19 * scale
  const translationLineHeight = 18 * scale
  const blockGap = 7 * scale
  const textBlocks: Array<{
    color: string
    font: string
    lineHeight: number
    lines: string[]
  }> = []

  if (meaning) {
    ctx.font = `800 ${meaningFontSize}px system-ui, sans-serif`
    textBlocks.push({
      color: '#7c2d12',
      font: ctx.font,
      lineHeight: meaningLineHeight,
      lines: wrapText(ctx, meaning, contentWidth).slice(0, 1),
    })
  }

  if (vocab.example) {
    ctx.font = `600 ${exampleFontSize}px system-ui, sans-serif`
    textBlocks.push({
      color: '#374151',
      font: ctx.font,
      lineHeight: exampleLineHeight,
      lines: wrapText(ctx, vocab.example, contentWidth).slice(0, 1),
    })
  }

  if (exampleTranslation) {
    ctx.font = `500 ${translationFontSize}px system-ui, sans-serif`
    textBlocks.push({
      color: '#6b7280',
      font: ctx.font,
      lineHeight: translationLineHeight,
      lines: wrapText(ctx, exampleTranslation, contentWidth).slice(0, 1),
    })
  }

  const visibleBlocks = textBlocks.filter((block) => block.lines.length > 0)
  const textHeight =
    visibleBlocks.reduce(
      (total, block) => total + block.lines.length * block.lineHeight,
      0,
    ) + Math.max(0, visibleBlocks.length - 1) * blockGap
  let textY = y + (height - textHeight) / 2

  visibleBlocks.forEach((block, blockIndex) => {
    ctx.fillStyle = block.color
    ctx.font = block.font

    block.lines.forEach((line, lineIndex) => {
      ctx.fillText(line, contentX, textY + lineIndex * block.lineHeight)
    })

    textY += block.lines.length * block.lineHeight
    if (blockIndex < visibleBlocks.length - 1) {
      textY += blockGap
    }
  })

  ctx.restore()
}

function drawFallbackBackground(
  ctx: CanvasRenderingContext2D,
  item: MusicItem,
) {
  const gradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  gradient.addColorStop(0, item.palette.from)
  gradient.addColorStop(1, item.palette.to)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
}

async function renderImage({
  item,
  lineId,
  locale,
  highlightWords,
  backgroundImageUrl,
}: {
  item: MusicItem
  lineId: string
  locale: Locale
  highlightWords: string[]
  backgroundImageUrl: string
}) {
  const line = item.lyrics.find((entry) => entry.id === lineId)
  if (!line) {
    throw new Error('Select a lyric line first.')
  }

  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_WIDTH
  canvas.height = CANVAS_HEIGHT

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas is not supported.')
  }

  drawFallbackBackground(ctx, item)

  const trimmedBackgroundImageUrl = backgroundImageUrl.trim()
  const backgroundSources = [
    ...(trimmedBackgroundImageUrl
      ? [
          `/api/image-proxy?url=${encodeURIComponent(
            trimmedBackgroundImageUrl,
          )}`,
        ]
      : []),
    ...(item.youtubeId
      ? [
          `/api/youtube-thumbnail?videoId=${encodeURIComponent(
            item.youtubeId,
          )}`,
        ]
      : []),
  ]

  for (const backgroundSource of backgroundSources) {
    try {
      const image = await loadImage(backgroundSource)

      ctx.save()
      ctx.filter = 'blur(16px) brightness(0.92) saturate(1.14)'
      drawCoverImage(ctx, image, -50, -50, CANVAS_WIDTH + 100, CANVAS_HEIGHT + 100)
      ctx.restore()
      break
    } catch {
      continue
    }
  }

  const overlay = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT)
  overlay.addColorStop(0, 'rgba(255, 255, 255, 0.14)')
  overlay.addColorStop(0.48, 'rgba(255, 255, 255, 0.26)')
  overlay.addColorStop(1, 'rgba(255, 247, 237, 0.58)')
  ctx.fillStyle = overlay
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  ctx.save()
  const shade = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT)
  shade.addColorStop(0, 'rgba(0, 0, 0, 0.16)')
  shade.addColorStop(0.54, 'rgba(0, 0, 0, 0.06)')
  shade.addColorStop(1, 'rgba(0, 0, 0, 0.24)')
  ctx.fillStyle = shade
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  ctx.restore()

  ctx.save()
  ctx.shadowColor = 'rgba(15, 23, 42, 0.26)'
  ctx.shadowBlur = 28
  ctx.shadowOffsetY = 16
  ctx.fillStyle = 'rgba(255, 255, 255, 0.58)'
  roundRect(ctx, 72, 72, CANVAS_WIDTH - 144, CANVAS_HEIGHT - 144, 48)
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.36)'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.fillStyle = 'rgba(249, 115, 22, 0.80)'
  roundRect(ctx, 72, 72, 16, CANVAS_HEIGHT - 144, 8)
  ctx.fill()
  ctx.fillStyle = 'rgba(249, 115, 22, 0.14)'
  roundRect(ctx, 116, 196, CANVAS_WIDTH - 232, 250, 38)
  ctx.fill()
  ctx.restore()

  try {
    const logo = await loadImage('/api/brand-logo?variant=text')

    ctx.save()
    ctx.shadowColor = 'rgba(255, 255, 255, 0.72)'
    ctx.shadowBlur = 18
    drawContainImage(ctx, logo, 270, 88, 540, 86)
    ctx.restore()
  } catch {
    // The image should still render if the brand asset is not configured.
  }

  const vocabs = getLineVocabs(item, line.id)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillStyle = '#9a3412'
  ctx.font = '700 24px system-ui, sans-serif'
  ctx.fillText(`${item.artist} / ${item.title}`, CANVAS_WIDTH / 2, 224)

  const lyricMaxWidth = 780
  const lyricMaxLines = 2
  const translation = getLocalizedText(line.translation, locale)
  const translationMaxLines = 2
  const lyricBoxTop = 278
  const lyricBoxBottom = 430
  const lyricBoxHeight = lyricBoxBottom - lyricBoxTop
  let lyricFontSize = 50
  let lyricLineHeight = Math.round(lyricFontSize * 1.28)
  let lyricLines: Array<Array<{ text: string; highlight: boolean }>> = []
  let translationFontSize = translation ? 26 : 0
  let translationLineHeight = Math.round(translationFontSize * 1.32)
  let translationLines: string[] = []
  let lyricTextHeight = 0
  let translationTextHeight = 0
  let lyricGap = 0
  let lyricBlockHeight = 0

  while (true) {
    lyricLineHeight = Math.round(lyricFontSize * 1.28)
    ctx.font = `900 ${lyricFontSize}px system-ui, sans-serif`
    lyricLines = getHighlightedTextLines(
      ctx,
      line.japanese,
      highlightWords,
      lyricMaxWidth,
      lyricMaxLines,
    )
    lyricTextHeight = lyricLines.length * lyricLineHeight

    if (translation) {
      translationLineHeight = Math.round(translationFontSize * 1.32)
      ctx.font = `700 ${translationFontSize}px system-ui, sans-serif`
      translationLines = wrapText(ctx, translation, 760).slice(
        0,
        translationMaxLines,
      )
      translationTextHeight = translationLines.length * translationLineHeight
      lyricGap = translationLines.length > 0 ? Math.round(12 * (lyricFontSize / 50)) : 0
    } else {
      translationLines = []
      translationTextHeight = 0
      lyricGap = 0
    }

    lyricBlockHeight = lyricTextHeight + lyricGap + translationTextHeight

    if (
      lyricBlockHeight <= lyricBoxHeight ||
      (lyricFontSize <= 34 && translationFontSize <= 18)
    ) {
      break
    }

    if (lyricFontSize > 34) {
      lyricFontSize -= 1
      continue
    }

    if (translationFontSize > 18) {
      translationFontSize -= 1
      continue
    }

    break
  }

  const lyricStartY =
    lyricBoxTop + Math.max(0, lyricBoxHeight - lyricBlockHeight) / 2

  ctx.fillStyle = '#111827'
  ctx.font = `900 ${lyricFontSize}px system-ui, sans-serif`
  const nextY = drawHighlightedWrappedText(
    ctx,
    line.japanese,
    highlightWords,
    CANVAS_WIDTH / 2,
    lyricStartY,
    lyricMaxWidth,
    lyricLineHeight,
    lyricMaxLines,
    {
      text: '#111827',
      highlightText: '#7c2d12',
      highlightGlow: 'rgba(255, 237, 213, 0.82)',
      highlightLine: 'rgba(249, 115, 22, 0.68)',
    },
  )

  let lyricBlockBottom = nextY
  if (translationLines.length > 0) {
    ctx.fillStyle = '#4b5563'
    ctx.font = `700 ${translationFontSize}px system-ui, sans-serif`
    translationLines.forEach((translationLine, index) => {
      ctx.fillText(
        translationLine,
        CANVAS_WIDTH / 2,
        nextY + lyricGap + index * translationLineHeight,
      )
    })
    lyricBlockBottom =
      nextY + lyricGap + translationLines.length * translationLineHeight
  }
  ctx.shadowBlur = 0

  if (vocabs.length === 0) {
    ctx.fillStyle = '#374151'
    ctx.font = '500 32px system-ui, sans-serif'
    ctx.fillText('No vocab cards for this lyric line.', CANVAS_WIDTH / 2, 650)
  } else {
    const cardCount = vocabs.length
    const columns = cardCount <= 3 ? 1 : 2
    const cardWidth =
      cardCount === 1
        ? 820
        : cardCount === 2
          ? 800
          : cardCount === 3
            ? 760
          : 430
    const cardHeight =
      cardCount === 1
        ? 224
        : cardCount === 2
          ? 166
          : cardCount === 3
            ? 136
            : cardCount === 4
              ? 126
              : 112
    const rows = Math.ceil(cardCount / columns)
    const columnGap = 18
    const rowGap = cardCount <= 2 ? 22 : 16
    const totalRowWidth = columns * cardWidth + (columns - 1) * columnGap
    const startX = (CANVAS_WIDTH - totalRowWidth) / 2
    const totalHeight = rows * cardHeight + (rows - 1) * rowGap
    const topBound = Math.min(Math.max(lyricBlockBottom + 76, 520), 650)
    const bottomBound = cardCount <= 3 ? 942 : 976
    const availableHeight = bottomBound - topBound
    const centerLift = cardCount === 1 ? 34 : cardCount === 2 ? 24 : cardCount === 3 ? 12 : 0
    const startY =
      topBound + Math.max(0, availableHeight - totalHeight) / 2 - centerLift

    vocabs.forEach((vocab, index) => {
      const row = Math.floor(index / columns)
      const col = index % columns
      const isLastOdd =
        columns === 2 && index === vocabs.length - 1 && vocabs.length % 2 === 1
      const x = isLastOdd
        ? (CANVAS_WIDTH - cardWidth) / 2
        : startX + col * (cardWidth + columnGap)
      const y = startY + row * (cardHeight + rowGap)

      drawVocabCard(ctx, vocab, x, y, cardWidth, cardHeight)
    })
  }

  return canvas.toDataURL('image/png')
}

export function AdminMusicImageGenerator({
  locale,
  music,
}: {
  locale: string
  music: MusicItem[]
}) {
  const normalizedLocale: Locale =
    locale === 'en' || locale === 'ja' || locale === 'zh' ? locale : 'zh'
  const [selectedMusicId, setSelectedMusicId] = useState(music[0]?.id ?? '')
  const selectedMusic = useMemo(
    () => music.find((item) => item.id === selectedMusicId) ?? music[0],
    [music, selectedMusicId],
  )
  const [selectedLineId, setSelectedLineId] = useState(
    selectedMusic?.lyrics[0]?.id ?? '',
  )
  const [highlightText, setHighlightText] = useState('')
  const [backgroundImageUrl, setBackgroundImageUrl] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [status, setStatus] = useState('')
  const [isRendering, setIsRendering] = useState(false)

  const selectedLine = selectedMusic?.lyrics.find(
    (line) => line.id === selectedLineId,
  )
  const lineVocabs = useMemo(
    () =>
      selectedMusic && selectedLine
        ? getLineVocabs(selectedMusic, selectedLine.id)
        : [],
    [selectedMusic, selectedLine],
  )
  const defaultHighlightText = useMemo(
    () => lineVocabs.map((vocab) => vocab.word).join('\n'),
    [lineVocabs],
  )

  useEffect(() => {
    setHighlightText(defaultHighlightText)
  }, [defaultHighlightText])

  const handleMusicChange = (musicId: string) => {
    const nextMusic = music.find((item) => item.id === musicId)
    setSelectedMusicId(musicId)
    setSelectedLineId(nextMusic?.lyrics[0]?.id ?? '')
    setBackgroundImageUrl('')
    setPreviewUrl('')
    setStatus('')
  }

  const handleRender = async () => {
    if (!selectedMusic || !selectedLineId) {
      setStatus('Select a song and lyric line first.')
      return
    }

    setIsRendering(true)
    setStatus('Rendering image...')

    try {
      const nextPreviewUrl = await renderImage({
        item: selectedMusic,
        lineId: selectedLineId,
        locale: normalizedLocale,
        highlightWords: parseHighlightWords(highlightText),
        backgroundImageUrl,
      })
      setPreviewUrl(nextPreviewUrl)
      setStatus('Image ready.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Render failed.')
    } finally {
      setIsRendering(false)
    }
  }

  const downloadName = selectedMusic
    ? `${selectedMusic.artist}-${selectedMusic.title}-lyric-card.png`
        .replace(/[^\w.-]+/g, '-')
        .toLowerCase()
    : 'lyric-card.png'
  const defaultBackgroundUrl = selectedMusic?.youtubeId
    ? `/api/youtube-thumbnail?videoId=${encodeURIComponent(
        selectedMusic.youtubeId,
      )}`
    : ''

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <section className="glass-panel space-y-5 rounded-[32px] border border-border p-6">
        <div>
          <h2 className="font-heading text-2xl font-bold">Image source</h2>
          <p className="mt-2 text-sm text-muted">
            Pick a song and one lyric line. The template uses the song title,
            lyric, translation, and vocab cards from the database.
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

        <label className="block space-y-2 text-sm">
          <span className="font-semibold">Lyric line</span>
          <select
            value={selectedLineId}
            onChange={(event) => {
              setSelectedLineId(event.target.value)
              setPreviewUrl('')
              setStatus('')
            }}
            className="w-full rounded-2xl border border-border bg-surface px-4 py-3 outline-none"
          >
            {(selectedMusic?.lyrics ?? []).map((line) => (
              <option key={line.id} value={line.id}>
                {line.timeLabel ? `${line.timeLabel} / ` : ''}
                {line.japanese}
              </option>
            ))}
          </select>
        </label>

        {selectedMusic && selectedLine ? (
          <div className="rounded-[24px] border border-border bg-surface p-4">
            <p className="text-xs font-semibold uppercase text-muted">
              Template data
            </p>
            <h3 className="mt-3 font-heading text-xl font-bold">
              {selectedMusic.title}
            </h3>
            <p className="mt-1 text-sm text-muted">{selectedMusic.artist}</p>
            <p className="mt-4 text-lg font-semibold">{selectedLine.japanese}</p>
            <p className="mt-2 text-sm text-muted">
              {getLocalizedText(selectedLine.translation, normalizedLocale)}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {lineVocabs.length > 0 ? (
                lineVocabs.map((vocab) => (
                  <span
                    key={vocab.id}
                    className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-strong"
                  >
                    {vocab.word}
                  </span>
                ))
              ) : (
                <span className="text-sm text-muted">No vocab on this line.</span>
              )}
            </div>
          </div>
        ) : null}

        <label className="block space-y-2 text-sm">
          <span className="font-semibold">Background image URL</span>
          <input
            type="url"
            value={backgroundImageUrl}
            onChange={(event) => {
              setBackgroundImageUrl(event.target.value)
              setPreviewUrl('')
              setStatus('')
            }}
            placeholder="Paste an image link, or leave blank for YouTube thumbnail"
            className="w-full rounded-2xl border border-border bg-surface px-4 py-3 outline-none"
          />
          <span className="block text-xs text-muted">
            Blank uses this song&apos;s YouTube thumbnail as the default
            background.
            {defaultBackgroundUrl ? (
              <>
                {' '}
                <a
                  href={defaultBackgroundUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-brand-strong underline-offset-4 hover:underline"
                >
                  Open default thumbnail
                </a>
              </>
            ) : null}
          </span>
        </label>

        <label className="block space-y-2 text-sm">
          <span className="font-semibold">Highlight words</span>
          <textarea
            value={highlightText}
            onChange={(event) => {
              setHighlightText(event.target.value)
              setPreviewUrl('')
              setStatus('')
            }}
            rows={4}
            placeholder="One word per line, or separate with commas"
            className="w-full resize-y rounded-2xl border border-border bg-surface px-4 py-3 outline-none"
          />
          <span className="text-xs text-muted">
            Defaults to the vocab card words. You can add, remove, or adjust the
            substrings to highlight in the lyric.
          </span>
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleRender}
            disabled={isRendering || !selectedMusic || !selectedLineId}
            className="rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isRendering ? 'Generating...' : 'Generate 1080 x 1080'}
          </button>
          {previewUrl ? (
            <a
              href={previewUrl}
              download={downloadName}
              className="rounded-full border border-border bg-white px-5 py-3 text-sm font-semibold text-foreground transition hover:border-brand dark:bg-white"
            >
              Download PNG
            </a>
          ) : null}
        </div>

        {status ? <p className="text-sm text-muted">{status}</p> : null}
      </section>

      <section className="glass-panel rounded-[32px] border border-border p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-2xl font-bold">Preview</h2>
            <p className="mt-1 text-sm text-muted">4:4 / 1080 x 1080 PNG</p>
          </div>
        </div>
        <div className="mx-auto aspect-square w-full max-w-[432px] overflow-hidden rounded-[24px] border border-border bg-surface-strong">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Generated lyric card preview"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-8 text-center text-sm text-muted">
              Generate an image to preview the final lyric card.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
