'use client'

import { usePathname } from 'next/navigation'

const socialLinks = [
  {
    name: 'Instagram',
    handle: '@nihongo.taku',
    href: 'https://www.instagram.com/nihongo.taku/',
    icon: (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.2" cy="6.8" r="0.8" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    name: 'Threads',
    handle: '@nihongo.taku',
    href: 'https://www.threads.com/@nihongo.taku',
    icon: (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M16.8 8.1c-.8-2.1-2.5-3.2-4.8-3.2-3.1 0-5.2 2.2-5.2 7.1s2.1 7.1 5.2 7.1c2.9 0 5.1-1.8 5.1-4.2 0-2.2-1.7-3.5-4.5-3.5-2.1 0-3.2.9-3.2 2.2 0 1.2 1 2 2.5 2 1.7 0 2.8-.9 3.1-2.8.5-3.6-1.1-5.2-3.8-5.2" />
        <path d="M17.4 10.2c1.5.5 2.6 1.3 3.2 2.4" />
      </svg>
    ),
  },
]

export function SocialLinks() {
  return (
    <div className="grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
      {socialLinks.map((link) => (
        <a
          key={link.name}
          href={link.href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-w-0 items-center gap-3 rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-muted transition hover:border-brand hover:text-brand-strong"
        >
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-strong">
            {link.icon}
          </span>
          <span className="min-w-0 truncate">
            <span className="sr-only">{link.name}</span>
            {link.handle}
          </span>
        </a>
      ))}
    </div>
  )
}

function FooterFrame({
  className = '',
}: {
  className?: string
}) {
  return (
    <footer
      className={`border-t border-border bg-background/90 backdrop-blur-xl transition-transform duration-300 ${className}`}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold text-foreground">
          關注我們的社群平臺，獲取最新消息
        </p>
        <SocialLinks />
      </div>
    </footer>
  )
}

export function SiteFooter() {
  const pathname = usePathname()
  const isHomePage = /^\/(ja|en|zh)\/home\/?$/.test(pathname)

  return isHomePage ? null : <FooterFrame />
}
