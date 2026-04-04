declare module 'kuromoji' {
  export interface IpadicFeatures {
    surface_form: string
    pos: string
    pos_detail_1: string
    pos_detail_2: string
    pos_detail_3: string
    conjugated_type: string
    conjugated_form: string
    basic_form: string
    reading: string
    pronunciation: string
    word_type: string
    word_position: number
  }

  export interface Tokenizer<TToken = IpadicFeatures> {
    tokenize(text: string): TToken[]
  }

  export interface BuilderOptions {
    dicPath: string
  }

  export interface Builder<TToken = IpadicFeatures> {
    build(
      callback: (error: Error | null, tokenizer: Tokenizer<TToken>) => void,
    ): void
  }

  export function builder<TToken = IpadicFeatures>(
    options: BuilderOptions,
  ): Builder<TToken>
}
