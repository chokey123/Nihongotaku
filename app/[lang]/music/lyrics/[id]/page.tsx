import { AuthenticatedGuard } from '@/components/auth/authenticated-guard'
import { MusicLyricsEditorShell } from '@/components/music/music-lyrics-editor-shell'
import { SectionHeading } from '@/components/ui/section-heading'
import { getDictionary } from '@/lib/i18n'
import type { Locale } from '@/lib/types'

const pageCopy = {
  zh: {
    title: '添加歌詞',
    description: '先整理歌詞內容，再進到下一步校對時間軸。',
  },
  en: {
    title: 'Add Lyrics + Timeline',
    description:
      'Prepare the lyrics first, then continue to timeline calibration.',
  },
  ja: {
    title: '歌詞 + タイムライン追加',
    description:
      'まず歌詞を整えてから、次のステップでタイムラインを調整します。',
  },
} as const

export default async function MusicLyricsPage({
  params,
  searchParams,
}: PageProps<'/[lang]/music/lyrics/[id]'>) {
  const { lang, id } = await params
  const { from } = await searchParams
  const dict = await getDictionary(lang)
  const locale = lang as Locale
  const copy = pageCopy[locale]

  return (
    <div className="space-y-8 pb-10">
      <SectionHeading
        eyebrow={`${dict.sections.songLibrary} / ${dict.sections.lyrics}`}
        title={copy.title}
        description={copy.description}
      />
      <AuthenticatedGuard hint={copy.description}>
        <MusicLyricsEditorShell
          id={id}
          dict={dict}
          locale={locale}
          flowSource={typeof from === 'string' ? from : undefined}
        />
      </AuthenticatedGuard>
    </div>
  )
}
