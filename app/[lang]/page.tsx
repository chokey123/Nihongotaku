import { redirect } from "next/navigation";

export default async function LocaleIndexPage({
  params,
}: PageProps<"/[lang]">) {
  const { lang } = await params;
  redirect(`/${lang}/home`);
}
