"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { ArticleEditor } from "@/components/article/article-editor";
import { backendService } from "@/lib/services/backend-service";
import type { Dictionary } from "@/lib/i18n";
import type { ArticleItem } from "@/lib/types";

const emptyDoc: Record<string, unknown> = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

function isValidHttpUrl(value: string) {
  if (!value.trim()) return false;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function AdminArticleForm({
  dict,
  initialArticle,
  mode,
  locale,
}: {
  dict: Dictionary;
  initialArticle?: ArticleItem;
  mode: "create" | "edit";
  locale: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState("");
  const [title, setTitle] = useState(initialArticle?.title ?? "");
  const [type, setType] = useState(initialArticle?.type ?? "");
  const [artist, setArtist] = useState(initialArticle?.artist ?? "");
  const [thumbnailUrl, setThumbnailUrl] = useState(initialArticle?.thumbnailUrl ?? "");
  const [content, setContent] = useState<Record<string, unknown>>(initialArticle?.content ?? emptyDoc);
  const thumbnailPreviewUrl = isValidHttpUrl(thumbnailUrl) ? thumbnailUrl : "";

  const onSubmit = () => {
    startTransition(async () => {
      const payload = { title, type, artist, thumbnailUrl, content };
      const response =
        mode === "create"
          ? await backendService.createArticle(payload)
          : await backendService.updateArticle(initialArticle?.id ?? "unknown", payload);

      setStatus(`${dict.labels.saveDraft} · ${response.id}`);
      if (mode === "create") {
        router.replace(`/${locale}/admin/article/${response.id}`);
      }
    });
  };

  return (
    <div className="glass-panel rounded-[32px] border border-border p-6">
      {thumbnailPreviewUrl ? (
        <div className="mb-6 overflow-hidden rounded-[28px] border border-border bg-surface">
          <div className="border-b border-border px-4 py-3 text-sm font-medium text-muted">
            {dict.labels.thumbnailLabel}
          </div>
          <div className="relative aspect-[16/9] bg-surface-strong">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbnailPreviewUrl}
              alt={`${title || dict.labels.title} preview`}
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span>{dict.labels.title}</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-2xl border border-border bg-surface-strong px-4 py-3 outline-none" />
        </label>
        <label className="space-y-2 text-sm">
          <span>{dict.labels.type}</span>
          <input value={type} onChange={(event) => setType(event.target.value)} className="w-full rounded-2xl border border-border bg-surface-strong px-4 py-3 outline-none" />
        </label>
        <label className="space-y-2 text-sm">
          <span>{dict.labels.artist}</span>
          <input value={artist} onChange={(event) => setArtist(event.target.value)} className="w-full rounded-2xl border border-border bg-surface-strong px-4 py-3 outline-none" />
        </label>
        <label className="space-y-2 text-sm">
          <span>{dict.labels.thumbnailLabel}</span>
          <input
            type="url"
            value={thumbnailUrl}
            onChange={(event) => setThumbnailUrl(event.target.value)}
            placeholder="https://..."
            className="w-full rounded-2xl border border-border bg-surface-strong px-4 py-3 outline-none"
          />
        </label>
      </div>
      <div className="mt-5 space-y-3">
        <h2 className="font-heading text-xl font-bold">{dict.labels.tiptapEditor}</h2>
        <ArticleEditor content={content} onChange={setContent} />
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button type="button" onClick={onSubmit} disabled={isPending} className="rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white disabled:opacity-70">
          {isPending ? "..." : dict.labels.saveDraft}
        </button>
        {status ? <span className="rounded-full bg-brand-soft px-4 py-2 text-sm text-brand-strong">{status}</span> : null}
      </div>
    </div>
  );
}
