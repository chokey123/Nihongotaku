import { ArticleCard } from "@/components/ui/article-card";
import { SearchBar } from "@/components/ui/search-bar";
import { SectionHeading } from "@/components/ui/section-heading";
import { backendService } from "@/lib/services/backend-service";
import { getDictionary } from "@/lib/i18n";

export default async function ArticlePage({
  params,
  searchParams,
}: PageProps<"/[lang]/article">) {
  const { lang } = await params;
  const { q = "" } = await searchParams;
  const dict = await getDictionary(lang);
  const articles = await backendService.searchArticles(
    typeof q === "string" ? q : "",
  );

  return (
    <div className="space-y-8 pb-10">
      <SectionHeading
        eyebrow="Article"
        title={dict.sections.articleLibrary}
        description="All article content is demo-only and rendered from hardcoded mock content."
      />
      <SearchBar
        defaultValue={typeof q === "string" ? q : ""}
        placeholder={dict.controls.searchArticle}
      />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {articles.map((item) => (
          <ArticleCard key={item.id} item={item} locale={lang} />
        ))}
      </div>
    </div>
  );
}
