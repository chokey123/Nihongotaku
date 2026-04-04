"use client";

import { useAuth } from "@/components/providers/auth-provider";

export function AdminGuard({
  deniedMessage,
  hint,
  children,
}: {
  deniedMessage: string;
  hint: string;
  children: React.ReactNode;
}) {
  const { user } = useAuth();

  if (!user || user.role !== "admin") {
    return (
      <div className="glass-panel rounded-[32px] border border-border p-8">
        <p className="font-heading text-2xl font-bold">{deniedMessage}</p>
        <p className="mt-3 text-muted">{hint}</p>
      </div>
    );
  }

  return <>{children}</>;
}
