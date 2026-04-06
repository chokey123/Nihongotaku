import { AuthenticatedGuard } from '@/components/auth/authenticated-guard'
import { AdminMusicLibraryShell } from '@/components/admin/admin-music-library-shell'
import { SectionHeading } from '@/components/ui/section-heading'
import { getDictionary } from '@/lib/i18n'

export default async function UploadQuizLibraryPage({
  params,
}: PageProps<'/[lang]/upload/quiz'>) {
  const { lang } = await params
  const dict = await getDictionary(lang)

  return (
    <div className="space-y-8 pb-10">
      <SectionHeading
        eyebrow={`${dict.sections.upload} / ${dict.sections.quiz}`}
        title={dict.pages.uploadQuizLibraryTitle}
        description={dict.pages.uploadQuizLibraryDescription}
      />
      <AuthenticatedGuard hint={dict.pages.uploadQuizLibraryDescription}>
        <AdminMusicLibraryShell
          locale={lang}
          mode="quiz"
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
