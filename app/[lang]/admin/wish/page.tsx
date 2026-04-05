import { AdminGuard } from "@/components/admin/admin-guard";
import { AdminWishManager } from "@/components/admin/admin-wish-manager";
import { SectionHeading } from "@/components/ui/section-heading";
import { getDictionary } from "@/lib/i18n";

export default async function AdminWishPage({
  params,
}: PageProps<"/[lang]/admin/wish">) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <div className="space-y-8 pb-10">
      <SectionHeading
        eyebrow={`${dict.sections.admin} / ${dict.nav.wish}`}
        title={dict.pages.adminWishTitle}
        description={dict.pages.adminWishDescription}
      />
      <AdminGuard deniedMessage={dict.labels.accessDenied} hint={dict.labels.adminHint}>
        <AdminWishManager />
      </AdminGuard>
    </div>
  );
}
