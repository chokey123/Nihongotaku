import { AdminGuard } from "@/components/admin/admin-guard";
import { AdminMusicEditorShell } from "@/components/admin/admin-music-editor-shell";
import { SectionHeading } from "@/components/ui/section-heading";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

export default async function AdminMusicCreatePage({
  params,
}: PageProps<"/[lang]/admin/music/new">) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <div className="space-y-8 pb-10">
      <SectionHeading
        eyebrow={`${dict.sections.admin} / ${dict.sections.songLibrary}`}
        title={dict.labels.createMusic}
        description={dict.pages.adminMusicCreateDescription}
      />
      <AdminGuard deniedMessage={dict.labels.accessDenied} hint={dict.labels.adminHint}>
        <AdminMusicEditorShell
          dict={dict}
          mode="create"
          locale={lang as Locale}
        />
      </AdminGuard>
    </div>
  );
}
