import { AdminArticleLibraryShell } from "@/components/admin/admin-article-library-shell";
import { AdminGuard } from "@/components/admin/admin-guard";
import { SectionHeading } from "@/components/ui/section-heading";
import { getDictionary } from "@/lib/i18n";

export default async function AdminArticleLibraryPage({
  params,
}: PageProps<"/[lang]/admin/article">) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <div className="space-y-8 pb-10">
      <SectionHeading
        eyebrow={`${dict.sections.admin} / ${dict.sections.articleLibrary}`}
        title={dict.pages.adminArticleLibraryTitle}
        description={dict.pages.adminArticleLibraryDescription}
      />
      <AdminGuard deniedMessage={dict.labels.accessDenied} hint={dict.labels.adminHint}>
        <AdminArticleLibraryShell
          locale={lang}
          searchPlaceholder={dict.controls.searchArticle}
          loadingLabel={dict.status.loadingArticleLibrary}
          errorLabel={dict.status.failedArticleLibrary}
          newLabel={dict.controls.new}
          publishedLabel={dict.controls.published}
          draftLabel={dict.controls.draft}
        />
      </AdminGuard>
    </div>
  );
}
