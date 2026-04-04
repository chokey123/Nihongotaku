import { notFound } from "next/navigation";

import { AdminArticleForm } from "@/components/admin/admin-article-form";
import { AdminGuard } from "@/components/admin/admin-guard";
import { SectionHeading } from "@/components/ui/section-heading";
import { backendService } from "@/lib/services/backend-service";
import { getDictionary } from "@/lib/i18n";

export default async function AdminArticleEditPage({
  params,
}: PageProps<"/[lang]/admin/article/[id]">) {
  const { lang, id } = await params;
  const dict = await getDictionary(lang);
  const article = await backendService.getArticleById(id);

  if (!article) notFound();

  return (
    <div className="space-y-8 pb-10">
      <SectionHeading
        eyebrow="Admin / Article"
        title={dict.labels.editArticle}
        description={`Editing ${article.title} with mock TipTap content.`}
      />
      <AdminGuard deniedMessage={dict.labels.accessDenied} hint={dict.labels.adminHint}>
        <AdminArticleForm dict={dict} initialArticle={article} mode="edit" />
      </AdminGuard>
    </div>
  );
}
