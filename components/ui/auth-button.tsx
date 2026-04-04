"use client";

import { useTransition } from "react";

import { useAuth } from "@/components/providers/auth-provider";

export function AuthButton({
  loginLabel,
  logoutLabel,
}: {
  loginLabel: string;
  logoutLabel: string;
}) {
  const { user, login, logout } = useAuth();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          if (user) {
            logout();
            return;
          }

          await login();
        })
      }
      className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-strong disabled:opacity-60"
    >
      {isPending ? "..." : user ? logoutLabel : loginLabel}
    </button>
  );
}
