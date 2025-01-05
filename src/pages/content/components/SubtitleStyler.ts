import { createEffect, onCleanup } from "solid-js"
import { JpdbProcessor } from "../services/jpdb-processor"
import { createSubtitleManager } from "../services/subtitle-manager"
import { ProcessedSubtitle } from "../types"
import { getCardStateClass } from "../utils/card-state"
import { SubtitleMouseHandler } from "./subtitle-mouse-handler"

// State Management
const cachedSubtitles: string[] = []
const processedResults = new Map<string, ProcessedSubtitle>()
let currentProcessingPromise: Promise<void> | null = null
let currentOnscreenSubtitle: string | null = null
let lastProcessedBatch: string | null = null
let mouseHandler: SubtitleMouseHandler | null = null

function initializeStyles(): void {
  // Create style element if it doesn't exist
  let style = document.getElementById("jpdb-custom-styles")
  if (!style) {
    style = document.createElement("style")
    style.id = "jpdb-custom-styles"
    document.head.appendChild(style)
  }

  // Load styles from storage
  chrome.storage.sync.get(["customWordCSS"], (result) => {
    if (result.customWordCSS) {
      style.textContent = result.customWordCSS
    }
  })

  // Listen for style updates
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.customWordCSS) {
      style.textContent = changes.customWordCSS.newValue
    }
  })
}

export function initializeSubtitleHandler(): void {
  createEffect(() => {
    // Initialize styles first
    initializeStyles()

    mouseHandler = new SubtitleMouseHandler(processedResults)

    const { bind, unbind } = createSubtitleManager(
      processOnscreenSubtitle,
      cacheOffscreenSubtitle,
      processOffscreenSubtitles
    )
    bind()
    onCleanup(() => {
      unbind()
      mouseHandler?.destroy()
      mouseHandler = null
    })
  })
}

function cacheOffscreenSubtitle(element: HTMLElement): void {
  const text = element.textContent?.trim()
  if (text && !cachedSubtitles.includes(text)) {
    cachedSubtitles.push(text)
  }
}

function getBatchKey(subtitles: string[]): string {
  return subtitles.join("|")
}

async function processOffscreenSubtitles(element?: HTMLElement): Promise<void> {
  if (!currentOnscreenSubtitle || cachedSubtitles.length === 0) {
    return
  }

  const batchKey = getBatchKey(cachedSubtitles)
  if (batchKey === lastProcessedBatch && processedResults.size > 0) {
    console.log("Using cached results for batch")
    return
  }

  try {
    console.log(`Processing batch of ${cachedSubtitles.length} subtitles`)
    const vocabularyResults =
      await JpdbProcessor.fetchVocabularyBatch(cachedSubtitles)

    // Validate the response structure
    if (
      !vocabularyResults?.tokens ||
      !Array.isArray(vocabularyResults.tokens) ||
      !vocabularyResults?.vocabulary ||
      !Array.isArray(vocabularyResults.vocabulary) ||
      vocabularyResults.tokens.length === 0 ||
      vocabularyResults.tokens.length !== cachedSubtitles.length
    ) {
      console.warn(
        "Skipping invalid vocabulary results:",
        JSON.stringify(vocabularyResults, null, 2)
      )
      return
    }

    // Clear previous results if this is a new batch
    if (batchKey !== lastProcessedBatch) {
      processedResults.clear()
    }

    // Process each subtitle with its vocabulary results
    cachedSubtitles.forEach((subtitle, index) => {
      if (!vocabularyResults.tokens[index]) return

      // Map tokens to objects
      const tokensForSubtitle = vocabularyResults.tokens[index].map(
        ([vocabularyIndex, position, length, furigana]) => ({
          vocabularyIndex,
          position,
          length,
          furigana,
        })
      )

      // Map vocabulary using token references
      const subtitleVocab = tokensForSubtitle.map((token) => {
        const vocab = vocabularyResults.vocabulary[token.vocabularyIndex]
        return {
          vid: vocab[0],
          sid: vocab[1],
          rid: vocab[2],
          spelling: vocab[3],
          reading: vocab[4],
          frequencyRank: vocab[5],
          meanings: vocab[6],
          cardState: vocab[7],
          partOfSpeech: vocab[8],
          position: token.position,
          length: token.length,
        }
      })

      const processedSubtitle: ProcessedSubtitle = {
        originalText: subtitle,
        vocabulary: subtitleVocab,
      }

      processedResults.set(subtitle, processedSubtitle)

      if (subtitle === currentOnscreenSubtitle && element) {
        updateSubtitleDisplay(element, processedSubtitle)
      }
    })

    lastProcessedBatch = batchKey
    console.log(`Successfully processed ${processedResults.size} subtitles`)
    console.log("Processed results:", processedResults)

    // Update mouse handler with new results
    mouseHandler?.updateProcessedResults(processedResults)
  } catch (error) {
    console.error("Error processing subtitles:", error)
  }
}

function processOnscreenSubtitle(element: HTMLElement): void {
  const text = element.textContent?.trim()
  if (!text) return

  currentOnscreenSubtitle = text

  if (processedResults.has(text)) {
    updateSubtitleDisplay(element, processedResults.get(text)!)
    return
  }

  if (!currentProcessingPromise) {
    currentProcessingPromise = processOffscreenSubtitles(element).finally(
      () => {
        currentProcessingPromise = null
      }
    )
  }
}

function createSpan(text: string, className: string): HTMLSpanElement {
  const span = document.createElement("span")
  span.className = className
  span.textContent = text
  return span
}

function updateSubtitleDisplay(
  element: HTMLElement,
  subtitleData: ProcessedSubtitle
): void {
  const crSubtitleSpan = document.createElement("span")
  crSubtitleSpan.className = "cr-subtitle"

  const sortedVocab = [...subtitleData.vocabulary].sort(
    (a, b) => a.position - b.position
  )
  let currentPosition = 0

  // Process each vocabulary entry and any text between entries
  for (const vocabEntry of sortedVocab) {
    // Add any unprocessed text before the current vocabulary entry
    if (vocabEntry.position > currentPosition) {
      const unparsedText = subtitleData.originalText.slice(
        currentPosition,
        vocabEntry.position
      )
      if (unparsedText) {
        crSubtitleSpan.appendChild(createSpan(unparsedText, "jpdb-unparsed"))
      }
    }

    // Add the vocabulary entry with its card state
    const cardState =
      Array.isArray(vocabEntry.cardState) && vocabEntry.cardState.length > 0
        ? vocabEntry.cardState[0] === "redundant" && vocabEntry.cardState[1]
          ? vocabEntry.cardState[1]
          : vocabEntry.cardState[0]
        : null

    const wordSpan = createSpan(
      subtitleData.originalText.slice(
        vocabEntry.position,
        vocabEntry.position + vocabEntry.length
      ),
      getCardStateClass(cardState)
    )
    crSubtitleSpan.appendChild(wordSpan)

    currentPosition = vocabEntry.position + vocabEntry.length
  }

  // Add any remaining unprocessed text
  if (currentPosition < subtitleData.originalText.length) {
    const remainingText = subtitleData.originalText.slice(currentPosition)
    crSubtitleSpan.appendChild(createSpan(remainingText, "jpdb-unparsed"))
  }

  element.classList.add("hidden")
  element.parentNode?.insertBefore(crSubtitleSpan, element.nextSibling)
}
