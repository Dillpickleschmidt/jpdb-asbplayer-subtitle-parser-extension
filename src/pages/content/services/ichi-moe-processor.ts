import { ChromeMessage, SegmentedWords } from "../types"
import { parseIchiMoe } from "./ichi-moe-parser"

export class IchiMoeProcessor {
  private static MAX_GROUP_SIZE = 400

  static groupSubtitles(subtitles: string[]): string[][] {
    return subtitles.reduce<string[][]>((groups, subtitle) => {
      const currentGroup = groups[groups.length - 1] || []
      const newSize = currentGroup.length
        ? currentGroup.join(" ").length + 1 + subtitle.length
        : subtitle.length

      if (
        newSize > IchiMoeProcessor.MAX_GROUP_SIZE &&
        currentGroup.length > 0
      ) {
        groups.push([subtitle])
      } else if (groups.length === 0) {
        groups.push([subtitle])
      } else {
        groups[groups.length - 1] = [...currentGroup, subtitle]
      }

      return groups
    }, [])
  }

  static async fetchMorphemes(text: string): Promise<SegmentedWords> {
    const response = (await chrome.runtime.sendMessage({
      type: "FETCH_ICHI_MOE",
      url: `https://ichi.moe/cl/qr/?q=${encodeURIComponent(text)}`,
    })) as ChromeMessage<string> // Expect the data to be a string containing HTML content

    if (!response.success) throw new Error(response.error)

    return parseIchiMoe(response.data!) // Pass the HTML string to the parser
  }
}
