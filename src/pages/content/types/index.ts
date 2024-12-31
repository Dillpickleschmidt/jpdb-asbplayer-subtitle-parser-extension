export interface WordInfo {
  word: string
  rootWord: string
  pos: string[]
  cardState: string[] | null
}

export interface EnrichedWord {
  word: string
  rootWord: string
  pos: string[]
  cardState: string[] | null
}

export interface ParsedResults {
  unmodifiedWords: string[]
  separatedCompounds: (string | string[])[]
  rootWords: (string | string[])[]
}

export interface JpdbVocabEntry {
  0: string // word
  1: string[] // part of speech array
  2: string[] | null // card state
}

export interface JpdbResponse {
  vocabulary: JpdbVocabEntry[]
  tokens: any[] // Add more specific typing if needed
}

export interface StorageData {
  jpdbApiKey: string
}
