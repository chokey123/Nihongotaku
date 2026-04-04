import Image from 'next/image'
import Link from 'next/link'

const logoUrl = process.env.NEXT_PUBLIC_NIHONGOTAKU_LOGO_URL

export function CatLogo({ locale }: { locale: string }) {
  return (
    <Link
      href={`/${locale}/home`}
      className="flex items-center justify-center rounded-full border border-border bg-surface p-2 transition hover:border-brand hover:text-brand-strong"
    >
      {logoUrl ? (
        <Image
          src={logoUrl}
          alt="Nihongotaku"
          width={100}
          height={100}
          className="h-16 w-16 rounded-full object-cover"
        />
      ) : (
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft text-lg font-bold text-brand-strong">
          Cat
        </span>
      )}
    </Link>
  )
}
