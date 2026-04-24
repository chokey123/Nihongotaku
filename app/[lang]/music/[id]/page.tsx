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

  const sameArtistMusic = (await backendService.searchMusic(""))
    .filter((item) => item.artist === music.artist && item.id !== music.id)
    .slice(0, 24);

  const excludedMusicIds = new Set([
    music.id,
    ...sameArtistMusic.map((item) => item.id),
  ]);
  const sameGenreMusic = (
    await backendService.searchMusicPage("", {
      genre: music.genre,
      limit: 24,
    })
  ).items.filter((item) => !excludedMusicIds.has(item.id));
  const latestPublishedMusic = (await backendService.searchMusic("")).filter(
    (item) => !excludedMusicIds.has(item.id),
  );
  const recommendedMusic = [...sameGenreMusic, ...latestPublishedMusic]
    .filter(
      (item, index, array) =>
        array.findIndex((entry) => entry.id === item.id) === index,
    )
    .slice(0, 12);

  return (
    <div className="pb-10">
      <MusicDetailClient
        item={music}
        dict={dict}
        locale={lang as Locale}
        sameArtistMusic={sameArtistMusic}
        recommendedMusic={recommendedMusic}
      />
    </div>
  );
}
