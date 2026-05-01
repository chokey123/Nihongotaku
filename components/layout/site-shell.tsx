import { Suspense } from "react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { AuthProvider } from "@/components/providers/auth-provider";
import { NavigationFeedback } from "@/components/providers/navigation-feedback";
import { ThemeProvider } from "@/components/providers/theme-provider";
import type { Dictionary } from "@/lib/i18n";

export function SiteShell({
  locale,
  dict,
  children,
}: {
  locale: string;
  dict: Dictionary;
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <div className="min-h-screen">
          <Suspense fallback={null}>
            <NavigationFeedback />
          </Suspense>
          <SiteHeader locale={locale} dict={dict} />
          <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8">
            {children}
          </main>
          <SiteFooter />
        </div>
      </AuthProvider>
    </ThemeProvider>
  );
}
