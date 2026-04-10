import { ResetPasswordCard } from '@/components/auth/reset-password-card'

export default async function ResetPasswordPage({
  params,
}: PageProps<'/[lang]/reset-password'>) {
  const { lang } = await params

  return (
    <div className="py-10">
      <ResetPasswordCard locale={lang} />
    </div>
  )
}
