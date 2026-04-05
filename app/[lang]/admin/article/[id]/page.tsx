import { AdminArticleEditorShell } from "@/components/admin/admin-article-editor-shell";
import { AdminGuard } from "@/components/admin/admin-guard";
import { SectionHeading } from "@/components/ui/section-heading";
import { getDictionary } from "@/lib/i18n";

export default async function AdminArticleEditPage({
  params,
}: PageProps<"/[lang]/admin/article/[id]">) {
  const { lang, id } = await params;
  const dict = await getDictionary(lang);

  return (
    <div className="space-y-8 pb-10">
      <SectionHeading
        eyebrow={`${dict.sections.admin} / ${dict.sections.articleLibrary}`}
        title={dict.labels.editArticle}
        description={dict.pages.adminArticleEditDescription}
      />
      <AdminGuard deniedMessage={dict.labels.accessDenied} hint={dict.labels.adminHint}>
        <AdminArticleEditorShell dict={dict} mode="edit" articleId={id} locale={lang} />
      </AdminGuard>
    </div>
  );
}
