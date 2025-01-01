// subtitle-processor.ts
import {
  BatchProcessingResult,
  IchiMoeParseResult,
  JpdbVocabulary,
  ProcessedSubtitle,
} from "../types"
import { parseIchiMoe } from "./ichi-moe-parser"

const MAX_GROUP_SIZE = 400
const WINDOW_SIZE = 6

export class SubtitleProcessor {
  private subtitles: string[]
  private groups: string[][]
  private processedGroups: Map<
    number,
    { segmentation: ProcessedSubtitle[]; vocabulary: ProcessedSubtitle[] }
  >
  private processedResults: Map<string, BatchProcessingResult>
  private lastProcessedText: string

  constructor(elements: HTMLElement[]) {
    this.subtitles = elements
      .map((el) => el.textContent?.trim())
      .filter((text): text is string => Boolean(text))

    this.groups = this.createGroups()
    this.processedGroups = new Map()
    this.processedResults = new Map()
    this.lastProcessedText = ""

    console.log(
      `Initialized processor with ${this.subtitles.length} subtitles in ${this.groups.length} groups`
    )
  }

  private createGroups(): string[][] {
    return this.subtitles.reduce<string[][]>((groups, subtitle) => {
      const currentGroup = groups[groups.length - 1] || []
      const newSize = currentGroup.length
        ? currentGroup.join(" ").length + 1 + subtitle.length
        : subtitle.length

      if (newSize > MAX_GROUP_SIZE && currentGroup.length > 0) {
        return [...groups, [subtitle]]
      }

      if (groups.length === 0) {
        return [[subtitle]]
      }

      groups[groups.length - 1] = [...currentGroup, subtitle]
      return groups
    }, [])
  }

  async processSubtitleWindow(
    text: string
  ): Promise<BatchProcessingResult | null> {
    // Check if this subtitle has already been processed
    if (this.processedResults.has(text)) {
      console.log("Skipping already processed subtitle:", text)
      return this.processedResults.get(text) || null
    }

    const groupIndex = this.groups.findIndex((group) => group.includes(text))
    if (groupIndex === -1) {
      console.log("Current subtitle not found in any group:", text)
      return null
    }

    console.log(`Found subtitle in group ${groupIndex}`)
    const result = await this.processGroupWindow(groupIndex)
    if (result) {
      this.processedResults.set(text, result)
    }

    this.lastProcessedText = text
    return result
  }

  /** Generates a sequence of group indices that expands outward from the current group,
   * moving forward twice for each backward step */
  private generateProcessingSequence(
    groupIndex: number,
    totalGroups: number,
    windowSize: number
  ): number[] {
    const sequence: number[] = [groupIndex] // Always start with current group
    let forward = groupIndex + 1
    let backward = groupIndex - 1
    let count = 1

    while (sequence.length < windowSize) {
      // Add two forward steps
      for (let i = 0; i < 2 && sequence.length < windowSize; i++) {
        if (forward < totalGroups) {
          sequence.push(forward++)
        }
      }

      // Add one backward step
      if (sequence.length < windowSize && backward >= 0) {
        sequence.push(backward--)
      }

      // Break if we can't add any more groups
      if (forward >= totalGroups && backward < 0) break
    }

    return sequence
  }

  private async processGroupWindow(
    groupIndex: number
  ): Promise<BatchProcessingResult> {
    const processingSequence = this.generateProcessingSequence(
      groupIndex,
      this.groups.length,
      WINDOW_SIZE
    )

    console.log(`Processing groups in sequence:`, processingSequence)

    const results = await Promise.all(
      processingSequence.map((index) => this.processGroup(index))
    )

    return {
      segmentation: results
        .flatMap((r) => r.segmentation)
        .map((s) => s.morphemes),
      vocabulary: results.flatMap((r) => r.vocabulary),
    }
  }

  private async processGroup(index: number): Promise<{
    segmentation: ProcessedSubtitle[]
    vocabulary: ProcessedSubtitle[]
  }> {
    if (this.processedGroups.has(index)) {
      console.log(`Skipping already processed group ${index}`)
      return this.processedGroups.get(index)
    }

    try {
      const group = this.groups[index]
      const text = group.join(" ")
      console.log(`Processing group ${index} (${text.length} chars)`)

      // Process with IchiMoe
      const morphemes = await this.fetchMorphemes(text)
      const segmentation = this.reconstructMorphemes(group, morphemes)

      // Process with JPDB
      const vocabulary = await this.processVocabulary(segmentation)

      this.processedGroups.set(index, { segmentation, vocabulary })
      return { segmentation, vocabulary }
    } catch (error) {
      console.error(`Error processing group ${index}:`, error)
      return { segmentation: [], vocabulary: [] }
    }
  }

  private async fetchMorphemes(text: string): Promise<IchiMoeParseResult> {
    const response = await chrome.runtime.sendMessage({
      type: "FETCH_ICHI_MOE",
      url: `https://ichi.moe/cl/qr/?q=${encodeURIComponent(text)}`,
    })

    if (!response.success) throw new Error(response.error)
    return parseIchiMoe(response.data)
  }

  private reconstructMorphemes(
    group: string[],
    morphemes: IchiMoeParseResult
  ): ProcessedSubtitle[] {
    // Sort words by length for better matching
    const sortedWords = morphemes.surfaceForms
      .map((word, idx) => ({ word, idx }))
      .sort((a, b) => b.word.length - a.word.length)

    return group.map((subtitle) => {
      const result = {
        surfaceForm: [] as string[],
        separatedForm: [] as (string | string[])[],
        baseForm: [] as (string | string[] | null)[],
      }

      let remaining = subtitle
      while (remaining.length > 0) {
        let matched = false

        // Try to match the longest word first
        for (const { word, idx } of sortedWords) {
          if (remaining.startsWith(word)) {
            result.surfaceForm.push(word)
            result.separatedForm.push(morphemes.separatedForms[idx])
            result.baseForm.push(morphemes.baseForms[idx])
            remaining = remaining.slice(word.length)
            matched = true
            break
          }
        }

        // If no match, take one character
        if (!matched) {
          const char = remaining[0]
          result.surfaceForm.push(char)
          result.separatedForm.push(char)
          result.baseForm.push(null)
          remaining = remaining.slice(1)
        }
      }

      return {
        originalText: subtitle,
        morphemes: {
          originalText: subtitle,
          surfaceForm: result.surfaceForm,
          separatedForm: result.separatedForm,
          baseForm: result.baseForm,
        },
        vocabulary: [],
      }
    })
  }

  private async processVocabulary(
    segmentation: ProcessedSubtitle[]
  ): Promise<ProcessedSubtitle[]> {
    const texts = segmentation.map((s) =>
      s.morphemes.baseForm
        .filter((word): word is string | string[] => word !== null)
        .map((word) => (Array.isArray(word) ? word[0] : word))
        .join(" ")
    )

    const response = await chrome.runtime.sendMessage({
      type: "JPDB_parseTextBatch",
      args: [texts],
    })

    if (!response.success) throw new Error(response.error)
    return this.mapVocabularyToSubtitles(segmentation, response.data)
  }

  private mapVocabularyToSubtitles(
    segmentation: ProcessedSubtitle[],
    jpdbData: any
  ): ProcessedSubtitle[] {
    return segmentation.map((subtitle, index) => ({
      ...subtitle,
      vocabulary: this.processJpdbTokens(
        subtitle.originalText,
        jpdbData.tokens[index],
        jpdbData.vocabulary
      ),
    }))
  }

  private processJpdbTokens(
    text: string,
    tokens: any[],
    vocabulary: any[]
  ): JpdbVocabulary[] {
    return [...tokens]
      .sort((a, b) => a[1] - b[1])
      .map(([vocabIndex, position, length]) => {
        const entry = vocabulary[vocabIndex]
        if (!entry) return null

        const [vid, sid, rid, spelling, reading, freq, meanings, pos, state] =
          entry
        return {
          word: text.slice(position, position + length),
          vid,
          sid,
          rid,
          spelling,
          reading,
          frequency: freq,
          meanings: Array.isArray(meanings) ? meanings : [meanings],
          pos: Array.isArray(pos) ? pos : [pos],
          cardState: state,
          position,
          length,
        }
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
  }
}
