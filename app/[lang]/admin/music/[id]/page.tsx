import Link from "next/link";

import { AdminGuard } from "@/components/admin/admin-guard";
import { AdminMusicEditorShell } from "@/components/admin/admin-music-editor-shell";
import { SectionHeading } from "@/components/ui/section-heading";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

export default async function AdminMusicEditPage({
  params,
}: PageProps<"/[lang]/admin/music/[id]">) {
  const { lang, id } = await params;
  const dict = await getDictionary(lang);

  return (
    <div className="space-y-8 pb-10">
      <SectionHeading
        eyebrow={`${dict.sections.admin} / ${dict.sections.songLibrary}`}
        title={dict.labels.editMusic}
        description={dict.pages.adminMusicEditDescription}
      />
      <AdminGuard deniedMessage={dict.labels.accessDenied} hint={dict.labels.adminHint}>
        <div className="mb-4 flex justify-end">
          <Link
            href={`/${lang}/admin/music/quiz/${id}`}
            className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold transition hover:border-brand"
          >
            {dict.actions.manageQuiz}
          </Link>
        </div>
        <AdminMusicEditorShell
          dict={dict}
          musicId={id}
          mode="edit"
          locale={lang as Locale}
        />
      </AdminGuard>
    </div>
  );
}
