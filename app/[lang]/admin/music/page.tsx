import { AdminGuard } from "@/components/admin/admin-guard";
import { AdminMusicLibraryShell } from "@/components/admin/admin-music-library-shell";
import { SectionHeading } from "@/components/ui/section-heading";
import { getDictionary } from "@/lib/i18n";

export default async function AdminMusicLibraryPage({
  params,
}: PageProps<"/[lang]/admin/music">) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <div className="space-y-8 pb-10">
      <SectionHeading
        eyebrow={`${dict.sections.admin} / ${dict.sections.songLibrary}`}
        title={dict.pages.adminMusicLibraryTitle}
        description={dict.pages.adminMusicLibraryDescription}
      />
      <AdminGuard deniedMessage={dict.labels.accessDenied} hint={dict.labels.adminHint}>
        <AdminMusicLibraryShell
          locale={lang}
          mode="music"
          searchPlaceholder={dict.controls.searchMusic}
          loadingLabel={dict.status.loadingMusicLibrary}
          errorLabel={dict.status.failedMusicLibrary}
          newLabel={dict.controls.new}
          publishedLabel={dict.controls.published}
          draftLabel={dict.controls.draft}
          quizLabel={dict.sections.quiz}
        />
      </AdminGuard>
    </div>
  );
}
