import { AuthenticatedGuard } from '@/components/auth/authenticated-guard'
import { AdminArticleEditorShell } from '@/components/admin/admin-article-editor-shell'
import { SectionHeading } from '@/components/ui/section-heading'
import { getDictionary } from '@/lib/i18n'

export default async function UploadArticleEditPage({
  params,
}: PageProps<'/[lang]/upload/article/[id]'>) {
  const { lang, id } = await params
  const dict = await getDictionary(lang)

  return (
    <div className="space-y-8 pb-10">
      <SectionHeading
        eyebrow={`${dict.sections.upload} / ${dict.sections.articleLibrary}`}
        title={dict.labels.editArticle}
        description={dict.pages.uploadArticleEditDescription}
      />
      <AuthenticatedGuard hint={dict.pages.uploadArticleEditDescription}>
        <AdminArticleEditorShell
          dict={dict}
          mode="edit"
          articleId={id}
          locale={lang}
          scope="upload"
          basePath="upload"
        />
      </AuthenticatedGuard>
    </div>
  )
}
