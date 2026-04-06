import Link from 'next/link'

import { AuthenticatedGuard } from '@/components/auth/authenticated-guard'
import { AdminMusicEditorShell } from '@/components/admin/admin-music-editor-shell'
import { SectionHeading } from '@/components/ui/section-heading'
import { getDictionary } from '@/lib/i18n'
import type { Locale } from '@/lib/types'

export default async function UploadMusicEditPage({
  params,
}: PageProps<'/[lang]/upload/music/[id]'>) {
  const { lang, id } = await params
  const dict = await getDictionary(lang)

  return (
    <div className="space-y-8 pb-10">
      <SectionHeading
        eyebrow={`${dict.sections.upload} / ${dict.sections.songLibrary}`}
        title={dict.labels.editMusic}
        description={dict.pages.uploadMusicEditDescription}
      />
      <AuthenticatedGuard hint={dict.pages.uploadMusicEditDescription}>
        <div className="mb-4 flex justify-end">
          <Link
            href={`/${lang}/upload/music/quiz/${id}`}
            className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold transition hover:border-brand"
          >
            {dict.actions.manageQuiz}
          </Link>
        </div>
        <AdminMusicEditorShell
          dict={dict}
          musicId={id}
          mode="edit"
          locale={lang as Locale}
          scope="upload"
          basePath="upload"
        />
      </AuthenticatedGuard>
    </div>
  )
}
