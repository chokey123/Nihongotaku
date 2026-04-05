import { WishForm } from "@/components/forms/wish-form";
import { SectionHeading } from "@/components/ui/section-heading";
import { getDictionary } from "@/lib/i18n";

export default async function WishPage({
  params,
}: PageProps<"/[lang]/wish">) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <div className="space-y-8 pb-10">
      <SectionHeading
        eyebrow={dict.nav.wish}
        title={dict.sections.request}
        description={dict.pages.wishPageDescription}
      />
      <WishForm dict={dict} />
    </div>
  );
}
