import { AdminArticleForm } from "@/components/admin/admin-article-form";
import { AdminGuard } from "@/components/admin/admin-guard";
import { SectionHeading } from "@/components/ui/section-heading";
import { getDictionary } from "@/lib/i18n";

export default async function AdminArticleCreatePage({
  params,
}: PageProps<"/[lang]/admin/article">) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <div className="space-y-8 pb-10">
      <SectionHeading
        eyebrow="Admin / Article"
        title={dict.labels.createArticle}
        description="Create article content with a minimal TipTap editor."
      />
      <AdminGuard deniedMessage={dict.labels.accessDenied} hint={dict.labels.adminHint}>
        <AdminArticleForm dict={dict} mode="create" />
      </AdminGuard>
    </div>
  );
}
