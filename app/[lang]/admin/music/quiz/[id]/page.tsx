import { AdminGuard } from "@/components/admin/admin-guard";
import { AdminMusicQuizShell } from "@/components/admin/admin-music-quiz-shell";
import { SectionHeading } from "@/components/ui/section-heading";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

export default async function AdminMusicQuizPage({
  params,
}: PageProps<"/[lang]/admin/music/quiz/[id]">) {
  const { lang, id } = await params;
  const dict = await getDictionary(lang);

  return (
    <div className="space-y-8 pb-10">
      <SectionHeading
        eyebrow={`${dict.sections.admin} / ${dict.sections.quiz}`}
        title={dict.sections.quiz}
        description={dict.quiz.selectForSong}
      />
      <AdminGuard deniedMessage={dict.labels.accessDenied} hint={dict.labels.adminHint}>
        <AdminMusicQuizShell musicId={id} locale={lang as Locale} dict={dict} />
      </AdminGuard>
    </div>
  );
}
