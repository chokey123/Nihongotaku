import { AdminMusicImageGenerator } from '@/components/admin/admin-music-image-generator'
import { AdminGuard } from '@/components/admin/admin-guard'
import { SectionHeading } from '@/components/ui/section-heading'
import { getDictionary } from '@/lib/i18n'
import { backendService } from '@/lib/services/backend-service'

export const dynamic = 'force-dynamic'

export default async function AdminMusicImageGenPage({
  params,
}: PageProps<'/[lang]/admin/music/image-gen'>) {
  const { lang } = await params
  const dict = await getDictionary(lang)
  const music = await backendService.searchMusic('', {
    includeUnpublished: true,
  })

  return (
    <div className="space-y-8 pb-10">
      <SectionHeading
        eyebrow={`${dict.sections.admin} / ${dict.sections.songLibrary}`}
        title="Music image generator"
        description="Generate 4:5 lyric and vocab cards from song data."
      />
      <AdminGuard deniedMessage={dict.labels.accessDenied} hint={dict.labels.adminHint}>
        <AdminMusicImageGenerator locale={lang} music={music} />
      </AdminGuard>
    </div>
  )
}
