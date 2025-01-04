// ichi-moe-parser.ts
import { SegmentedWords } from "../types"

// List of words that should not have compounds separated
const DONT_SEPARATE_WORDS = new Set([
  "みたい", // Not 見る + たい
  // Add more words here
])

const cleanWord = (word: string): string => {
  return word
    .replace(/【.*?】/g, "") // Remove any text within 【】
    .replace(/^\d+\.\s*/, "") // Remove leading numbers followed by a period and whitespace
    .trim()
}

const cleanWords = (
  words: string[] | (string | string[])[]
): string[] | (string | string[])[] => {
  return words.map((w) => (Array.isArray(w) ? w.map(cleanWord) : cleanWord(w)))
}

export const parseIchiMoe = (htmlContent: string): SegmentedWords => {
  const parser = new DOMParser()
  const doc = parser.parseFromString(htmlContent, "text/html")

  const surfaceForms: string[] = []
  const separatedForms: (string | string[])[] = []
  const baseForms: (string | string[] | null)[] = []

  // Find all gloss divs
  const glossDivs = doc.querySelectorAll("div.gloss")

  glossDivs.forEach((gloss) => {
    // Find the main word in the gloss
    const mainWordTag = gloss.querySelector("dt")
    const mainWord = mainWordTag?.textContent?.trim()

    if (mainWord) {
      surfaceForms.push(mainWord)
    }

    // Check if this word should be kept unseparated
    if (mainWord && DONT_SEPARATE_WORDS.has(cleanWord(mainWord))) {
      baseForms.push(mainWord)
      separatedForms.push(mainWord)
      return // Skip further processing for this word
    }

    // Check for compounds
    const compoundTag = gloss.querySelector("dl.compounds")
    const alternativesTag = gloss.querySelector("dl.alternatives")

    if (compoundTag) {
      // Extract compound parts for separatedForms
      const compoundParts = compoundTag.querySelectorAll(":scope > dt")
      const current_split = Array.from(compoundParts).map(
        (part) => part.textContent?.trim() ?? ""
      )

      // Check if any compound part should be kept unseparated
      if (
        current_split.some((part) => DONT_SEPARATE_WORDS.has(cleanWord(part)))
      ) {
        baseForms.push(mainWord!)
        separatedForms.push(mainWord!)
        return // Skip further processing
      }

      separatedForms.push(current_split)

      // Extract lowermost parts for baseForms
      const compRootDds = compoundTag.querySelectorAll(":scope > dd")
      const current_roots: string[] = []

      compRootDds.forEach((dd, i) => {
        const dtElements = dd.querySelectorAll("dt")
        dtElements.forEach((dt) => {
          const text = dt.textContent?.trim()
          if (text) current_roots.push(text)
        })

        // If no dt elements, use the compound parts
        if (dtElements.length === 0) {
          const compoundPart = compoundParts[i]?.textContent?.trim()
          if (compoundPart) current_roots.push(compoundPart)
        }
      })

      baseForms.push(current_roots)
    } else if (alternativesTag) {
      const dd = alternativesTag.querySelector("dd")
      const dtElement = dd?.querySelector("dt")

      if (dtElement?.textContent) {
        baseForms.push(dtElement.textContent.trim())
        separatedForms.push(mainWord ?? "")
      } else if (mainWord) {
        baseForms.push(mainWord)
        separatedForms.push(mainWord)
      }
    } else if (mainWord) {
      baseForms.push(mainWord)
      separatedForms.push(mainWord)
    }
  })

  // Properly type the cleaned results
  const cleanedSurface = cleanWords(surfaceForms) as string[]
  const cleanedSeparated = cleanWords(separatedForms) as (string | string[])[]
  const cleanedBase = cleanWords(baseForms) as (string | string[] | null)[]

  return {
    originalText: undefined,
    surfaceForms: cleanedSurface,
    separatedForms: cleanedSeparated,
    baseForms: cleanedBase,
    cardStates: cleanedBase.map(() => null),
  }
}

export const getCardStateColor = (cardState: string[] | null): string => {
  const colorMap: Record<string, string> = {
    "not-in-deck": "#808080", // Gray
    locked: "#A0522D", // Brown
    redundant: "#708090", // Slate gray
    new: "#FF4500", // Orange red
    learning: "#4169E1", // Royal blue
    known: "#228B22", // Forest green
    "never-forget": "#9370DB", // Medium purple
    due: "#FFD700", // Gold
    failed: "#DC143C", // Crimson
    suspended: "#696969", // Dim gray
    blacklisted: "#B0B0B0", // Black
  }

  if (!cardState || !cardState[0] || !(cardState[0] in colorMap)) {
    return "#FFFFFF" // Default white
  }
  return colorMap[cardState[0]]
}
