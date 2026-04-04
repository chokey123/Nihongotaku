"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
} from "react";

import { backendService } from "@/lib/services/backend-service";
import type { AuthUser } from "@/lib/types";

interface AuthContextValue {
  user: AuthUser | null;
  login: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const stored = window.localStorage.getItem("nihongotaku-user");
    return stored ? (JSON.parse(stored) as AuthUser) : null;
  });

  const value = useMemo(
    () => ({
      user,
      login: async () => {
        const nextUser = await backendService.getCurrentUser();
        setUser(nextUser);
        window.localStorage.setItem("nihongotaku-user", JSON.stringify(nextUser));
      },
      logout: () => {
        setUser(null);
        window.localStorage.removeItem("nihongotaku-user");
      },
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
