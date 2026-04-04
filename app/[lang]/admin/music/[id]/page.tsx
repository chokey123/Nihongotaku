import { notFound } from "next/navigation";

import { AdminGuard } from "@/components/admin/admin-guard";
import { AdminMusicForm } from "@/components/admin/admin-music-form";
import { SectionHeading } from "@/components/ui/section-heading";
import { backendService } from "@/lib/services/backend-service";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

export default async function AdminMusicEditPage({
  params,
}: PageProps<"/[lang]/admin/music/[id]">) {
  const { lang, id } = await params;
  const dict = await getDictionary(lang);
  const music = await backendService.getMusicById(id);

  if (!music) notFound();

  return (
    <div className="space-y-8 pb-10">
      <SectionHeading
        eyebrow="Admin / Music"
        title={dict.labels.editMusic}
        description={`Editing ${music.title} with mock data.`}
      />
      <AdminGuard deniedMessage={dict.labels.accessDenied} hint={dict.labels.adminHint}>
        <AdminMusicForm
          dict={dict}
          initialMusic={music}
          mode="edit"
          initialLocale={lang as Locale}
        />
      </AdminGuard>
    </div>
  );
}
