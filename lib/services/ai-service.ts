import { supabase } from '@/lib/supabase/client'
import type {
  AIMusicVocabQuota,
  AIMusicVocabSuggestion,
  LyricLine,
} from '@/lib/types'

interface AIMusicVocabResult {
  quota: AIMusicVocabQuota | null
  suggestions: AIMusicVocabSuggestion[]
}

async function buildAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const accessToken = session?.access_token

  if (!accessToken) {
    return {}
  }

  return {
    Authorization: `Bearer ${accessToken}`,
  }
}

export class AIService {
  async getMusicVocabQuota(): Promise<AIMusicVocabQuota> {
    const response = await fetch('/api/ai/music-vocab', {
      method: 'GET',
      headers: {
        ...(await buildAuthHeaders()),
      },
    })

    const payload = (await response.json().catch(() => null)) as
      | { quota?: AIMusicVocabQuota; error?: string }
      | null

    if (!response.ok) {
      throw new Error(payload?.error ?? 'Failed to get AI vocab quota.')
    }

    return (
      payload?.quota ?? {
        limit: 5,
        used: 0,
        remaining: 5,
        isAdmin: false,
      }
    )
  }

  async getMusicVocabsFromLyrics(
    lyrics: LyricLine[],
  ): Promise<AIMusicVocabResult> {
    const response = await fetch('/api/ai/music-vocab', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(await buildAuthHeaders()),
      },
      body: JSON.stringify({
        lyrics: lyrics.map((line) => ({
          lineId: line.id,
          japanese: line.japanese,
        })),
      }),
    })

    const payload = (await response.json().catch(() => null)) as
      | {
          suggestions?: AIMusicVocabSuggestion[]
          quota?: AIMusicVocabQuota
          error?: string
        }
      | null

    if (!response.ok) {
      throw new Error(payload?.error ?? 'Failed to get vocab from AI.')
    }

    return {
      suggestions: payload?.suggestions ?? [],
      quota: payload?.quota ?? null,
    }
  }
}

export const aiService = new AIService()
