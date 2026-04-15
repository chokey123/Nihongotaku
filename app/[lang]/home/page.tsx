import { HomePageShell } from "@/components/home/home-page-shell";
import { backendService } from "@/lib/services/backend-service";
import { getDictionary } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function HomePage({
  params,
}: PageProps<"/[lang]/home">) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const [musicPage, musicFilters] = await Promise.all([
    backendService.searchMusicPage("", { limit: 6 }),
    backendService.getMusicFilterOptions(),
  ]);

  return (
    <HomePageShell
      lang={lang}
      dict={dict}
      music={musicPage.items}
      musicTotal={musicPage.total}
      artistFilterOptions={musicFilters.artists}
      genreFilterOptions={musicFilters.genres}
    />
  );
}
