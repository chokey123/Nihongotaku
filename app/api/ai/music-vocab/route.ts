import { GoogleGenAI } from '@google/genai'

import type { AIMusicVocabSuggestion } from '@/lib/types'

const GEMINI_MODEL = 'gemini-2.5-flash-lite'

const responseJsonSchema = {
  type: 'object',
  properties: {
    suggestions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          lineId: { type: 'string' },
          word: { type: 'string' },
          furigana: { type: 'string' },
          difficulty: {
            type: 'string',
            enum: ['beginner', 'intermediate', 'hard'],
          },
          meaningZh: { type: 'string' },
          example: { type: 'string' },
          exampleTranslationZh: { type: 'string' },
        },
        required: [
          'lineId',
          'word',
          'furigana',
          'difficulty',
          'meaningZh',
          'example',
          'exampleTranslationZh',
        ],
      },
    },
  },
  required: ['suggestions'],
} as const

function getApiKey() {
  return (
    process.env.GEMINI_API_KEY ??
    process.env.GOOGLE_API_KEY ??
    process.env.GOOGLE_GENAI_API_KEY ??
    null
  )
}

function buildPrompt(lyrics: Array<{ lineId: string; japanese: string }>) {
  return JSON.stringify({
    task: 'Generate vocabulary suggestions for Japanese song lyrics.',
    requirements: [
      'For each lyric line, find 0 to 3 vocab that is worth learning.',
      'Return vocab grouped by the original lineId.',
      'For verb, transform to original surface form if appropriate, do not just always simply copy from original lyics.',
      'If appropriate, also pick grammar and fit in the higrana as furigana, example and exampleTranslationZh.',
      'furigana must be accurate and readable in hiragana.',
      'difficulty must be exactly one of: beginner, intermediate, hard.',
      'Use intermediate as the default when uncertain.',
      'example must be a natural Japanese sentence that is good for learning.',
      'exampleTranslationZh must be exact translation of example in natural Traditional Chinese.',
      'meaningZh must be concise Traditional Chinese.',
      'Only return items for lines that have meaningful Japanese text.',
      'Do not include duplicate vocab unless there are duplicate lyrics.',
      'If there is multiple line with same lyrics (e.g. chorus) can have same output.',
      'Depend on the length of the song, keep the total return of the vocab around 50 or lesser if possible, pick quality vocab as priority.',
      'Return valid JSON only.',
    ],
    lyrics,
  })
}

function normalizeSuggestion(
  suggestion: AIMusicVocabSuggestion,
): AIMusicVocabSuggestion | null {
  const normalized = {
    lineId: suggestion.lineId?.trim() ?? '',
    word: suggestion.word?.trim() ?? '',
    furigana: suggestion.furigana?.trim() ?? '',
    difficulty:
      suggestion.difficulty === 'beginner' ||
      suggestion.difficulty === 'intermediate' ||
      suggestion.difficulty === 'hard'
        ? suggestion.difficulty
        : 'intermediate',
    meaningZh: suggestion.meaningZh?.trim() ?? '',
    example: suggestion.example?.trim() ?? '',
    exampleTranslationZh: suggestion.exampleTranslationZh?.trim() ?? '',
  }

  if (
    !normalized.lineId ||
    !normalized.word ||
    !normalized.furigana ||
    !normalized.meaningZh
  ) {
    return null
  }

  return normalized
}

export async function POST(request: Request) {
  const apiKey = getApiKey()

  if (!apiKey) {
    return Response.json({ error: 'Missing Gemini API key.' }, { status: 500 })
  }

  const body = (await request.json().catch(() => null)) as {
    lyrics?: Array<{ lineId?: string; japanese?: string }>
  } | null

  const lyrics = (body?.lyrics ?? [])
    .map((line) => ({
      lineId: line.lineId?.trim() ?? '',
      japanese: line.japanese?.trim() ?? '',
    }))
    .filter((line) => line.lineId && line.japanese)

  if (lyrics.length === 0) {
    return Response.json({ suggestions: [] })
  }

  try {
    const ai = new GoogleGenAI({ apiKey })
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: buildPrompt(lyrics),
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema,
      },
    })

    const parsed = JSON.parse(response.text ?? '{}') as {
      suggestions?: AIMusicVocabSuggestion[]
    }

    const validLineIds = new Set(lyrics.map((line) => line.lineId))
    const suggestions = (parsed.suggestions ?? [])
      .map((suggestion) => normalizeSuggestion(suggestion))
      .filter((suggestion): suggestion is AIMusicVocabSuggestion =>
        Boolean(suggestion),
      )
      .filter((suggestion) => validLineIds.has(suggestion.lineId))

    return Response.json({ suggestions })
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to generate vocab suggestions.',
      },
      { status: 500 },
    )
  }
}
