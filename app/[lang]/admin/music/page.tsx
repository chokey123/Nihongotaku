import { AdminGuard } from "@/components/admin/admin-guard";
import { AdminMusicForm } from "@/components/admin/admin-music-form";
import { SectionHeading } from "@/components/ui/section-heading";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

export default async function AdminMusicCreatePage({
  params,
}: PageProps<"/[lang]/admin/music">) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <div className="space-y-8 pb-10">
      <SectionHeading
        eyebrow="Admin / Music"
        title={dict.labels.createMusic}
        description="Mock upload flow for URL + LRC + vocab mapping."
      />
      <AdminGuard deniedMessage={dict.labels.accessDenied} hint={dict.labels.adminHint}>
        <AdminMusicForm
          dict={dict}
          mode="create"
          initialLocale={lang as Locale}
        />
      </AdminGuard>
    </div>
  );
}
