// subtitle-processor.ts
import {
  BatchProcessingResult,
  ChromeMessage,
  JpdbBatchProcessingResult,
  ProcessedSubtitle,
  SegmentedWords,
  VocabularyEntry,
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

  constructor(elements: HTMLElement[]) {
    this.subtitles = elements
      .map((el) => el.textContent?.trim())
      .filter((text): text is string => Boolean(text))

    this.groups = this.createGroups()
    this.processedGroups = new Map()
    this.processedResults = new Map()

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
    text: string,
    onGroupProcessed?: (result: BatchProcessingResult) => void
  ): Promise<BatchProcessingResult | null> {
    console.log("Processing window for text:", text)

    // First try exact match in cached results
    if (this.processedResults.has(text)) {
      console.log("Using cached result for:", text)
      const result = this.processedResults.get(text)
      if (onGroupProcessed && result) {
        onGroupProcessed(result)
      }
      return result || null
    }

    // Find any group that contains this text within it
    for (let groupIndex = 0; groupIndex < this.groups.length; groupIndex++) {
      const group = this.groups[groupIndex]
      const groupText = group.join(" ")

      if (groupText.includes(text)) {
        console.log("Found text in group:", groupIndex)
        const result = await this.processGroupWindow(
          groupIndex,
          onGroupProcessed
        )

        // Cache the result
        this.processedResults.set(text, result)

        return result
      }
    }

    console.log("Text not found in any group:", text)
    return null
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
    groupIndex: number,
    onGroupProcessed?: (result: BatchProcessingResult) => void
  ): Promise<BatchProcessingResult> {
    const processingSequence = this.generateProcessingSequence(
      groupIndex,
      this.groups.length,
      WINDOW_SIZE
    )

    console.log(`Processing sequence: ${processingSequence.join(", ")}`)

    let allSegmentation: ProcessedSubtitle[] = []
    let allVocabulary: ProcessedSubtitle[] = []

    // Process groups sequentially
    for (const index of processingSequence) {
      const result = await this.processGroup(index)
      allSegmentation.push(...result.segmentation)
      allVocabulary.push(...result.vocabulary)

      // Notify after each group is processed
      if (onGroupProcessed) {
        onGroupProcessed({
          segmentation: result.segmentation.map((s) => s.morphemes),
          vocabulary: result.vocabulary,
        })
      }
    }

    return {
      segmentation: allSegmentation.map((s) => s.morphemes),
      vocabulary: allVocabulary,
    }
  }

  private async processGroup(index: number): Promise<{
    segmentation: ProcessedSubtitle[]
    vocabulary: ProcessedSubtitle[]
  }> {
    if (this.processedGroups.has(index)) {
      return this.processedGroups.get(index)
    }

    try {
      const group = this.groups[index]
      const text = this.groups[index].join(" ")
      console.log(`Processing group ${index}: ${text.length} chars`)

      // Process with IchiMoe
      const morphemes = await this.fetchMorphemes(text)
      const segmentation = this.reconstructMorphemes(group, morphemes)

      // Process with JPDB
      const vocabulary = await this.processVocabulary(segmentation)

      this.processedGroups.set(index, { segmentation, vocabulary })
      return { segmentation, vocabulary }
    } catch (error) {
      console.error(`Error in group ${index}:`, error)
      return { segmentation: [], vocabulary: [] }
    }
  }

  private async fetchMorphemes(text: string): Promise<SegmentedWords> {
    const response = await chrome.runtime.sendMessage({
      type: "FETCH_ICHI_MOE",
      url: `https://ichi.moe/cl/qr/?q=${encodeURIComponent(text)}`,
    })

    if (!response.success) throw new Error(response.error)
    return parseIchiMoe(response.data)
  }

  private reconstructMorphemes(
    group: string[],
    parsedResult: SegmentedWords
  ): ProcessedSubtitle[] {
    const sortedWords = parsedResult.surfaceForms
      .map((word, idx) => ({ word, idx }))
      .sort((a, b) => b.word.length - a.word.length)

    return group.map((subtitle) => {
      const morphemes: SegmentedWords = {
        originalText: subtitle,
        surfaceForms: [],
        separatedForms: [],
        baseForms: [],
      }

      let remaining = subtitle
      while (remaining.length > 0) {
        let matched = false

        // Try to match the longest word first
        for (const { word, idx } of sortedWords) {
          if (remaining.startsWith(word)) {
            morphemes.surfaceForms.push(word)
            morphemes.separatedForms.push(parsedResult.separatedForms[idx])
            morphemes.baseForms.push(parsedResult.baseForms[idx])
            remaining = remaining.slice(word.length)
            matched = true
            break
          }
        }

        // If no match, take one character
        if (!matched) {
          const char = remaining[0]
          morphemes.surfaceForms.push(char)
          morphemes.separatedForms.push(char)
          morphemes.baseForms.push(null)
          remaining = remaining.slice(1)
        }
      }

      return {
        originalText: subtitle,
        morphemes,
        vocabulary: [],
      }
    })
  }

  private async processVocabulary(
    segmentation: ProcessedSubtitle[]
  ): Promise<ProcessedSubtitle[]> {
    const texts = segmentation.map((s) => {
      const words = s.morphemes.baseForms
        .filter((word): word is string | string[] => word !== null)
        .flatMap((word) => (Array.isArray(word) ? word : [word]))
        .join(" ")

      // console.log(`Words: ${words}`)
      return words
    })

    // console.log("Sending batch processing request:", texts)
    const response = (await chrome.runtime.sendMessage({
      type: "JPDB_parseTextBatch",
      args: texts,
    })) as ChromeMessage<JpdbBatchProcessingResult>

    if (!response.success) throw new Error(response.error)
    return this.mapVocabularyToSubtitles(segmentation, response.data!)
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
    tokens: [number, number, number][],
    vocabulary: any[]
  ): VocabularyEntry[] {
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
          frequencyRank: freq,
          meanings: Array.isArray(meanings) ? meanings : [meanings],
          partOfSpeech: Array.isArray(pos) ? pos : [pos],
          cardState: state,
          position,
          length,
        }
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
  }
}
