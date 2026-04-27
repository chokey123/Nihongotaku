import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MusicDetailClient } from "@/components/music/music-detail-client";
import { backendService } from "@/lib/services/backend-service";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/types";
import {
  buildMusicKeywords,
  buildMusicSeoDescription,
  buildMusicSeoTitle,
  getLocalizedText,
  getMusicPath,
  getMusicUrl,
  getYoutubeThumbnailUrl,
  siteName,
  stringifyJsonLd,
} from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/music/[id]">): Promise<Metadata> {
  const { lang, id } = await params;
  const locale = lang as Locale;
  const music = await backendService.getMusicById(id);

  if (!music) {
    return {
      title: "找不到這首歌",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = buildMusicSeoTitle(music);
  const description = buildMusicSeoDescription(music);
  const imageUrl = getYoutubeThumbnailUrl(music.youtubeId);
  const canonical = getMusicPath(locale, music.id);

  return {
    title,
    description,
    keywords: buildMusicKeywords(music),
    alternates: {
      canonical,
      languages: {
        ja: getMusicPath("ja", music.id),
        en: getMusicPath("en", music.id),
        "zh-TW": getMusicPath("zh", music.id),
      },
    },
    openGraph: {
      type: "music.song",
      siteName,
      title,
      description,
      url: getMusicUrl(locale, music.id),
      images: imageUrl
        ? [
            {
              url: imageUrl,
              alt: `${music.artist} - ${music.title}`,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

export default async function MusicDetailPage({
  params,
}: PageProps<"/[lang]/music/[id]">) {
  const { lang, id } = await params;
  const dict = await getDictionary(lang);
  const music = await backendService.getMusicById(id);

  if (!music) notFound();

  const locale = lang as Locale;
  const musicUrl = getMusicUrl(locale, music.id);
  const imageUrl = getYoutubeThumbnailUrl(music.youtubeId);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MusicRecording",
    name: music.title,
    byArtist: {
      "@type": "MusicGroup",
      name: music.artist,
    },
    genre: music.genre,
    inLanguage: "ja",
    url: musicUrl,
    image: imageUrl || undefined,
    description: buildMusicSeoDescription(music),
    lyrics: {
      "@type": "CreativeWork",
      text: music.lyrics.map((line) => line.japanese).join("\n"),
      translationOfWork: music.lyrics
        .map((line) => getLocalizedText(line.translation, locale))
        .filter(Boolean)
        .join("\n"),
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": musicUrl,
    },
  };

  return (
    <div className="pb-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: stringifyJsonLd(jsonLd),
        }}
      />
      <MusicDetailClient item={music} dict={dict} locale={lang as Locale} />
    </div>
  );
}
