import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { GoogleGenAI } from '@google/genai'

import type { AIMusicVocabQuota, AIMusicVocabSuggestion } from '@/lib/types'

const GEMINI_MODEL = 'gemini-2.5-flash-lite'
const DAILY_LIMIT = 5

interface AiMusicVocabDailyUsageRow {
  id: string
  usage_count: number
}

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

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!url || !publishableKey) {
    return null
  }

  return { url, publishableKey }
}

function getTodayUtc() {
  return new Date().toISOString().slice(0, 10)
}

function buildPrompt(lyrics: Array<{ lineId: string; japanese: string }>) {
  return JSON.stringify({
    task: 'Generate vocabulary & grammar introduction from Japanese song lyrics.',
    requirements: [
      'For each lyric line, always find 1 to 3 vocab that is worth learning.',
      'Return vocab grouped by the original lineId.',
      'For verb, transform to original surface form if appropriate',
      'For any vocab do not simply copy from original lyics.',
      'If appropriate, also pick grammar and fit in the higrana as furigana, example and exampleTranslationZh.',
      'For example of grammar, In case of 教えてほしい, 教える should be the verb, ～てほしい should be the grammar to introduce.',
      'furigana must be accurate and readable in hiragana.',
      'difficulty must be exactly one of: beginner, intermediate, hard.',
      'example must be a natural Japanese sentence that is good for learning.',
      'exampleTranslationZh must be exact translation of example in natural Traditional Chinese.',
      'meaningZh must be concise Traditional Chinese.',
      'Only return items for lines that have meaningful Japanese text.',
      'Do not include duplicate vocab in exact same line of lyrics.',
      'If there is multiple line with same lyrics can have same vocab output.',
      'Do not hesitate to generate as many vocab & grammar to learn as possible.',
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

function buildQuota(used: number, isAdmin: boolean): AIMusicVocabQuota {
  if (isAdmin) {
    return {
      limit: null,
      used,
      remaining: null,
      isAdmin: true,
    }
  }

  return {
    limit: DAILY_LIMIT,
    used,
    remaining: Math.max(0, DAILY_LIMIT - used),
    isAdmin: false,
  }
}

async function getAuthorizedSupabase(request: Request) {
  const config = getSupabaseConfig()
  const authorization = request.headers.get('authorization')
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length).trim()
    : ''

  if (!config || !token) {
    return null
  }

  const supabase = createClient(config.url, config.publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  })

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token)

  if (error || !user) {
    return null
  }

  const { data: profile } = await supabase
    .from('user_profile')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  return {
    supabase,
    userId: user.id,
    isAdmin: profile?.role === 'admin',
  }
}

async function getUsageCount(supabase: SupabaseClient, userId: string) {
  const usageDate = getTodayUtc()
  const usageTable = supabase.from('ai_music_vocab_daily_usage')
  const { data, error } = (await usageTable
    .select('id, usage_count')
    .eq('user_id', userId)
    .eq('usage_date', usageDate)
    .maybeSingle()) as {
    data: AiMusicVocabDailyUsageRow | null
    error: { message: string } | null
  }

  if (error) {
    throw new Error(error.message)
  }

  return {
    usageDate,
    rowId: data?.id ?? null,
    used: data?.usage_count ?? 0,
  }
}

async function incrementUsageCount(
  supabase: SupabaseClient,
  userId: string,
  current: { usageDate: string; rowId: string | null; used: number },
) {
  const nextCount = current.used + 1
  const usageTable = supabase.from('ai_music_vocab_daily_usage')

  if (current.rowId) {
    const { error } = await usageTable
      .update({
        usage_count: nextCount,
        updated_by: userId,
      })
      .eq('id', current.rowId)

    if (error) {
      throw new Error(error.message)
    }

    return nextCount
  }

  const { error } = await usageTable.insert({
    user_id: userId,
    usage_date: current.usageDate,
    usage_count: nextCount,
    created_by: userId,
    updated_by: userId,
  })

  if (error) {
    throw new Error(error.message)
  }

  return nextCount
}

export async function GET(request: Request) {
  const authorized = await getAuthorizedSupabase(request)

  if (!authorized) {
    return Response.json(
      { error: 'Please sign in to use AI vocab generation.' },
      { status: 401 },
    )
  }

  const usage = await getUsageCount(authorized.supabase, authorized.userId)

  return Response.json({
    quota: buildQuota(usage.used, authorized.isAdmin),
  })
}

export async function POST(request: Request) {
  const apiKey = getApiKey()

  if (!apiKey) {
    return Response.json({ error: 'Missing Gemini API key.' }, { status: 500 })
  }

  const authorized = await getAuthorizedSupabase(request)

  if (!authorized) {
    return Response.json(
      { error: 'Please sign in to use AI vocab generation.' },
      { status: 401 },
    )
  }

  const usage = await getUsageCount(authorized.supabase, authorized.userId)

  if (!authorized.isAdmin && usage.used >= DAILY_LIMIT) {
    return Response.json(
      {
        error: 'Daily AI vocab limit reached. Please try again tomorrow.',
        quota: buildQuota(usage.used, false),
      },
      { status: 429 },
    )
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
    return Response.json({
      suggestions: [],
      quota: buildQuota(usage.used, authorized.isAdmin),
    })
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

    const nextUsed = authorized.isAdmin
      ? usage.used
      : await incrementUsageCount(authorized.supabase, authorized.userId, usage)

    return Response.json({
      suggestions,
      quota: buildQuota(nextUsed, authorized.isAdmin),
    })
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
