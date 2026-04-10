import { AuthenticatedGuard } from '@/components/auth/authenticated-guard'
import { MusicTimelineShell } from '@/components/music/music-timeline-shell'
import { SectionHeading } from '@/components/ui/section-heading'
import { getDictionary } from '@/lib/i18n'
import type { Locale } from '@/lib/types'

const pageCopy = {
  zh: {
    title: '校對時間軸',
    description: '播放歌曲，逐句記錄每一行歌詞出現的時間。',
  },
  en: {
    title: 'Calibrate Timeline',
    description: 'Play the song and stamp the timing for each lyric line.',
  },
  ja: {
    title: 'タイムライン調整',
    description: '楽曲を再生しながら、各歌詞行のタイミングを記録します。',
  },
} as const

export default async function MusicTimelinePage({
  params,
  searchParams,
}: PageProps<'/[lang]/music/timeline/[id]'>) {
  const { lang, id } = await params
  const { from } = await searchParams
  const dict = await getDictionary(lang)
  const locale = lang as Locale
  const copy = pageCopy[locale]

  return (
    <div className="space-y-8 pb-10">
      <SectionHeading
        eyebrow={`${dict.sections.songLibrary} / ${dict.labels.lyricsTimeline}`}
        title={copy.title}
        description={copy.description}
      />
      <AuthenticatedGuard hint={copy.description}>
        <MusicTimelineShell
          id={id}
          dict={dict}
          locale={locale}
          flowSource={typeof from === 'string' ? from : undefined}
        />
      </AuthenticatedGuard>
    </div>
  )
}
