import { AuthenticatedGuard } from '@/components/auth/authenticated-guard'
import { AdminArticleLibraryShell } from '@/components/admin/admin-article-library-shell'
import { SectionHeading } from '@/components/ui/section-heading'
import { getDictionary } from '@/lib/i18n'

export default async function UploadArticleLibraryPage({
  params,
}: PageProps<'/[lang]/upload/article'>) {
  const { lang } = await params
  const dict = await getDictionary(lang)

  return (
    <div className="space-y-8 pb-10">
      <SectionHeading
        eyebrow={`${dict.sections.upload} / ${dict.sections.articleLibrary}`}
        title={dict.pages.uploadArticleLibraryTitle}
        description={dict.pages.uploadArticleLibraryDescription}
      />
      <AuthenticatedGuard hint={dict.pages.uploadArticleLibraryDescription}>
        <AdminArticleLibraryShell
          locale={lang}
          basePath="upload"
          scope="upload"
          searchPlaceholder={dict.controls.searchArticle}
          loadingLabel={dict.status.loadingArticleLibrary}
          errorLabel={dict.status.failedArticleLibrary}
          newLabel={dict.controls.new}
          publishedLabel={dict.controls.published}
          draftLabel={dict.controls.draft}
        />
      </AuthenticatedGuard>
    </div>
  )
}
