"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

type ThemeMode = "light" | "dark";
const THEME_STORAGE_KEY = "nihongotaku-theme";

function resolveThemeFromBrowser(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }

  if (document.documentElement.classList.contains("dark")) {
    return "dark";
  }

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "dark" || stored === "light") {
    return stored;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

interface ThemeContextValue {
  theme: ThemeMode;
  mounted: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>(() => resolveThemeFromBrowser());
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      mounted,
      toggleTheme: () =>
        setTheme((current) => (current === "light" ? "dark" : "light")),
    }),
    [mounted, theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");
  return context;
}
