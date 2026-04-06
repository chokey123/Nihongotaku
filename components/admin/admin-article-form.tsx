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

function getArticleActionLabels(locale: string) {
  if (locale === "en") {
    return {
      draftSaved: "Draft saved",
      published: "Published",
      unpublished: "Unpublished",
      publish: "Publish",
      unpublish: "Unpublish",
      publishedState: "Published",
      draftState: "Draft",
      saveFailed: "Save failed",
    };
  }

  if (locale === "ja") {
    return {
      draftSaved: "下書きを保存しました",
      published: "公開しました",
      unpublished: "公開を取り下げました",
      publish: "公開",
      unpublish: "公開取り下げ",
      publishedState: "公開中",
      draftState: "下書き",
      saveFailed: "保存に失敗しました",
    };
  }

  return {
    draftSaved: "草稿已保存",
    published: "已發布",
    unpublished: "已撤下發布",
    publish: "發布",
    unpublish: "撤下發布",
    publishedState: "已發布",
    draftState: "草稿",
    saveFailed: "保存失敗",
  };
}

export function AdminArticleForm({
  dict,
  initialArticle,
  mode,
  locale,
  basePath = "admin",
  canPublish = true,
}: {
  dict: Dictionary;
  initialArticle?: ArticleItem;
  mode: "create" | "edit";
  locale: string;
  basePath?: "admin" | "upload";
  canPublish?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState("");
  const [submitAction, setSubmitAction] = useState<"draft" | "publish" | "unpublish" | null>(null);
  const [title, setTitle] = useState(initialArticle?.title ?? "");
  const [type, setType] = useState(initialArticle?.type ?? "");
  const [artist, setArtist] = useState(initialArticle?.artist ?? "");
  const [thumbnailUrl, setThumbnailUrl] = useState(initialArticle?.thumbnailUrl ?? "");
  const [content, setContent] = useState<Record<string, unknown>>(initialArticle?.content ?? emptyDoc);
  const [isPublished, setIsPublished] = useState(initialArticle?.isPublished ?? false);
  const thumbnailPreviewUrl = isValidHttpUrl(thumbnailUrl) ? thumbnailUrl : "";
  const actionLabels = getArticleActionLabels(locale);

  const persistArticle = (
    nextPublished: boolean,
    action: "draft" | "publish" | "unpublish",
  ) => {
    setSubmitAction(action);

    startTransition(async () => {
      try {
        const payload = { title, type, artist, thumbnailUrl, content };
        const response =
          mode === "create"
            ? await backendService.createArticle(payload, {
                isPublished: nextPublished,
              })
            : await backendService.updateArticle(
                initialArticle?.id ?? "unknown",
                payload,
                {
                  isPublished: nextPublished,
                },
              );

        setIsPublished(nextPublished);
        setStatus(
          action === "publish"
            ? `${actionLabels.published} · ${response.id}`
            : action === "unpublish"
              ? `${actionLabels.unpublished} · ${response.id}`
              : `${actionLabels.draftSaved} · ${response.id}`,
        );

        if (mode === "create") {
          router.replace(
            action === "publish"
              ? `/${locale}/article/${response.id}`
              : `/${locale}/${basePath}/article/${response.id}`,
          );
          return;
        }

        if (action === "publish") {
          router.replace(`/${locale}/article/${response.id}`);
        }
      } catch (error) {
        setStatus(
          `${actionLabels.saveFailed}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        );
      } finally {
        setSubmitAction(null);
      }
    });
  };

  return (
    <div className="glass-panel rounded-[32px] border border-border p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl font-bold">{title || dict.labels.title}</h2>
          <p className="mt-1 text-sm text-muted">{artist || dict.labels.artist}</p>
        </div>
        <span className="rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-muted dark:bg-white">
          {isPublished ? actionLabels.publishedState : actionLabels.draftState}
        </span>
      </div>

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
        <button
          type="button"
          onClick={() => persistArticle(isPublished, "draft")}
          disabled={isPending}
          className="rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white disabled:opacity-70"
        >
          {isPending && submitAction === "draft" ? "..." : dict.labels.saveDraft}
        </button>
        {canPublish ? (
          <button
            type="button"
            onClick={() =>
              persistArticle(!isPublished, isPublished ? "unpublish" : "publish")
            }
            disabled={isPending}
            className="rounded-full border border-border bg-white px-5 py-3 text-sm font-semibold text-foreground transition hover:border-brand disabled:opacity-70 dark:bg-white"
          >
            {isPending && submitAction !== "draft"
              ? "..."
              : isPublished
                ? actionLabels.unpublish
                : actionLabels.publish}
          </button>
        ) : null}
        {status ? <span className="rounded-full bg-brand-soft px-4 py-2 text-sm text-brand-strong">{status}</span> : null}
      </div>
    </div>
  );
}
