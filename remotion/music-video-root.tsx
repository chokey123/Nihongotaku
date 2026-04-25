import React from 'react'
import { Composition, registerRoot } from 'remotion'

import {
  getVideoDurationInFrames,
  MUSIC_VIDEO_COMPOSITION_ID,
  MUSIC_VIDEO_FPS,
  MUSIC_VIDEO_HEIGHT,
  MUSIC_VIDEO_WIDTH,
  type MusicVideoRenderProps,
} from '../lib/music-video-render-types'
import { MusicVideoSequences } from './music-video-composition'

const defaultProps: MusicVideoRenderProps = {
  item: {
    id: 'preview',
    title: 'Song title',
    artist: 'Artist',
    genre: '',
    favorite: false,
    thumbnailLabel: '',
    palette: {
      from: '#fff7ed',
      to: '#fed7aa',
      accent: '#f97316',
    },
    youtubeId: '',
    lyrics: [],
    vocab: [],
    quizVocabKeys: [],
  },
  slides: [{ type: 'opening', durationMs: 2500 }],
  locale: 'zh',
  sectionLabel: 'サビ / 副歌',
  backgroundImageUrl: '',
  logoUrl: '',
}

function MusicVideoCompositionWrapper(props: Record<string, unknown>) {
  return <MusicVideoSequences {...(props as unknown as MusicVideoRenderProps)} />
}

function RemotionRoot() {
  return (
    <Composition
      id={MUSIC_VIDEO_COMPOSITION_ID}
      component={MusicVideoCompositionWrapper}
      width={MUSIC_VIDEO_WIDTH}
      height={MUSIC_VIDEO_HEIGHT}
      fps={MUSIC_VIDEO_FPS}
      durationInFrames={getVideoDurationInFrames(defaultProps.slides)}
      defaultProps={defaultProps as unknown as Record<string, unknown>}
      calculateMetadata={({ props }) => ({
        durationInFrames: getVideoDurationInFrames(
          (props as unknown as MusicVideoRenderProps).slides,
        ),
      })}
    />
  )
}

registerRoot(RemotionRoot)
