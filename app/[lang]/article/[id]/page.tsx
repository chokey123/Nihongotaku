import { notFound } from "next/navigation";

import { ReadonlyEditor } from "@/components/article/readonly-editor";
import { backendService } from "@/lib/services/backend-service";
import { getDictionary } from "@/lib/i18n";

export default async function ArticleDetailPage({
  params,
}: PageProps<"/[lang]/article/[id]">) {
  const { lang, id } = await params;
  const dict = await getDictionary(lang);
  const article = await backendService.getArticleById(id);

  if (!article) notFound();

  return (
    <article className="space-y-6 pb-10">
      <div
        className="glass-panel relative overflow-hidden rounded-[36px] border border-border p-8"
        style={{
          background: `linear-gradient(135deg, ${article.palette.from}, ${article.palette.to})`,
        }}
      >
        <div className="max-w-3xl rounded-[28px] bg-white/18 p-6 backdrop-blur-sm">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-white/90">
            <span className="rounded-full bg-white/18 px-3 py-1">{article.type}</span>
            <span>{article.artist}</span>
          </div>
          <h1 className="font-heading text-4xl font-bold tracking-tight text-white">
            {article.title}
          </h1>
          <p className="mt-3 text-white/88">{article.excerpt}</p>
        </div>
      </div>
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-heading text-2xl font-bold">{dict.labels.readonlyEditor}</h2>
          <span className="text-sm text-muted">{article.artist}</span>
        </div>
        <ReadonlyEditor content={article.content} />
      </section>
    </article>
  );
}
