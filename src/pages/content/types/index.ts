// Raw JPDB API types (array format)
type RawJpdbVocabularyArray = [
  vid: number,
  sid: number,
  rid: number,
  spelling: string,
  reading: string,
  frequencyRank: number,
  meanings: string[],
  cardState: string[] | null,
  partOfSpeech: string[],
]

export type RawJpdbUserDecksResponse = {
  decks: [
    [
      // Array of arrays
      id: number,
      name: string,
      word_count: number,
      vocabulary_known_coverage: number,
      vocabulary_in_progress_coverage: number,
      is_built_in: boolean,
    ],
  ]
}

type RawJpdbToken = [
  vocabularyIndex: number,
  position: number,
  length: number,
  furigana?: (string | string[])[] | null,
]

// Mapped object types
export interface JpdbToken {
  vocabularyIndex: number
  position: number
  length: number
  furigana?: (string | string[])[] | null
}

export interface JpdbVocabulary {
  vid: number
  sid: number
  rid: number
  spelling: string
  reading: string
  frequencyRank: number
  meanings: string[]
  cardState: string[] | null
  partOfSpeech: string[]
}

export interface VocabularyEntry extends JpdbVocabulary {
  position: number
  length: number
}

export interface ProcessedSubtitle {
  originalText: string
  vocabulary: VocabularyEntry[]
}

// API response types
export interface RawJpdbBatchProcessingResult {
  tokens: RawJpdbToken[][]
  vocabulary: RawJpdbVocabularyArray[]
}

export interface JpdbBatchProcessingResult {
  tokens: JpdbToken[][]
  vocabulary: JpdbVocabulary[]
}

// Chrome Messaging Types
export interface ChromeMessage<T = any> {
  success: boolean
  data?: T
  error?: string
}
