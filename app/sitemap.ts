import type { MetadataRoute } from 'next'

import { locales } from '@/lib/i18n'
import { backendService } from '@/lib/services/backend-service'
import { buildAbsoluteUrl, getMusicPath } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const staticRoutes = locales.flatMap((locale) => [
    {
      url: buildAbsoluteUrl(`/${locale}/home`),
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: locale === 'zh' ? 1 : 0.8,
    },
    {
      url: buildAbsoluteUrl(`/${locale}/music`),
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: locale === 'zh' ? 0.95 : 0.75,
    },
    {
      url: buildAbsoluteUrl(`/${locale}/article`),
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.55,
    },
  ])

  const music = await backendService.searchMusic()
  const musicRoutes = music.flatMap((item) =>
    locales.map((locale) => ({
      url: buildAbsoluteUrl(getMusicPath(locale, item.id)),
      lastModified: item.createdAt ? new Date(item.createdAt) : now,
      changeFrequency: 'weekly' as const,
      priority: locale === 'zh' ? 0.9 : 0.7,
      images: item.youtubeId
        ? [`https://img.youtube.com/vi/${item.youtubeId}/hqdefault.jpg`]
        : undefined,
      alternates: {
        languages: {
          ja: buildAbsoluteUrl(getMusicPath('ja', item.id)),
          en: buildAbsoluteUrl(getMusicPath('en', item.id)),
          'zh-TW': buildAbsoluteUrl(getMusicPath('zh', item.id)),
        },
      },
    })),
  )

  return [...staticRoutes, ...musicRoutes]
}
