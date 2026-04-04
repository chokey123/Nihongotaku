import { MusicCard } from "@/components/ui/music-card";
import { SearchBar } from "@/components/ui/search-bar";
import { SectionHeading } from "@/components/ui/section-heading";
import { backendService } from "@/lib/services/backend-service";
import { getDictionary } from "@/lib/i18n";

export default async function MusicPage({
  params,
  searchParams,
}: PageProps<"/[lang]/music">) {
  const { lang } = await params;
  const { q = "" } = await searchParams;
  const dict = await getDictionary(lang);
  const music = await backendService.searchMusic(typeof q === "string" ? q : "");

  return (
    <div className="space-y-8 pb-10">
      <SectionHeading
        eyebrow="Music"
        title={dict.sections.songLibrary}
        description="Search through the mock song catalog for the demo."
      />
      <SearchBar
        defaultValue={typeof q === "string" ? q : ""}
        placeholder={dict.controls.searchMusic}
      />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {music.map((item) => (
          <MusicCard key={item.id} item={item} locale={lang} />
        ))}
      </div>
    </div>
  );
}
