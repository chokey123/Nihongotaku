import type { AIMusicVocabSuggestion, LyricLine } from '@/lib/types'

export class AIService {
  async getMusicVocabsFromLyrics(
    lyrics: LyricLine[],
  ): Promise<AIMusicVocabSuggestion[]> {
    const response = await fetch('/api/ai/music-vocab', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lyrics: lyrics.map((line) => ({
          lineId: line.id,
          japanese: line.japanese,
        })),
      }),
    })

    const payload = (await response.json().catch(() => null)) as
      | { suggestions?: AIMusicVocabSuggestion[]; error?: string }
      | null

    if (!response.ok) {
      throw new Error(payload?.error ?? 'Failed to get vocab from AI.')
    }

    return payload?.suggestions ?? []
  }
}

export const aiService = new AIService()
