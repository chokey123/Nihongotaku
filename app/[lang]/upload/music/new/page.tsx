import { AuthenticatedGuard } from '@/components/auth/authenticated-guard'
import { AdminMusicEditorShell } from '@/components/admin/admin-music-editor-shell'
import { SectionHeading } from '@/components/ui/section-heading'
import { getDictionary } from '@/lib/i18n'
import type { Locale } from '@/lib/types'

export default async function UploadMusicCreatePage({
  params,
}: PageProps<'/[lang]/upload/music/new'>) {
  const { lang } = await params
  const dict = await getDictionary(lang)

  return (
    <div className="space-y-8 pb-10">
      <SectionHeading
        eyebrow={`${dict.sections.upload} / ${dict.sections.songLibrary}`}
        title={dict.labels.createMusic}
        description={dict.pages.uploadMusicCreateDescription}
      />
      <AuthenticatedGuard hint={dict.pages.uploadMusicCreateDescription}>
        <AdminMusicEditorShell
          dict={dict}
          mode="create"
          locale={lang as Locale}
          scope="upload"
          basePath="upload"
        />
      </AuthenticatedGuard>
    </div>
  )
}
