import Link from "next/link";

import type { ArticleItem } from "@/lib/types";

export function ArticleCard({
  item,
  locale,
}: {
  item: ArticleItem;
  locale: string;
}) {
  return (
    <Link
      href={`/${locale}/article/${item.id}`}
      className="glass-panel group flex flex-col gap-4 rounded-[28px] border border-border p-4 transition hover:-translate-y-1 hover:border-brand"
    >
      <div
        className="relative h-44 overflow-hidden rounded-[22px]"
        style={{
          background: `linear-gradient(135deg, ${item.palette.from}, ${item.palette.to})`,
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.35),transparent_28%)]" />
        <div className="absolute bottom-4 left-4 rounded-full bg-white/26 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
          {item.thumbnailLabel}
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted">
          <span className="rounded-full bg-brand-soft px-3 py-1 font-semibold text-brand-strong">
            {item.type}
          </span>
          <span>{item.artist}</span>
        </div>
        <h3 className="font-heading text-xl font-bold tracking-tight">{item.title}</h3>
        <p className="line-clamp-2 text-sm text-muted">{item.excerpt}</p>
      </div>
    </Link>
  );
}
