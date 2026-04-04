import Link from "next/link";

import { AdminGuard } from "@/components/admin/admin-guard";
import { SectionHeading } from "@/components/ui/section-heading";
import { articleCatalog, musicCatalog } from "@/data/mock-data";
import { getDictionary } from "@/lib/i18n";

export default async function AdminPage({
  params,
}: PageProps<"/[lang]/admin">) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <div className="space-y-8 pb-10">
      <SectionHeading
        eyebrow="Admin"
        title={dict.sections.admin}
        description={dict.labels.adminHint}
      />
      <AdminGuard deniedMessage={dict.labels.accessDenied} hint={dict.labels.adminHint}>
        <div className="grid gap-5 lg:grid-cols-2">
          <Link href={`/${lang}/admin/music`} className="glass-panel rounded-[32px] border border-border p-6 transition hover:-translate-y-1 hover:border-brand">
            <p className="text-sm text-muted">Music</p>
            <h2 className="mt-2 font-heading text-2xl font-bold">{dict.actions.openAdminMusic}</h2>
            <p className="mt-3 text-muted">Upload LRC, add vocab, and manage lyric lines.</p>
          </Link>
          <Link href={`/${lang}/admin/article`} className="glass-panel rounded-[32px] border border-border p-6 transition hover:-translate-y-1 hover:border-brand">
            <p className="text-sm text-muted">Article</p>
            <h2 className="mt-2 font-heading text-2xl font-bold">{dict.actions.openAdminArticle}</h2>
            <p className="mt-3 text-muted">Create a TipTap article with readonly preview later.</p>
          </Link>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="glass-panel rounded-[32px] border border-border p-6">
            <h3 className="font-heading text-xl font-bold">{dict.labels.editMusic}</h3>
            <div className="mt-4 flex flex-wrap gap-3">
              {musicCatalog.map((item) => (
                <Link key={item.id} href={`/${lang}/admin/music/${item.id}`} className="rounded-full border border-border px-4 py-2 text-sm transition hover:border-brand">
                  {item.title}
                </Link>
              ))}
            </div>
          </div>
          <div className="glass-panel rounded-[32px] border border-border p-6">
            <h3 className="font-heading text-xl font-bold">{dict.labels.editArticle}</h3>
            <div className="mt-4 flex flex-wrap gap-3">
              {articleCatalog.map((item) => (
                <Link key={item.id} href={`/${lang}/admin/article/${item.id}`} className="rounded-full border border-border px-4 py-2 text-sm transition hover:border-brand">
                  {item.title}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </AdminGuard>
    </div>
  );
}
