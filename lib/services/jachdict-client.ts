'use client'

export interface JachDictEntry {
  meaning: string
  reading: string
}

export interface JachDictMaps {
  byKey: Map<string, JachDictEntry>
  byReading: Map<string, JachDictEntry>
}

let dictionaryPromise: Promise<JachDictMaps> | null = null

function normalizeKey(value: string) {
  return value.trim()
}

function normalizeLookupKey(value: string) {
  return value
    .trim()
    .replace(/\s+/g, '')
    .replace(/[［\[].*?[］\]]/g, '')
    .replace(/[（(][^（）()]*[)）]/g, '')
}

function extractMeaning(rawValue: string) {
  const trimmed = rawValue.trim()
  const closingIndex = trimmed.search(/[)）]/)

  return closingIndex >= 0 ? trimmed.slice(closingIndex + 1).trim() : trimmed
}

function extractReading(rawValue: string) {
  const matched = rawValue.match(/[（(]([^（）()]*)[)）]/)
  return matched?.[1]?.trim() ?? ''
}

function buildKeyVariants(rawKey: string) {
  const base = normalizeKey(rawKey)
  const variants = new Set<string>()

  const pushVariant = (value: string) => {
    const normalized = normalizeLookupKey(value)
    if (normalized) {
      variants.add(normalized)
    }
  }

  pushVariant(base)

  const withoutBracketNotes = base.replace(/[［\[].*?[］\]]/g, '')
  pushVariant(withoutBracketNotes)

  const withoutParenGroups = withoutBracketNotes.replace(/[（(][^（）()]*[)）]/g, '')
  pushVariant(withoutParenGroups)

  const plainJapaneseSegments = withoutBracketNotes.match(
    /[\p{sc=Hiragana}\p{sc=Katakana}\p{sc=Han}ー]+/gu,
  )

  plainJapaneseSegments?.forEach((segment) => {
    pushVariant(segment)
  })

  return [...variants]
}

function toHiragana(value: string) {
  return value.replace(/[\u30a1-\u30f6]/g, (character) =>
    String.fromCharCode(character.charCodeAt(0) - 0x60),
  )
}

export async function loadJachDictionary() {
  if (dictionaryPromise) {
    return dictionaryPromise
  }

  dictionaryPromise = fetch('/json/jachdict.json')
    .then(async (response) => {
      if (!response.ok) {
        throw new Error('Failed to load jachdict.json')
      }

      return (await response.json()) as Record<string, string>
    })
    .then((rows) => {
      const byKey = new Map<string, JachDictEntry>()
      const byReading = new Map<string, JachDictEntry>()

      for (const [rawKey, rawValue] of Object.entries(rows)) {
        const key = normalizeKey(rawKey)
        const meaning = extractMeaning(rawValue)
        const reading = toHiragana(extractReading(rawValue))
        const entry = {
          meaning,
          reading,
        }

        buildKeyVariants(key).forEach((variant) => {
          if (!byKey.has(variant)) {
            byKey.set(variant, entry)
          }
        })

        if (reading) {
          if (!byReading.has(reading)) {
            byReading.set(reading, entry)
          }
        }
      }

      return {
        byKey,
        byReading,
      }
    })

  return dictionaryPromise
}

export function lookupJachDictionary(
  maps: JachDictMaps | null,
  basicForm: string,
  reading = '',
) {
  if (!maps) {
    return null
  }

  const normalizedBasicForm = normalizeLookupKey(basicForm)
  const normalizedReading = toHiragana(reading.trim())

  return (
    maps.byKey.get(normalizedBasicForm) ??
    (normalizedReading ? maps.byReading.get(normalizedReading) : undefined) ??
    null
  )
}

export function normalizeJapaneseReading(value: string) {
  return toHiragana(value.trim())
}
