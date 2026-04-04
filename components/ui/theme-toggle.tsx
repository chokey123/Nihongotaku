"use client";

import { useTheme } from "@/components/providers/theme-provider";

export function ThemeToggle({ label }: { label: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      className="rounded-full border border-border bg-surface px-3 py-2 text-sm transition hover:border-brand hover:text-brand-strong"
    >
      {theme === "light" ? "Dark" : "Light"}
    </button>
  );
}
