import { ArticleCard } from "@/components/ui/article-card";
import { MusicCard } from "@/components/ui/music-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { backendService } from "@/lib/services/backend-service";
import { getDictionary } from "@/lib/i18n";

export default async function HomePage({
  params,
}: PageProps<"/[lang]/home">) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const homeData = await backendService.getHomeData();

  return (
    <div className="space-y-12 pb-10">
      <section className="glass-panel relative overflow-hidden rounded-[36px] border border-border px-6 py-10 sm:px-10">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-brand-soft blur-3xl" />
        <div className="relative max-w-3xl space-y-4">
          <span className="inline-flex rounded-full bg-brand-soft px-4 py-2 text-sm font-semibold text-brand-strong">
            JPOP x Japanese
          </span>
          <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl">
            {dict.slogan}
          </h1>
          <p className="max-w-2xl text-lg text-muted">
            Minimalist, playful, and fully mock-data driven for the current frontend
            demo. Explore songs, articles, lyrics timing, and vocab cards without
            backend dependencies.
          </p>
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeading
          eyebrow="01"
          title={dict.sections.newReleases}
          description="Fresh entries to keep the listening flow lively."
        />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {homeData.newReleases.map((item) => (
            <MusicCard key={item.id} item={item} locale={lang} />
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeading
          eyebrow="02"
          title={dict.sections.trendingSongs}
          description="Popular tracks surfaced from the mock playlist."
        />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {homeData.trendingSongs.map((item) => (
            <MusicCard key={item.id} item={item} locale={lang} />
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeading
          eyebrow="03"
          title={dict.sections.latestArticles}
          description="Reading materials prepared with a light TipTap article flow."
        />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {homeData.latestArticles.map((item) => (
            <ArticleCard key={item.id} item={item} locale={lang} />
          ))}
        </div>
      </section>
    </div>
  );
}
