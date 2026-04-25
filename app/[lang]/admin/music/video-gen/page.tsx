import { AdminGuard } from '@/components/admin/admin-guard'
import { AdminMusicVideoGenerator } from '@/components/admin/admin-music-video-generator'
import { SectionHeading } from '@/components/ui/section-heading'
import { getDictionary } from '@/lib/i18n'
import { backendService } from '@/lib/services/backend-service'

export const dynamic = 'force-dynamic'

export default async function AdminMusicVideoGenPage({
  params,
}: PageProps<'/[lang]/admin/music/video-gen'>) {
  const { lang } = await params
  const dict = await getDictionary(lang)
  const music = await backendService.searchMusic('', {
    includeUnpublished: true,
  })

  return (
    <div className="space-y-8 pb-10">
      <SectionHeading
        eyebrow={`${dict.sections.admin} / ${dict.sections.songLibrary}`}
        title="Music video generator"
        description="Generate vertical slideshow videos from song lyric timelines."
      />
      <AdminGuard deniedMessage={dict.labels.accessDenied} hint={dict.labels.adminHint}>
        <AdminMusicVideoGenerator locale={lang} music={music} />
      </AdminGuard>
    </div>
  )
}
