// types/index.ts
export interface IchiMoeProcessedWord {
  originalText: string
  surfaceForm: string[]
  separatedForm: (string | string[])[]
  baseForm: (string | string[] | null)[]
}

export interface IchiMoeParseResult {
  surfaceForms: string[]
  separatedForms: (string | string[])[]
  baseForms: (string | string[])[]
}

export interface JpdbVocabulary {
  word: string // The actual word as it appears in text
  vid: number
  sid: number
  rid: number
  spelling: string
  reading: string
  frequency: number
  meanings: string[]
  pos: string[]
  cardState: string | null
  position: number
  length: number
}

export interface ProcessedSubtitle {
  originalText: string
  morphemes: IchiMoeProcessedWord
  vocabulary: JpdbVocabulary[]
}

export interface BatchProcessingResult {
  segmentation: IchiMoeProcessedWord[]
  vocabulary: ProcessedSubtitle[]
}

export interface ChromeMessage<T = any> {
  success: boolean
  data?: T
  error?: string
}
