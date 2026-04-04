"use client";

import { useState, useTransition } from "react";

import { ArticleEditor } from "@/components/article/article-editor";
import { backendService } from "@/lib/services/backend-service";
import type { Dictionary } from "@/lib/i18n";
import type { ArticleItem } from "@/lib/types";

const emptyDoc: Record<string, unknown> = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

export function AdminArticleForm({
  dict,
  initialArticle,
  mode,
}: {
  dict: Dictionary;
  initialArticle?: ArticleItem;
  mode: "create" | "edit";
}) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState("");
  const [title, setTitle] = useState(initialArticle?.title ?? "");
  const [type, setType] = useState(initialArticle?.type ?? "");
  const [artist, setArtist] = useState(initialArticle?.artist ?? "");
  const [thumbnailLabel, setThumbnailLabel] = useState(initialArticle?.thumbnailLabel ?? "Thumbnail label");
  const [content, setContent] = useState<Record<string, unknown>>(initialArticle?.content ?? emptyDoc);

  const onSubmit = () => {
    startTransition(async () => {
      const payload = { title, type, artist, thumbnailLabel, content };
      const response =
        mode === "create"
          ? await backendService.createArticle(payload)
          : await backendService.updateArticle(initialArticle?.id ?? "unknown", payload);

      setStatus(`Saved ${response.id} for ${payload.artist}.`);
    });
  };

  return (
    <div className="glass-panel rounded-[32px] border border-border p-6">
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
          <span>Thumbnail label</span>
          <input value={thumbnailLabel} onChange={(event) => setThumbnailLabel(event.target.value)} className="w-full rounded-2xl border border-border bg-surface-strong px-4 py-3 outline-none" />
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
