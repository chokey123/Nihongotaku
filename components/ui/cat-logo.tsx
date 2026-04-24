'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const logoUrl = process.env.NEXT_PUBLIC_NIHONGOTAKU_LOGO_URL
const mobileLogoUrl = process.env.NEXT_PUBLIC_NIHONGOTAKU_MOBILE_LOGO_URL
const logoTextUrl = process.env.NEXT_PUBLIC_NIHONGOTAKU_LOGO_TEXT_URL

export function CatLogo({ locale }: { locale: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const homeHref = `/${locale}/home`

  return (
    <Link
      href={homeHref}
      onClick={(event) => {
        if (pathname !== homeHref) {
          return
        }

        event.preventDefault()
        window.scrollTo({ top: 0, behavior: 'smooth' })
        router.refresh()
      }}
      className="flex items-center gap-3 rounded-full border border-border bg-surface px-3 py-2 transition hover:border-brand hover:text-brand-strong"
    >
      {mobileLogoUrl ? (
        <Image
          src={mobileLogoUrl}
          alt="Nihongotaku"
          width={100}
          height={100}
          className="h-16 w-16 rounded-full object-cover sm:hidden"
        />
      ) : null}

      {logoUrl ? (
        <Image
          src={logoUrl}
          alt="Nihongotaku"
          width={100}
          height={100}
          className="hidden h-16 w-16 rounded-full object-cover sm:block"
        />
      ) : !mobileLogoUrl ? (
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft text-lg font-bold text-brand-strong">
          Cat
        </span>
      ) : null}

      {logoTextUrl ? (
        <Image
          src={logoTextUrl}
          alt="Nihongotaku text"
          width={220}
          height={72}
          className="hidden h-10 w-auto object-contain sm:block sm:h-12"
        />
      ) : null}
    </Link>
  )
}
