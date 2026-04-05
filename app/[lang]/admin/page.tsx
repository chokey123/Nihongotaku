import Link from "next/link";

import { AdminGuard } from "@/components/admin/admin-guard";
import { SectionHeading } from "@/components/ui/section-heading";
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
        <div className="grid gap-5 lg:grid-cols-4">
          <Link href={`/${lang}/admin/music`} className="glass-panel rounded-[32px] border border-border p-6 transition hover:-translate-y-1 hover:border-brand">
            <p className="text-sm text-muted">{dict.sections.songLibrary}</p>
            <h2 className="mt-2 font-heading text-2xl font-bold">{dict.pages.adminMusicLibraryTitle}</h2>
            <p className="mt-3 text-muted">{dict.pages.adminMusicLibraryDescription}</p>
          </Link>
          <Link href={`/${lang}/admin/article`} className="glass-panel rounded-[32px] border border-border p-6 transition hover:-translate-y-1 hover:border-brand">
            <p className="text-sm text-muted">{dict.sections.articleLibrary}</p>
            <h2 className="mt-2 font-heading text-2xl font-bold">{dict.pages.adminArticleLibraryTitle}</h2>
            <p className="mt-3 text-muted">{dict.pages.adminArticleLibraryDescription}</p>
          </Link>
          <Link href={`/${lang}/admin/quiz`} className="glass-panel rounded-[32px] border border-border p-6 transition hover:-translate-y-1 hover:border-brand">
            <p className="text-sm text-muted">{dict.sections.quiz}</p>
            <h2 className="mt-2 font-heading text-2xl font-bold">{dict.pages.adminQuizLibraryTitle}</h2>
            <p className="mt-3 text-muted">{dict.pages.adminQuizLibraryDescription}</p>
          </Link>
          <Link href={`/${lang}/admin/wish`} className="glass-panel rounded-[32px] border border-border p-6 transition hover:-translate-y-1 hover:border-brand">
            <p className="text-sm text-muted">{dict.nav.wish}</p>
            <h2 className="mt-2 font-heading text-2xl font-bold">{dict.pages.adminWishTitle}</h2>
            <p className="mt-3 text-muted">{dict.pages.adminWishDescription}</p>
          </Link>
        </div>
      </AdminGuard>
    </div>
  );
}
