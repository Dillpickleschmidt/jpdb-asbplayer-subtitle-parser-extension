// types/index.ts

export interface SegmentedWords {
  originalText: string // The original input text
  surfaceForms: string[] // Detected surface forms
  separatedForms: (string | string[])[] // Separated components
  baseForms: (string | string[] | null)[] // Base or dictionary forms
  cardStates: Array<string | null> // The card state of the base forms
}

export interface VocabularyEntry {
  word: string // Original word
  vid: number
  sid: number
  rid: number
  spelling: string
  reading: string
  frequencyRank: number
  meanings: string[]
  partOfSpeech: string[]
  cardState: Array<string> | null
  position: number
  length: number
}

// Morpheme Parsing Result
export interface MorphemeParseResult {
  morphemes: SegmentedWords[]
}

// Processed Subtitle Entry
export interface ProcessedSubtitle {
  originalText: string
  morphemes: SegmentedWords
  vocabulary: VocabularyEntry[]
}

export interface baseFormStates {
  baseWord: string
  jpdbBaseWord: string
  state: string[]
}

// Batch Processing Results
export interface BatchProcessingResult {
  segmentation: SegmentedWords[]
  vocabulary: ProcessedSubtitle[]
}

// Chrome Messaging Types
export interface ChromeMessage<T = any> {
  success: boolean
  data?: T
  error?: string
}

// JPDB API Types
export type JpdbToken = [
  vocabularyIndex: number,
  position: number,
  length: number,
  furigana?: (string | string[])[] | null,
]

export interface JpdbBatchProcessingResult {
  tokens: JpdbToken[][]
  vocabulary: VocabularyEntry[]
}

export interface JpdbFetchCardStateResult {
  tokens: number[][]
  vocabulary: Array<Array<string | Array<string>>>
}
