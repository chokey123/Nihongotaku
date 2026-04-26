import { MusicCard } from "@/components/ui/music-card";
import { SearchBar } from "@/components/ui/search-bar";
import { SectionHeading } from "@/components/ui/section-heading";
import { backendService } from "@/lib/services/backend-service";
import { getDictionary } from "@/lib/i18n";
import type { Metadata } from "next";
import { buildAbsoluteUrl, siteName } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<"/[lang]/music">): Promise<Metadata> {
  const { lang } = await params;
  const { q = "" } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const title = query
    ? `${query} 歌詞搜尋`
    : "日語歌詞與歌曲目錄";
  const description = query
    ? `搜尋「${query}」相關的日語歌曲歌詞、中文翻譯、單字卡與 JPOP 日語學習內容。`
    : "瀏覽 Nihongotaku 收錄的日語歌曲歌詞、中文翻譯、單字卡與測驗。";

  return {
    title,
    description,
    keywords: [
      "日語歌詞",
      "日文歌詞",
      "JPOP 歌詞",
      "日語歌曲",
      "歌詞搜尋",
      query,
    ].filter(Boolean),
    alternates: {
      canonical: query
        ? `/${lang}/music?q=${encodeURIComponent(query)}`
        : `/${lang}/music`,
    },
    openGraph: {
      type: "website",
      siteName,
      title: `${title} | ${siteName}`,
      description,
      url: buildAbsoluteUrl(
        query ? `/${lang}/music?q=${encodeURIComponent(query)}` : `/${lang}/music`,
      ),
    },
  };
}

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
        eyebrow={dict.sections.songLibrary}
        title={dict.sections.songLibrary}
        description={dict.pages.musicPageDescription}
      />
      <SearchBar
        defaultValue={typeof q === "string" ? q : ""}
        placeholder={dict.controls.searchMusic}
        buttonLabel={dict.controls.search}
      />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {music.map((item) => (
          <MusicCard key={item.id} item={item} locale={lang} />
        ))}
      </div>
    </div>
  );
}
