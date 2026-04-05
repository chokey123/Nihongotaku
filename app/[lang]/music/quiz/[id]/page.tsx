import { notFound } from "next/navigation";

import { MusicQuizClient } from "@/components/music/music-quiz-client";
import { backendService } from "@/lib/services/backend-service";
import type { Locale } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MusicQuizPage({
  params,
}: PageProps<"/[lang]/music/quiz/[id]">) {
  const { lang, id } = await params;
  const music = await backendService.getMusicById(id);

  if (!music) notFound();

  const questions = await backendService.getMusicQuizQuestions(
    id,
    lang as Locale,
  );

  return <MusicQuizClient item={music} questions={questions} locale={lang as Locale} />;
}
