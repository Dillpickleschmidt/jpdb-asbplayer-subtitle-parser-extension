// Shared Types
export interface SegmentedWords {
  originalText: string // The original input text
  surfaceForms: string[] // Detected surface forms
  separatedForms: (string | string[])[] // Separated components
  baseForms: (string | string[] | null)[] // Base or dictionary forms
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
  cardState: string | null
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
export interface JpdbToken {
  vocabularyIndex: number
  position: number
  length: number
  furigana?: (string | string[])[]
}

export interface JpdbBatchProcessingResult {
  tokens: JpdbToken[][]
  vocabulary: VocabularyEntry[]
}
