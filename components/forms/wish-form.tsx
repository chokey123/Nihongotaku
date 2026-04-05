"use client";

import { useState, useTransition } from "react";

import { backendService } from "@/lib/services/backend-service";
import type { Dictionary } from "@/lib/i18n";

export function WishForm({ dict }: { dict: Dictionary }) {
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");
  const [isPending, startTransition] = useTransition();
  const successMessage =
    dict.labels.submit === "Submit"
      ? "Wish submitted successfully."
      : dict.labels.submit === "提交"
        ? "許願已成功送出。"
        : "リクエストを送信しました。";

  return (
    <form
      className="glass-panel flex flex-col gap-4 rounded-[32px] border border-border p-6"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);
        startTransition(async () => {
          try {
            await backendService.submitWish({
              artist: String(formData.get("artist") ?? ""),
              title: String(formData.get("title") ?? ""),
              genre: String(formData.get("genre") ?? ""),
              url: String(formData.get("url") ?? ""),
            });
            setMessage(successMessage);
            setMessageTone("success");
            form.reset();
          } catch (error) {
            setMessage(
              error instanceof Error ? error.message : "Failed to submit wish.",
            );
            setMessageTone("error");
          }
        });
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span>{dict.labels.artist}</span>
          <input name="artist" required className="w-full rounded-2xl border border-border bg-surface-strong px-4 py-3 outline-none" />
        </label>
        <label className="space-y-2 text-sm">
          <span>{dict.labels.title}</span>
          <input name="title" required className="w-full rounded-2xl border border-border bg-surface-strong px-4 py-3 outline-none" />
        </label>
        <label className="space-y-2 text-sm">
          <span>{dict.labels.genre}</span>
          <input name="genre" required className="w-full rounded-2xl border border-border bg-surface-strong px-4 py-3 outline-none" />
        </label>
        <label className="space-y-2 text-sm">
          <span>{dict.labels.sourceUrl}</span>
          <input name="url" type="url" required className="w-full rounded-2xl border border-border bg-surface-strong px-4 py-3 outline-none" />
        </label>
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="w-fit rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white disabled:opacity-70"
      >
        {isPending ? "..." : dict.labels.submit}
      </button>
      {message ? (
        <p
          className={`rounded-2xl px-4 py-3 text-sm ${
            messageTone === "success"
              ? "bg-brand-soft text-brand-strong"
              : "border border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
