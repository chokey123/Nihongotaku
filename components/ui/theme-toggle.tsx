"use client";

import { useTheme } from "@/components/providers/theme-provider";

export function ThemeToggle({ label }: { label: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground transition hover:bg-brand-soft hover:text-brand-strong"
    >
      {theme === "light" ? (
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
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 2.75v2.5" />
          <path d="M12 18.75v2.5" />
          <path d="m5.46 5.46 1.77 1.77" />
          <path d="m16.77 16.77 1.77 1.77" />
          <path d="M2.75 12h2.5" />
          <path d="M18.75 12h2.5" />
          <path d="m5.46 18.54 1.77-1.77" />
          <path d="m16.77 7.23 1.77-1.77" />
        </svg>
      ) : (
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
          <path d="M20.5 14.2A8.5 8.5 0 1 1 9.8 3.5a7 7 0 0 0 10.7 10.7Z" />
        </svg>
      )}
    </button>
  );
}
