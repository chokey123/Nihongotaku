import type { MusicDraftPayload, MusicItem } from '@/lib/types'

export function buildMusicDraftPayloadFromItem(
  item: MusicItem,
  overrides?: Partial<MusicDraftPayload>,
): MusicDraftPayload {
  return {
    sourceUrl: item.sourceUrl ?? `https://youtube.com/watch?v=${item.youtubeId}`,
    title: item.title,
    artist: item.artist,
    genre: item.genre,
    lyrics: item.lyrics,
    vocab: item.vocab,
    quizVocabKeys: item.quizVocabKeys,
    submissionSource: item.submissionSource,
    reviewRequestedAt: item.reviewRequestedAt ?? null,
    lyricsSourceText: item.lyricsSourceText ?? null,
    lyricsSourceUrl: item.lyricsSourceUrl ?? null,
    ...overrides,
  }
}
