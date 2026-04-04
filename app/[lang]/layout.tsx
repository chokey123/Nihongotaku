import { SiteShell } from "@/components/layout/site-shell";
import { getDictionary, locales } from "@/lib/i18n";

export async function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <SiteShell locale={lang} dict={dict}>
      {children}
    </SiteShell>
  );
}
