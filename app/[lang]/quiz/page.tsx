import { MusicCard } from "@/components/ui/music-card";
import { SearchBar } from "@/components/ui/search-bar";
import { SectionHeading } from "@/components/ui/section-heading";
import { backendService } from "@/lib/services/backend-service";
import { getDictionary } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const questionCountLabel = {
  ja: "題",
  en: "questions",
  zh: "題",
} as const;

export default async function QuizPage({
  params,
  searchParams,
}: PageProps<"/[lang]/quiz">) {
  const { lang } = await params;
  const { q = "" } = await searchParams;
  const dict = await getDictionary(lang);
  const music = await backendService.searchMusic(typeof q === "string" ? q : "");
  const quizMusic = music.filter((item) => item.quizVocabKeys.length > 0);

  return (
    <div className="space-y-8 pb-10">
      <SectionHeading
        eyebrow={dict.sections.quiz}
        title={dict.sections.quiz}
        description={dict.pages.homeQuizDescription}
      />
      <SearchBar
        defaultValue={typeof q === "string" ? q : ""}
        placeholder={dict.controls.searchMusic}
        buttonLabel={dict.controls.search}
      />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {quizMusic.map((item) => (
          <MusicCard
            key={item.id}
            item={item}
            locale={lang}
            href={`/${lang}/music/quiz/${item.id}`}
            metaBadge={`${item.quizVocabKeys.length} ${questionCountLabel[lang as keyof typeof questionCountLabel]}`}
          />
        ))}
      </div>
    </div>
  );
}
