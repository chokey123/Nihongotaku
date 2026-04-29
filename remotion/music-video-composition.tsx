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
  return item.vocab.filter((entry) => entry.lineId === lineId)
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

function MainCard({ height = 1588, top = 96 }: { height?: number; top?: number }) {
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

function EndingSlide({
  item,
  backgroundImageUrl,
  logoUrl,
  mobileLogoUrl,
}: {
  item: MusicItem
  backgroundImageUrl: string
  logoUrl: string
  mobileLogoUrl: string
}) {
  return (
    <AbsoluteFill style={{ fontFamily }}>
      <VideoBackground item={item} backgroundImageUrl={backgroundImageUrl} />
      <MainCard top={96} height={1588} />
      {logoUrl ? (
        <Img
          src={logoUrl}
          style={{
            position: 'absolute',
            left: 140,
            top: 112,
            width: 800,
            height: 300,
            objectFit: 'contain',
            filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.78))',
          }}
        />
      ) : (
        <div
          style={{
            position: 'absolute',
            left: 486,
            top: 176,
            width: 108,
            height: 108,
            borderRadius: 999,
            border: '4px solid #40523f',
            color: '#40523f',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 42,
            fontWeight: 900,
          }}
        >
          日文
        </div>
      )}
      <div
        style={{
          position: 'absolute',
          top: 650,
          width: '100%',
          textAlign: 'center',
          color: '#3a1f0d',
          fontSize: 82,
          fontWeight: 900,
          lineHeight: 1,
          textShadow: '0 0 8px rgba(80,42,16,0.14)',
        }}
      >
        もっと学びたい？
      </div>
      <div
        style={{
          position: 'absolute',
          top: 792,
          width: '100%',
          textAlign: 'center',
          color: '#3a1f0d',
          fontSize: 106,
          fontWeight: 900,
          lineHeight: 1,
          textShadow: '0 0 8px rgba(80,42,16,0.14)',
        }}
      >
        フォローしてね！
      </div>
      <div
        style={{
          position: 'absolute',
          top: 980,
          width: '100%',
          textAlign: 'center',
          color: '#3a1f0d',
          fontSize: 62,
          fontWeight: 900,
          lineHeight: 1,
        }}
      >
        關注我觀看更多內容！
      </div>
      {mobileLogoUrl ? (
        <Img
          src={mobileLogoUrl}
          style={{
            position: 'absolute',
            left: 330,
            top: 1138,
            width: 420,
            height: 300,
            objectFit: 'contain',
            filter: 'drop-shadow(0 10px 24px rgba(15,23,42,0.18))',
          }}
        />
      ) : null}
    </AbsoluteFill>
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

function VocabChip({
  vocab,
  height,
}: {
  vocab: MusicVocabItem
  height: number
}) {
  return (
    <div
      style={{
        minHeight: height,
        borderRadius: 30,
        background: 'rgba(255,247,237,0.86)',
        border: '2px solid rgba(249,115,22,0.28)',
        display: 'flex',
        alignItems: 'center',
        padding: '14px 34px',
        gap: 34,
      }}
    >
      <div
        style={{
          width: 220,
          color: '#7c2d12',
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: 40, fontWeight: 900, lineHeight: 1.05 }}>
          {vocab.word}
        </div>
        {vocab.furigana ? (
          <div
            style={{
              marginTop: 8,
              color: '#9a3412',
              fontSize: 24,
              fontWeight: 700,
              lineHeight: 1.05,
            }}
          >
            {vocab.furigana}
          </div>
        ) : null}
      </div>
      <div
        style={{
          color: '#4b5563',
          fontSize: 30,
          fontWeight: 800,
          lineHeight: 1.22,
          flex: 1,
        }}
      >
        {getLocalizedText(vocab.meaning, 'zh')}
      </div>
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
  const lyricFontSize = fitText(slide.line.japanese, 16, 68, 40)
  const lyricLines = splitBalancedText(slide.line.japanese, 4, 13)
  const translationLines = splitBalancedText(translation, 3, 16)
  const lyricTop = 690
  const lyricLineHeight = Math.round(lyricFontSize * 1.18)
  const translationTop = lyricTop + lyricLines.length * lyricLineHeight + 30
  const translationLineHeight = 66
  const translationBottom =
    translationTop +
    (translationLines.length > 0 ? translationLines.length * translationLineHeight : 0)
  const vocabTop = Math.max(translationBottom + 62, 1050)
  const vocabBottom = 1632
  const vocabGap = vocabs.length > 3 ? 14 : 22
  const vocabCardHeight =
    vocabs.length > 0
      ? Math.max(
          86,
          Math.min(
            132,
            (vocabBottom - vocabTop - vocabGap * (vocabs.length - 1)) /
              vocabs.length,
          ),
        )
      : 0
  const vocabTotalHeight =
    vocabs.length * vocabCardHeight + Math.max(0, vocabs.length - 1) * vocabGap
  const vocabStartTop =
    vocabs.length <= 2
      ? vocabTop + Math.max(0, (vocabBottom - vocabTop - vocabTotalHeight) / 2)
      : vocabTop

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <VideoBackground item={item} backgroundImageUrl={backgroundImageUrl} />
      <MainCard top={96} height={1588} />
      {logoUrl ? (
        <Img
          src={logoUrl}
          style={{
            position: 'absolute',
            left: 150,
            top: 108,
            width: 780,
            height: 308,
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
          color: '#9a3412',
          fontSize: 44,
          fontWeight: 800,
        }}
      >
        {slide.line.timeLabel || `Line ${slide.lineNumber}`}
      </div>
      <div
        style={{
          position: 'absolute',
          top: 484,
          width: '100%',
          textAlign: 'center',
          color: '#7c2d12',
          fontSize: fitText(item.artist, 20, 54, 34),
          fontWeight: 900,
        }}
      >
        {item.artist}
      </div>
      <div
        style={{
          position: 'absolute',
          top: 548,
          width: '100%',
          textAlign: 'center',
          color: '#7c2d12',
          fontSize: fitText(item.title, 22, 56, 34),
          fontWeight: 900,
        }}
      >
        {item.title}
      </div>
      <div
        style={{
          position: 'absolute',
          top: lyricTop,
          left: 130,
          width: 820,
          textAlign: 'center',
          color: '#111827',
          fontSize: lyricFontSize,
          fontWeight: 900,
          lineHeight: 1.18,
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
            top: translationTop,
            left: 150,
            width: 780,
            textAlign: 'center',
            color: '#4b5563',
            fontSize: 50,
            fontWeight: 800,
            lineHeight: `${translationLineHeight}px`,
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
            left: 170,
            top: vocabStartTop,
            width: 740,
            display: 'flex',
            flexDirection: 'column',
            gap: vocabGap,
          }}
        >
          {vocabs.map((vocab) => (
            <VocabChip key={vocab.id} vocab={vocab} height={vocabCardHeight} />
          ))}
        </div>
      ) : null}
      <Footer />
    </AbsoluteFill>
  )
}

function splitBalancedText(text: string, maxLines: number, targetChars: number) {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (!normalized) {
    return []
  }

  const chars = [...normalized]
  const lineCount = Math.min(maxLines, Math.ceil(chars.length / targetChars))
  const charsPerLine = Math.ceil(chars.length / lineCount)
  const lines: string[] = []

  for (let index = 0; index < chars.length; index += charsPerLine) {
    lines.push(chars.slice(index, index + charsPerLine).join(''))
  }

  return lines.slice(0, maxLines)
}

export function MusicVideoComposition({
  item,
  slides,
  locale,
  sectionLabel,
  backgroundImageUrl,
  logoUrl,
  mobileLogoUrl,
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

  if (currentSlide.type === 'ending') {
    return (
      <EndingSlide
        item={item}
        backgroundImageUrl={backgroundImageUrl}
        logoUrl={logoUrl}
        mobileLogoUrl={mobileLogoUrl}
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
  mobileLogoUrl,
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
            ) : slide.type === 'ending' ? (
              <EndingSlide
                item={item}
                backgroundImageUrl={backgroundImageUrl}
                logoUrl={logoUrl}
                mobileLogoUrl={mobileLogoUrl}
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
