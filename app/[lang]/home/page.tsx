import Link from "next/link";

import { ArticleCard } from "@/components/ui/article-card";
import { MusicCard } from "@/components/ui/music-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { backendService } from "@/lib/services/backend-service";
import { getDictionary } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function HomePage({
  params,
}: PageProps<"/[lang]/home">) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  const [music, articles] = await Promise.all([
    backendService.searchMusic(""),
    backendService.searchArticles(""),
  ]);

  const latestMusic = music.slice(0, 6);
  const latestQuizMusic = music
    .filter((item) => item.quizVocabKeys.length > 0)
    .slice(0, 6);
  const latestArticles = articles.slice(0, 3);

  return (
    <div className="space-y-12 pb-10">
      <section className="glass-panel relative overflow-hidden rounded-[36px] border border-border px-6 py-10 sm:px-10">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-brand-soft blur-3xl" />
        <div className="relative max-w-3xl space-y-4">
          <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl">
            {dict.slogan}
          </h1>
          <p className="max-w-2xl text-lg text-muted">{dict.pages.homeIntro}</p>
        </div>
      </section>

      <section className="space-y-6 border-b border-border/70 pb-12">
        <SectionHeading
          eyebrow="01"
          title={dict.sections.songLibrary}
          description={dict.pages.homeMusicDescription}
        />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {latestMusic.map((item) => (
            <MusicCard key={item.id} item={item} locale={lang} />
          ))}
        </div>
        <div className="flex justify-end">
          <Link
            href={`/${lang}/music`}
            className="rounded-full border border-border bg-surface px-5 py-3 text-sm font-semibold transition hover:border-brand hover:text-brand-strong"
          >
            {dict.controls.seeMore}
          </Link>
        </div>
      </section>

      <section className="space-y-6 border-b border-border/70 pb-12">
        <SectionHeading
          eyebrow="02"
          title={dict.sections.quiz}
          description={dict.pages.homeQuizDescription}
        />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {latestQuizMusic.map((item) => (
            <MusicCard
              key={item.id}
              item={item}
              locale={lang}
              href={`/${lang}/music/quiz/${item.id}`}
              metaBadge={`${item.quizVocabKeys.length} ${lang === "en" ? "questions" : "題"}`}
            />
          ))}
        </div>
        <div className="flex justify-end">
          <Link
            href={`/${lang}/quiz`}
            className="rounded-full border border-border bg-surface px-5 py-3 text-sm font-semibold transition hover:border-brand hover:text-brand-strong"
          >
            {dict.controls.seeMore}
          </Link>
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeading
          eyebrow="03"
          title={dict.sections.latestArticles}
          description={dict.pages.homeArticleDescription}
        />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {latestArticles.map((item) => (
            <ArticleCard key={item.id} item={item} locale={lang} />
          ))}
        </div>
        <div className="flex justify-end">
          <Link
            href={`/${lang}/article`}
            className="rounded-full border border-border bg-surface px-5 py-3 text-sm font-semibold transition hover:border-brand hover:text-brand-strong"
          >
            {dict.controls.seeMore}
          </Link>
        </div>
      </section>
    </div>
  );
}
