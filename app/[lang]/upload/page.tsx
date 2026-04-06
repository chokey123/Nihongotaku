import Link from 'next/link'

import { AuthenticatedGuard } from '@/components/auth/authenticated-guard'
import { SectionHeading } from '@/components/ui/section-heading'
import { getDictionary } from '@/lib/i18n'

export default async function UploadPage({
  params,
}: PageProps<'/[lang]/upload'>) {
  const { lang } = await params
  const dict = await getDictionary(lang)

  return (
    <div className="space-y-8 pb-10">
      <SectionHeading
        eyebrow={dict.controls.upload}
        title={dict.sections.upload}
        description={dict.pages.uploadHubDescription}
      />
      <AuthenticatedGuard hint={dict.pages.uploadHubDescription}>
        <div className="grid gap-5 lg:grid-cols-3">
          <Link
            href={`/${lang}/upload/music`}
            className="glass-panel rounded-[32px] border border-border p-6 transition hover:-translate-y-1 hover:border-brand"
          >
            <p className="text-sm text-muted">{dict.sections.songLibrary}</p>
            <h2 className="mt-2 font-heading text-2xl font-bold">
              {dict.pages.uploadMusicLibraryTitle}
            </h2>
            <p className="mt-3 text-muted">
              {dict.pages.uploadMusicLibraryDescription}
            </p>
          </Link>
          {/* <Link
            href={`/${lang}/upload/article`}
            className="glass-panel rounded-[32px] border border-border p-6 transition hover:-translate-y-1 hover:border-brand"
          >
            <p className="text-sm text-muted">{dict.sections.articleLibrary}</p>
            <h2 className="mt-2 font-heading text-2xl font-bold">
              {dict.pages.uploadArticleLibraryTitle}
            </h2>
            <p className="mt-3 text-muted">
              {dict.pages.uploadArticleLibraryDescription}
            </p>
          </Link> */}
          <Link
            href={`/${lang}/upload/quiz`}
            className="glass-panel rounded-[32px] border border-border p-6 transition hover:-translate-y-1 hover:border-brand"
          >
            <p className="text-sm text-muted">{dict.sections.quiz}</p>
            <h2 className="mt-2 font-heading text-2xl font-bold">
              {dict.pages.uploadQuizLibraryTitle}
            </h2>
            <p className="mt-3 text-muted">
              {dict.pages.uploadQuizLibraryDescription}
            </p>
          </Link>
        </div>
      </AuthenticatedGuard>
    </div>
  )
}
