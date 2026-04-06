"use client";

import { useState, useTransition } from "react";

import { backendService } from "@/lib/services/backend-service";
import type { Dictionary } from "@/lib/i18n";

function isValidYoutubeUrl(value: string) {
  const normalized = value.trim();

  if (!normalized) return false;

  try {
    const url = new URL(normalized);
    const hostname = url.hostname.replace(/^www\./, "");

    if (hostname === "youtu.be") {
      return url.pathname.replace("/", "").trim().length > 0;
    }

    if (hostname === "youtube.com" || hostname.endsWith(".youtube.com")) {
      return (url.searchParams.get("v") ?? "").trim().length > 0;
    }

    return false;
  } catch {
    return false;
  }
}

function getWishCopy(locale: string) {
  if (locale === "en") {
    return {
      success: "Wish submitted successfully.",
      fillAll: "Please complete every field.",
      invalidYoutube: "Please enter a valid YouTube link.",
      failed: "Failed to submit wish.",
    };
  }

  if (locale === "ja") {
    return {
      success: "リクエストを送信しました。",
      fillAll: "すべての項目を入力してください。",
      invalidYoutube: "有効な YouTube リンクを入力してください。",
      failed: "リクエストの送信に失敗しました。",
    };
  }

  return {
    success: "許願已成功送出。",
    fillAll: "請完整填寫所有欄位。",
    invalidYoutube: "請填寫有效的 YouTube 連結。",
    failed: "送出許願失敗。",
  };
}

export function WishForm({
  dict,
  locale,
}: {
  dict: Dictionary;
  locale: string;
}) {
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");
  const [isPending, startTransition] = useTransition();
  const copy = getWishCopy(locale);

  return (
    <form
      className="glass-panel flex flex-col gap-4 rounded-[32px] border border-border p-6"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);

        startTransition(async () => {
          const artist = String(formData.get("artist") ?? "").trim();
          const title = String(formData.get("title") ?? "").trim();
          const genre = String(formData.get("genre") ?? "").trim();
          const url = String(formData.get("url") ?? "").trim();

          if (!artist || !title || !genre || !url) {
            setMessage(copy.fillAll);
            setMessageTone("error");
            return;
          }

          if (!isValidYoutubeUrl(url)) {
            setMessage(copy.invalidYoutube);
            setMessageTone("error");
            return;
          }

          try {
            await backendService.submitWish({
              artist,
              title,
              genre,
              url,
            });
            setMessage(copy.success);
            setMessageTone("success");
            form.reset();
            window.dispatchEvent(new CustomEvent("nihongotaku:wish-created"));
          } catch (error) {
            setMessage(error instanceof Error ? error.message : copy.failed);
            setMessageTone("error");
          }
        });
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span>{dict.labels.artist}</span>
          <input
            name="artist"
            required
            className="w-full rounded-2xl border border-border bg-surface-strong px-4 py-3 outline-none"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span>{dict.labels.title}</span>
          <input
            name="title"
            required
            className="w-full rounded-2xl border border-border bg-surface-strong px-4 py-3 outline-none"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span>{dict.labels.genre}</span>
          <input
            name="genre"
            required
            className="w-full rounded-2xl border border-border bg-surface-strong px-4 py-3 outline-none"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span>{dict.labels.sourceUrl}</span>
          <input
            name="url"
            type="url"
            required
            className="w-full rounded-2xl border border-border bg-surface-strong px-4 py-3 outline-none"
          />
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
