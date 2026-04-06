import { AuthenticatedGuard } from '@/components/auth/authenticated-guard'
import { AdminMusicLibraryShell } from '@/components/admin/admin-music-library-shell'
import { SectionHeading } from '@/components/ui/section-heading'
import { getDictionary } from '@/lib/i18n'

export default async function UploadMusicLibraryPage({
  params,
}: PageProps<'/[lang]/upload/music'>) {
  const { lang } = await params
  const dict = await getDictionary(lang)

  return (
    <div className="space-y-8 pb-10">
      <SectionHeading
        eyebrow={`${dict.sections.upload} / ${dict.sections.songLibrary}`}
        title={dict.pages.uploadMusicLibraryTitle}
        description={dict.pages.uploadMusicLibraryDescription}
      />
      <AuthenticatedGuard hint={dict.pages.uploadMusicLibraryDescription}>
        <AdminMusicLibraryShell
          locale={lang}
          mode="music"
          scope="upload"
          basePath="upload"
          searchPlaceholder={dict.controls.searchMusic}
          loadingLabel={dict.status.loadingMusicLibrary}
          errorLabel={dict.status.failedMusicLibrary}
          newLabel={dict.controls.new}
          publishedLabel={dict.controls.published}
          draftLabel={dict.controls.draft}
          quizLabel={dict.sections.quiz}
        />
      </AuthenticatedGuard>
    </div>
  )
}
