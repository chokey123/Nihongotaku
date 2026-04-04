import Link from "next/link";

import { AuthButton } from "@/components/ui/auth-button";
import { CatLogo } from "@/components/ui/cat-logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import type { Dictionary } from "@/lib/i18n";

const navItems = (locale: string, dict: Dictionary) => [
  { href: `/${locale}/music`, label: dict.nav.musicSearch },
  { href: `/${locale}/article`, label: dict.nav.articles },
  { href: `/${locale}/wish`, label: dict.nav.wish },
];

export function SiteHeader({
  locale,
  dict,
}: {
  locale: string;
  dict: Dictionary;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <CatLogo locale={locale} />
          <nav className="hidden items-center gap-2 md:flex">
            {navItems(locale, dict).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full px-4 py-2 text-sm font-medium text-muted transition hover:bg-brand-soft hover:text-brand-strong"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle label={dict.controls.theme} />
          <AuthButton
            loginLabel={dict.controls.login}
            logoutLabel={dict.controls.logout}
          />
        </div>
      </div>
    </header>
  );
}
