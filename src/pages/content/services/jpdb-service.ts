// jpdb-service.ts
import { getCardStateClass } from "../utils/card-state"
import { parseIchiMoe } from "./ichi-moe-parser"

export const processJpdb = async (text: string): Promise<HTMLSpanElement> => {
  const url = `https://ichi.moe/cl/qr/?q=${encodeURIComponent(text)}`

  // Fetch Ichi.moe data via background worker
  const ichiResponse = await chrome.runtime.sendMessage({
    type: "FETCH_ICHI_MOE",
    url: url,
  })

  if (!ichiResponse.success) {
    throw new Error(ichiResponse.error)
  }

  const parsedResults = parseIchiMoe(ichiResponse.data)

  // Flatten root words for JPDB
  const flattened = parsedResults.rootWords.flat().join(" ")

  // Fetch JPDB data via background worker
  const jpdbResponse = await chrome.runtime.sendMessage({
    type: "JPDB_parseText",
    args: [flattened],
  })

  if (!jpdbResponse.success) {
    throw new Error(jpdbResponse.error)
  }

  const containerSpan = document.createElement("span")
  let currentPosition = 0

  const createSpan = (text: string, className: string): HTMLSpanElement => {
    const span = document.createElement("span")
    span.textContent = text
    span.className = className
    return span
  }

  const addNonParsedText = (text: string, start: number, end: number) => {
    if (start < end) {
      const nonParsedText = text.slice(start, end)
      containerSpan.appendChild(
        createSpan(nonParsedText, "jpdb-word jpdb-blacklisted")
      )
    }
  }

  const processWord = (
    word: string,
    rootWord: string | null,
    jpdbVocabulary: any[]
  ): HTMLSpanElement => {
    const jpdbEntry = jpdbVocabulary.find(([w]) => w === rootWord)
    return createSpan(word, getCardStateClass(jpdbEntry ? jpdbEntry[2] : null))
  }

  const jpdbVocabulary = jpdbResponse.data.vocabulary

  parsedResults.separatedCompounds.forEach((splitItem, i) => {
    const rootItem = parsedResults.rootWords[i]

    if (Array.isArray(splitItem)) {
      // Handle compound words
      splitItem.forEach((word, j) => {
        const rootWord = Array.isArray(rootItem) ? rootItem[j] : rootItem
        const startIdx = text.indexOf(word, currentPosition)

        if (startIdx !== -1) {
          addNonParsedText(text, currentPosition, startIdx)
          containerSpan.appendChild(
            processWord(word, rootWord || null, jpdbVocabulary)
          )
          currentPosition = startIdx + word.length
        }
      })
    } else {
      // Handle single words
      const rootWord = Array.isArray(rootItem) ? rootItem[0] : rootItem
      const startIdx = text.indexOf(splitItem, currentPosition)

      if (startIdx !== -1) {
        addNonParsedText(text, currentPosition, startIdx)
        containerSpan.appendChild(
          processWord(splitItem, rootWord || null, jpdbVocabulary)
        )
        currentPosition = startIdx + splitItem.length
      }
    }
  })

  // Add any remaining non-parsed text
  addNonParsedText(text, currentPosition, text.length)
  return containerSpan
}
