import React from 'react'
import { AbsoluteFill, Img, Sequence, useCurrentFrame } from 'remotion'

import {
  getVideoDurationInFrames,
  msToFrames,
  MUSIC_VIDEO_HEIGHT,
  MUSIC_VIDEO_WIDTH,
  type MusicVideoRenderProps,
  type MusicVideoSlide,
} from '../lib/music-video-render-types'
import type { Locale, MusicItem, MusicVocabItem } from '../lib/types'

const fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

function getLocalizedText(
  value: Partial<Record<Locale, string>>,
  locale: Locale,
) {
  return value[locale] || value.zh || value.en || value.ja || ''
}

function getLineVocabs(item: MusicItem, lineId: string) {
  return item.vocab.filter((entry) => entry.lineId === lineId).slice(0, 3)
}

function VideoBackground({
  item,
  backgroundImageUrl,
}: {
  item: MusicItem
  backgroundImageUrl: string
}) {
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${item.palette.from}, ${item.palette.to})`,
        overflow: 'hidden',
      }}
    >
      {backgroundImageUrl ? (
        <Img
          src={backgroundImageUrl}
          style={{
            position: 'absolute',
            inset: -36,
            width: MUSIC_VIDEO_WIDTH + 72,
            height: MUSIC_VIDEO_HEIGHT + 72,
            objectFit: 'cover',
            filter: 'blur(10px) brightness(0.96) saturate(1.12)',
          }}
        />
      ) : null}
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.24), rgba(255,255,255,0.30) 55%, rgba(255,247,237,0.56))',
        }}
      />
    </AbsoluteFill>
  )
}

function MainCard({ height = 1400, top = 96 }: { height?: number; top?: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: 70,
        top,
        width: MUSIC_VIDEO_WIDTH - 140,
        height,
        borderRadius: 52,
        background: 'rgba(255,255,255,0.70)',
        border: '2px solid rgba(255,255,255,0.46)',
        boxShadow: '0 18px 34px rgba(15,23,42,0.24)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 20,
          height,
          borderRadius: 10,
          background: 'rgba(249,115,22,0.86)',
        }}
      />
    </div>
  )
}

function Footer() {
  return (
    <div
      style={{
        position: 'absolute',
        left: 150,
        top: 1708,
        width: 830,
        color: '#7c2d12',
        fontFamily,
        filter: 'drop-shadow(0 0 14px rgba(255,255,255,0.84))',
      }}
    >
      <svg
        width="86"
        height="70"
        viewBox="0 0 86 70"
        style={{ position: 'absolute', left: 0, top: 18 }}
      >
        <path
          d="M6 35H68M44 11L72 35L44 59"
          fill="none"
          stroke="#7c2d12"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div style={{ marginLeft: 120 }}>
        <div style={{ fontSize: 46, lineHeight: 1.18, fontWeight: 900 }}>
          滑動查看歌詞與文法解析
        </div>
        <div
          style={{
            marginTop: 12,
            color: 'rgba(4,1,0,0.78)',
            fontSize: 34,
            lineHeight: 1.18,
            fontWeight: 700,
          }}
        >
          右にスワイプして歌詞と文法解説をチェック！
        </div>
      </div>
    </div>
  )
}

function fitText(text: string, maxChars: number, large: number, small: number) {
  if (text.length <= maxChars) {
    return large
  }

  return Math.max(small, large - (text.length - maxChars) * 2)
}

function OpeningSlide({
  item,
  sectionLabel,
  backgroundImageUrl,
  logoUrl,
}: {
  item: MusicItem
  sectionLabel: string
  backgroundImageUrl: string
  logoUrl: string
}) {
  return (
    <AbsoluteFill style={{ fontFamily }}>
      <VideoBackground item={item} backgroundImageUrl={backgroundImageUrl} />
      <MainCard />
      {logoUrl ? (
        <Img
          src={logoUrl}
          style={{
            position: 'absolute',
            left: 190,
            top: 168,
            width: 700,
            height: 118,
            objectFit: 'contain',
            filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.78))',
          }}
        />
      ) : null}
      <div
        style={{
          position: 'absolute',
          top: 430,
          width: '100%',
          textAlign: 'center',
          color: '#111827',
          fontSize: 72,
          fontWeight: 900,
          lineHeight: 1,
          textShadow: '0 0 16px rgba(255,255,255,0.82)',
        }}
      >
        歌詞から日本語を学ぶ
      </div>
      <div
        style={{
          position: 'absolute',
          top: 540,
          width: '100%',
          textAlign: 'center',
          color: '#7c2d12',
          fontSize: 92,
          fontWeight: 900,
          lineHeight: 1,
          textShadow: '0 0 16px rgba(255,255,255,0.82)',
        }}
      >
        從歌詞學日語
      </div>
      <div
        style={{
          position: 'absolute',
          left: 190,
          top: 710,
          width: 700,
          height: 5,
          background:
            'linear-gradient(90deg, rgba(249,115,22,0), rgba(249,115,22,0.64) 18%, rgba(124,45,18,0.72) 50%, rgba(249,115,22,0.64) 82%, rgba(249,115,22,0))',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 830,
          width: '100%',
          textAlign: 'center',
          color: '#7c2d12',
          fontSize: fitText(item.artist, 18, 62, 36),
          fontWeight: 900,
          lineHeight: 1,
        }}
      >
        {item.artist}
      </div>
      <div
        style={{
          position: 'absolute',
          top: 930,
          width: '100%',
          textAlign: 'center',
          color: '#111827',
          fontSize: fitText(item.title, 14, 88, 48),
          fontWeight: 900,
          lineHeight: 1,
        }}
      >
        {item.title}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 210,
          top: 1110,
          width: 660,
          height: 96,
          borderRadius: 48,
          background: 'rgba(255,247,237,0.88)',
          border: '2px solid rgba(249,115,22,0.34)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#7c2d12',
          fontSize: 46,
          fontWeight: 800,
        }}
      >
        {sectionLabel}
      </div>
      <Footer />
    </AbsoluteFill>
  )
}

function VocabChip({ vocab }: { vocab: MusicVocabItem }) {
  return (
    <div
      style={{
        height: 68,
        borderRadius: 34,
        background: 'rgba(255,247,237,0.86)',
        border: '2px solid rgba(249,115,22,0.28)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 34px',
        gap: 42,
      }}
    >
      <span
        style={{
          minWidth: 175,
          color: '#7c2d12',
          fontSize: 32,
          fontWeight: 900,
        }}
      >
        {vocab.word}
      </span>
      <span
        style={{
          color: '#4b5563',
          fontSize: 26,
          fontWeight: 700,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {getLocalizedText(vocab.meaning, 'zh')}
      </span>
    </div>
  )
}

function LyricSlide({
  item,
  slide,
  locale,
  backgroundImageUrl,
  logoUrl,
}: {
  item: MusicItem
  slide: Extract<MusicVideoSlide, { type: 'lyric' }>
  locale: Locale
  backgroundImageUrl: string
  logoUrl: string
}) {
  const vocabs = getLineVocabs(item, slide.line.id)
  const translation = getLocalizedText(slide.line.translation, locale)
  const lyricFontSize = fitText(slide.line.japanese, 14, 78, 48)
  const lyricLines = splitText(slide.line.japanese, 12).slice(0, 4)
  const translationLines = splitText(translation, 18).slice(0, 3)

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <VideoBackground item={item} backgroundImageUrl={backgroundImageUrl} />
      <MainCard top={110} height={1390} />
      {logoUrl ? (
        <Img
          src={logoUrl}
          style={{
            position: 'absolute',
            left: 300,
            top: 168,
            width: 480,
            height: 78,
            objectFit: 'contain',
          }}
        />
      ) : null}
      <div
        style={{
          position: 'absolute',
          top: 310,
          width: '100%',
          textAlign: 'center',
          color: '#9a3412',
          fontSize: 34,
          fontWeight: 800,
        }}
      >
        {slide.line.timeLabel || `Line ${slide.lineNumber}`} / {item.artist}
      </div>
      <div
        style={{
          position: 'absolute',
          top: 500,
          left: 130,
          width: 820,
          textAlign: 'center',
          color: '#111827',
          fontSize: lyricFontSize,
          fontWeight: 900,
          lineHeight: 1.24,
        }}
      >
        {lyricLines.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>
      {translation ? (
        <div
          style={{
            position: 'absolute',
            top: 940,
            left: 150,
            width: 780,
            textAlign: 'center',
            color: '#4b5563',
            fontSize: 42,
            fontWeight: 800,
            lineHeight: 1.34,
          }}
        >
          {translationLines.map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
      ) : null}
      {vocabs.length > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: 190,
            top: 1162,
            width: 700,
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
          }}
        >
          {vocabs.map((vocab) => (
            <VocabChip key={vocab.id} vocab={vocab} />
          ))}
        </div>
      ) : null}
      <Footer />
    </AbsoluteFill>
  )
}

function splitText(text: string, maxChars: number) {
  if (!text) {
    return []
  }

  const chars = [...text]
  const lines: string[] = []
  for (let index = 0; index < chars.length; index += maxChars) {
    lines.push(chars.slice(index, index + maxChars).join(''))
  }
  return lines
}

export function MusicVideoComposition({
  item,
  slides,
  locale,
  sectionLabel,
  backgroundImageUrl,
  logoUrl,
}: MusicVideoRenderProps) {
  const frame = useCurrentFrame()
  let cursor = 0
  let currentSlide = slides[0]

  for (const slide of slides) {
    const duration = msToFrames(slide.durationMs)
    if (frame >= cursor && frame < cursor + duration) {
      currentSlide = slide
      break
    }
    cursor += duration
  }

  if (!currentSlide || currentSlide.type === 'opening') {
    return (
      <OpeningSlide
        item={item}
        sectionLabel={sectionLabel}
        backgroundImageUrl={backgroundImageUrl}
        logoUrl={logoUrl}
      />
    )
  }

  return (
    <LyricSlide
      item={item}
      slide={currentSlide}
      locale={locale}
      backgroundImageUrl={backgroundImageUrl}
      logoUrl={logoUrl}
    />
  )
}

export function getMusicVideoDuration(slides: MusicVideoSlide[]) {
  return getVideoDurationInFrames(slides)
}

export function MusicVideoSequences({
  item,
  slides,
  locale,
  sectionLabel,
  backgroundImageUrl,
  logoUrl,
}: MusicVideoRenderProps) {
  const timedSlides = slides.reduce<
    Array<{ slide: MusicVideoSlide; from: number; duration: number }>
  >((entries, slide) => {
    const duration = msToFrames(slide.durationMs)
    const from =
      entries.length === 0
        ? 0
        : entries[entries.length - 1].from + entries[entries.length - 1].duration

    return [...entries, { slide, from, duration }]
  }, [])

  return (
    <AbsoluteFill>
      {timedSlides.map(({ slide, from, duration }, index) => {
        return (
          <Sequence
            key={`${slide.type}-${index}`}
            from={from}
            durationInFrames={duration}
          >
            {slide.type === 'opening' ? (
              <OpeningSlide
                item={item}
                sectionLabel={sectionLabel}
                backgroundImageUrl={backgroundImageUrl}
                logoUrl={logoUrl}
              />
            ) : (
              <LyricSlide
                item={item}
                slide={slide}
                locale={locale}
                backgroundImageUrl={backgroundImageUrl}
                logoUrl={logoUrl}
              />
            )}
          </Sequence>
        )
      })}
    </AbsoluteFill>
  )
}
