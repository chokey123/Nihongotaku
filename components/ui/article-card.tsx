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
      className="glass-panel group flex flex-col overflow-hidden rounded-[28px] border border-border transition hover:-translate-y-1 hover:border-brand"
    >
      <div className="relative h-48 overflow-hidden">
        {item.thumbnailUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.thumbnailUrl}
              alt={item.title}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-transparent" />
          </>
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${item.palette.from}, ${item.palette.to})`,
            }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.35),transparent_28%)]" />
          </div>
        )}
      </div>
      <div className="space-y-2 p-4">
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
