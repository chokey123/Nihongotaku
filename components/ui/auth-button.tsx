"use client";

import Link from "next/link";
import { useTransition } from "react";

import { useAuth } from "@/components/providers/auth-provider";

export function AuthButton({
  loginLabel,
  logoutLabel,
  locale,
}: {
  loginLabel: string;
  logoutLabel: string;
  locale: string;
}) {
  const { user, logout } = useAuth();
  const [isPending, startTransition] = useTransition();

  if (!user) {
    return (
      <Link
        href={`/${locale}/login`}
        className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-strong"
      >
        {loginLabel}
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await logout();
        })
      }
      className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-strong disabled:opacity-60"
    >
      {isPending ? "..." : logoutLabel}
    </button>
  );
}
