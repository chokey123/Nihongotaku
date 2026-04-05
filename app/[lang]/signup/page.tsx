import { AuthFormCard } from "@/components/auth/auth-form-card";
import { getDictionary } from "@/lib/i18n";

export default async function SignupPage({
  params,
}: PageProps<"/[lang]/signup">) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <div className="py-10">
      <AuthFormCard locale={lang} mode="signup" dict={dict} />
    </div>
  );
}
