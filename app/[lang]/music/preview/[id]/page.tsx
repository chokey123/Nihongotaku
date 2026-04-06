import { MusicPreviewShell } from '@/components/music/music-preview-shell'
import { getDictionary } from '@/lib/i18n'
import type { Locale } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function MusicPreviewPage({
  params,
}: PageProps<'/[lang]/music/preview/[id]'>) {
  const { lang, id } = await params
  const dict = await getDictionary(lang)

  return (
    <div className="pb-10">
      <MusicPreviewShell id={id} dict={dict} locale={lang as Locale} />
    </div>
  )
}
