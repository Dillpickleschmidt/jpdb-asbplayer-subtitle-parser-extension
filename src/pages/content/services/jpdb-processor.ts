// jpdb-processor.ts

import { JpdbBatchProcessingResult, JpdbToken, VocabularyEntry } from "../types"

const MAX_BYTE_COUNT = 16384

export class JpdbSubtitleProcessor {
  private subtitles: string[]
  private groups: string[][]

  constructor(elements: HTMLElement[]) {
    this.subtitles = elements
      .map((el) => el.textContent?.trim())
      .filter((text): text is string => Boolean(text))

    this.groups = this.createGroups()

    console.log(
      `Initialized new processor with ${this.subtitles.length} subtitles in ${this.groups.length} groups`
    )
  }

  private createGroups(): string[][] {
    return this.subtitles.reduce<string[][]>((groups, subtitle) => {
      const currentGroup = groups[groups.length - 1] || []
      const currentGroupSize = this.calculateByteSize(currentGroup.join(" "))

      const newSize = currentGroupSize
        ? currentGroupSize + this.calculateByteSize(subtitle) + 1 // Include space between subtitles
        : this.calculateByteSize(subtitle)

      if (newSize > MAX_BYTE_COUNT && currentGroup.length > 0) {
        return [...groups, [subtitle]]
      }

      if (groups.length === 0) {
        return [[subtitle]]
      }

      groups[groups.length - 1] = [...currentGroup, subtitle]
      return groups
    }, [])
  }

  private calculateByteSize(text: string): number {
    return new Blob([text]).size
  }

  public logGroups(): void {
    this.groups.forEach((group, index) => {
      const groupSize = this.calculateByteSize(group.join(" "))
      console.log(`Group ${index + 1} (${groupSize} bytes):`)
      // console.log(group)
    })
  }

  private processedResults: Map<
    string,
    {
      tokens: JpdbToken[]
      vocabulary: VocabularyEntry[]
    }
  > = new Map()

  public async getSegmentationForText(text: string) {
    const result = this.processedResults.get(text)
    // console.log("Getting segmentation for:", text, result) // Debug log
    return result
  }

  // Update your processGroups method:
  public async processGroups(): Promise<void> {
    for (const [index, group] of this.groups.entries()) {
      try {
        const result = await this.sendToJpdbApi(group)
        // console.log(`Group ${index + 1} processed, tokens:`, result.tokens) // Debug log

        // Store results for each subtitle in the group
        group.forEach((subtitle, subIndex) => {
          if (result.tokens[subIndex]) {
            this.processedResults.set(subtitle, {
              tokens: result.tokens[subIndex],
              vocabulary: result.vocabulary,
            })
            // console.log(
            //   `Stored segmentation for: ${subtitle}`,
            //   result.tokens[subIndex]
            // ) // Debug log
          }
        })
      } catch (error) {
        console.error(`Error processing group ${index + 1}:`, error)
      }
    }
  }

  private async sendToJpdbApi(
    group: string[]
  ): Promise<JpdbBatchProcessingResult> {
    console.log(`Sending group to JPDB API:`, group) // Debug log
    const response = await chrome.runtime.sendMessage({
      type: "JPDB_parseTextBatch",
      args: group,
    })

    if (!response.success) throw new Error(response.error)
    return response.data
  }
}
