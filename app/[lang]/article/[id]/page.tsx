import { notFound } from "next/navigation";

import { ReadonlyEditor } from "@/components/article/readonly-editor";
import { ArticleYouTubeReader } from "@/components/article/article-youtube-reader";
import { backendService } from "@/lib/services/backend-service";

export const dynamic = "force-dynamic";

export default async function ArticleDetailPage({
  params,
}: PageProps<"/[lang]/article/[id]">) {
  const { lang, id } = await params;
  const article = await backendService.getArticleById(id);
  const contentLabel =
    lang === "en" ? "Content" : lang === "ja" ? "内容" : "內容";
  const readerLabels =
    lang === "en"
      ? {
          videoTitle: "YouTube music video",
          timestampHint: "Select a timestamp in the article to jump to that moment in the video.",
          nowPlaying: "Jumped to",
        }
      : lang === "ja"
        ? {
            videoTitle: "YouTube ミュージックビデオ",
            timestampHint: "記事内の時刻を選ぶと、動画のその位置から再生します。",
            nowPlaying: "再生位置",
          }
        : {
            videoTitle: "YouTube 音樂影片",
            timestampHint: "點擊文章中的時間碼，即可跳到影片的對應位置播放。",
            nowPlaying: "已跳至",
          };

  if (!article) notFound();

  return (
    <article className="space-y-6 pb-10">
      <div className="glass-panel overflow-hidden rounded-[36px] border border-border">
        <div className="relative aspect-[16/9] bg-surface">
          {article.thumbnailUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={article.thumbnailUrl}
                alt={article.title}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />
            </>
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(135deg, ${article.palette.from}, ${article.palette.to})`,
              }}
            />
          )}
        </div>
        <div className="p-8">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted">
            <span className="rounded-full bg-brand-soft px-3 py-1 font-semibold text-brand-strong">
              {article.type}
            </span>
            <span>{article.artist}</span>
          </div>
          <h1 className="font-heading text-4xl font-bold tracking-tight">
            {article.title}
          </h1>
          <p className="mt-3 text-muted">{article.excerpt}</p>
        </div>
      </div>
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-heading text-2xl font-bold">{contentLabel}</h2>
          <span className="text-sm text-muted">{article.artist}</span>
        </div>
        {article.youtubeVideoId ? (
          <ArticleYouTubeReader
            content={article.content}
            title={article.title}
            videoId={article.youtubeVideoId}
            labels={readerLabels}
          />
        ) : (
          <ReadonlyEditor content={article.content} />
        )}
      </section>
    </article>
  );
}
