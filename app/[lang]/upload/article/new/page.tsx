import { AuthenticatedGuard } from '@/components/auth/authenticated-guard'
import { AdminArticleEditorShell } from '@/components/admin/admin-article-editor-shell'
import { SectionHeading } from '@/components/ui/section-heading'
import { getDictionary } from '@/lib/i18n'

export default async function UploadArticleCreatePage({
  params,
}: PageProps<'/[lang]/upload/article/new'>) {
  const { lang } = await params
  const dict = await getDictionary(lang)

  return (
    <div className="space-y-8 pb-10">
      <SectionHeading
        eyebrow={`${dict.sections.upload} / ${dict.sections.articleLibrary}`}
        title={dict.labels.createArticle}
        description={dict.pages.uploadArticleCreateDescription}
      />
      <AuthenticatedGuard hint={dict.pages.uploadArticleCreateDescription}>
        <AdminArticleEditorShell
          dict={dict}
          mode="create"
          locale={lang}
          scope="upload"
          basePath="upload"
        />
      </AuthenticatedGuard>
    </div>
  )
}
