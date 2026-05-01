import { NextRequest, NextResponse } from "next/server";

import { defaultLocale, locales } from "@/lib/i18n";

const disabledLocales = ["en", "ja"];

function hasLocale(pathname: string) {
  return locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
}

function getDisabledLocalePath(pathname: string) {
  return disabledLocales.find(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const disabledLocale = getDisabledLocalePath(pathname);
  if (disabledLocale) {
    const nextUrl = request.nextUrl.clone();
    nextUrl.pathname =
      pathname === `/${disabledLocale}`
        ? `/${defaultLocale}`
        : pathname.replace(`/${disabledLocale}/`, `/${defaultLocale}/`);
    return NextResponse.redirect(nextUrl);
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") ||
    hasLocale(pathname)
  ) {
    return NextResponse.next();
  }

  const nextUrl = request.nextUrl.clone();
  nextUrl.pathname = `/${defaultLocale}${pathname === "/" ? "/home" : pathname}`;
  return NextResponse.redirect(nextUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
