import { AuthenticatedGuard } from '@/components/auth/authenticated-guard'
import { AdminMusicQuizShell } from '@/components/admin/admin-music-quiz-shell'
import { SectionHeading } from '@/components/ui/section-heading'
import { getDictionary } from '@/lib/i18n'
import type { Locale } from '@/lib/types'

export default async function UploadMusicQuizPage({
  params,
}: PageProps<'/[lang]/upload/music/quiz/[id]'>) {
  const { lang, id } = await params
  const dict = await getDictionary(lang)

  return (
    <div className="space-y-8 pb-10">
      <SectionHeading
        eyebrow={`${dict.sections.upload} / ${dict.sections.quiz}`}
        title={dict.pages.uploadQuizLibraryTitle}
        description={dict.pages.uploadQuizLibraryDescription}
      />
      <AuthenticatedGuard hint={dict.pages.uploadQuizLibraryDescription}>
        <AdminMusicQuizShell
          musicId={id}
          locale={lang as Locale}
          dict={dict}
          scope="upload"
        />
      </AuthenticatedGuard>
    </div>
  )
}
