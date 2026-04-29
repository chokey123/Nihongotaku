import type { Locale, LyricLine, MusicItem } from '@/lib/types'

export const MUSIC_VIDEO_WIDTH = 1080
export const MUSIC_VIDEO_HEIGHT = 1920
export const MUSIC_VIDEO_FPS = 30
export const MUSIC_VIDEO_COMPOSITION_ID = 'MusicLyricSlideshow'

export type MusicVideoSlide =
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

export interface MusicVideoRenderProps {
  item: MusicItem
  slides: MusicVideoSlide[]
  locale: Locale
  sectionLabel: string
  backgroundImageUrl: string
  logoUrl: string
  mobileLogoUrl: string
}

export function msToFrames(ms: number) {
  return Math.max(1, Math.round((ms / 1000) * MUSIC_VIDEO_FPS))
}

export function getVideoDurationInFrames(slides: MusicVideoSlide[]) {
  return slides.reduce((total, slide) => total + msToFrames(slide.durationMs), 0)
}
