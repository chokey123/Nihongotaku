import { AdminArticleEditorShell } from "@/components/admin/admin-article-editor-shell";
import { AdminGuard } from "@/components/admin/admin-guard";
import { SectionHeading } from "@/components/ui/section-heading";
import { getDictionary } from "@/lib/i18n";

export default async function AdminArticleCreatePage({
  params,
}: PageProps<"/[lang]/admin/article/new">) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <div className="space-y-8 pb-10">
      <SectionHeading
        eyebrow={`${dict.sections.admin} / ${dict.sections.articleLibrary}`}
        title={dict.labels.createArticle}
        description={dict.pages.adminArticleCreateDescription}
      />
      <AdminGuard deniedMessage={dict.labels.accessDenied} hint={dict.labels.adminHint}>
        <AdminArticleEditorShell dict={dict} mode="create" locale={lang} />
      </AdminGuard>
    </div>
  );
}
