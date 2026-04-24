import { notFound } from "next/navigation";

import { MusicDetailClient } from "@/components/music/music-detail-client";
import { backendService } from "@/lib/services/backend-service";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MusicDetailPage({
  params,
}: PageProps<"/[lang]/music/[id]">) {
  const { lang, id } = await params;
  const dict = await getDictionary(lang);
  const music = await backendService.getMusicById(id);

  if (!music) notFound();

  return (
    <div className="pb-10">
      <MusicDetailClient item={music} dict={dict} locale={lang as Locale} />
    </div>
  );
}
