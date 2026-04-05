"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/components/providers/auth-provider";

export function AdminGuard(props: {
  deniedMessage: string;
  hint: string;
  children: React.ReactNode;
}) {
  const { children, hint } = props;
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "ja";
  const loadingLabel =
    locale === "zh" ? "載入中..." : locale === "en" ? "Loading..." : "載入中...";

  useEffect(() => {
    if (isLoading) return;
    if (!user || user.role !== "admin") {
      router.replace(`/${locale}/home`);
    }
  }, [isLoading, locale, router, user]);

  if (isLoading) {
    return (
      <div className="glass-panel rounded-[32px] border border-border p-8">
        <p className="font-heading text-2xl font-bold">{loadingLabel}</p>
        <p className="mt-3 text-muted">{hint}</p>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return null;
  }

  return <>{children}</>;
}
