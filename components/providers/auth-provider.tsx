"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { supabase } from "@/lib/supabase/client";
import type { AuthUser } from "@/lib/types";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<{ error: string | null; needsEmailConfirmation: boolean }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function getEmailRedirectTo() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;

  if (configuredUrl) {
    return `${configuredUrl.replace(/\/$/, "")}/zh/home`;
  }

  if (typeof window !== "undefined") {
    return `${window.location.origin}/zh/home`;
  }

  return undefined;
}

async function ensureUserProfile(user: {
  id: string;
  email?: string;
  user_metadata?: { display_name?: string };
}) {
  const displayName =
    user.user_metadata?.display_name || user.email || "User";

  const { error } = await supabase.from("user_profile").upsert({
    id: user.id,
    display_name: displayName,
    role: "user",
    created_by: user.id,
    updated_by: user.id,
  });

  return { error };
}

async function loadAuthUser() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user;

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("user_profile")
    .select("display_name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    await ensureUserProfile(user);
  }

  const { data: nextProfile } = await supabase
    .from("user_profile")
    .select("display_name, role")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email,
    name:
      nextProfile?.display_name ||
      user.user_metadata?.display_name ||
      user.email ||
      "User",
    role: nextProfile?.role === "admin" ? "admin" : "guest",
  } satisfies AuthUser;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    let isMounted = true;

    const refreshAuthUser = () => {
      if (refreshPromiseRef.current) {
        return refreshPromiseRef.current;
      }

      refreshPromiseRef.current = (async () => {
        try {
          const nextUser = await loadAuthUser();
          if (!isMounted) return;
          setUser(nextUser);
        } catch {
          if (!isMounted) return;
          setUser(null);
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
          refreshPromiseRef.current = null;
        }
      })();

      return refreshPromiseRef.current;
    };

    void refreshAuthUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      window.setTimeout(() => {
        void refreshAuthUser();
      }, 0);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      signIn: async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        return {
          error: error?.message ?? null,
        };
      },
      signUp: async (email: string, password: string, displayName: string) => {
        const emailRedirectTo = getEmailRedirectTo();
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName,
            },
            ...(emailRedirectTo ? { emailRedirectTo } : {}),
          },
        });

        if (error) {
          return {
            error: error.message,
            needsEmailConfirmation: false,
          };
        }

        if (data.user?.id) {
          await ensureUserProfile({
            id: data.user.id,
            email: data.user.email,
            user_metadata: {
              display_name: displayName,
            },
          });
        }

        return {
          error: null,
          needsEmailConfirmation: !data.session,
        };
      },
      logout: async () => {
        await supabase.auth.signOut();
        setUser(null);
      },
    }),
    [isLoading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
