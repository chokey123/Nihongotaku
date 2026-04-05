"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { AuthButton } from "@/components/ui/auth-button";
import { CatLogo } from "@/components/ui/cat-logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import type { Dictionary } from "@/lib/i18n";

const navItems = (locale: string, dict: Dictionary, isAdmin: boolean) => [
  { href: `/${locale}/music`, label: dict.nav.musicSearch },
  { href: `/${locale}/article`, label: dict.nav.articles },
  { href: `/${locale}/wish`, label: dict.nav.wish },
  ...(isAdmin ? [{ href: `/${locale}/admin`, label: dict.controls.admin }] : []),
];

export function SiteHeader({
  locale,
  dict,
}: {
  locale: string;
  dict: Dictionary;
}) {
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollYRef = useRef(0);
  const items = navItems(locale, dict, user?.role === "admin");

  useEffect(() => {
    const handleScroll = () => {
      const nextScrollY = window.scrollY;
      const previousScrollY = lastScrollYRef.current;

      if (nextScrollY <= 12) {
        setIsVisible(true);
      } else if (nextScrollY > previousScrollY) {
        setIsVisible(false);
        setIsMobileMenuOpen(false);
      } else if (nextScrollY < previousScrollY) {
        setIsVisible(true);
      }

      lastScrollYRef.current = nextScrollY;
    };

    lastScrollYRef.current = window.scrollY;
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl transition-transform duration-300 ${
        isVisible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <CatLogo locale={locale} />
          <nav className="hidden items-center gap-2 md:flex">
            {items.map((item) => (
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
          <div className="relative md:hidden">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((current) => !current)}
              aria-label="Toggle navigation menu"
              aria-expanded={isMobileMenuOpen}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground transition hover:bg-brand-soft hover:text-brand-strong"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <path d="M4 7h16" />
                <path d="M4 12h16" />
                <path d="M4 17h16" />
              </svg>
            </button>
            {isMobileMenuOpen ? (
              <div className="absolute right-0 top-12 z-50 min-w-[180px] rounded-[24px] border border-border bg-background p-2 shadow-xl">
                {items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block rounded-2xl px-4 py-3 text-sm font-medium text-muted transition hover:bg-brand-soft hover:text-brand-strong"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
          <ThemeToggle label={dict.controls.theme} />
          <AuthButton
            loginLabel={dict.controls.login}
            logoutLabel={dict.controls.logout}
            locale={locale}
          />
        </div>
      </div>
    </header>
  );
}
