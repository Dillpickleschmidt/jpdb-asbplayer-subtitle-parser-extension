// SubtitleStyler.ts
import { createEffect, onCleanup } from "solid-js"
import { createStore } from "solid-js/store"
import { JpdbProcessor } from "../services/jpdb-processor"
import { createSubtitleManager } from "../services/subtitle-manager"
import { ProcessedSubtitle } from "../types"
import { getCardStateClass } from "../utils/card-state"
import { SubtitleMouseHandler } from "./subtitle-mouse-handler"

// State Management
const cachedSubtitles: string[] = []
const [subtitleStore, setSubtitleStore] = createStore({
  results: new Map<string, ProcessedSubtitle>(),
})
let currentProcessingPromise: Promise<void> | null = null
let hasProcessedFirstSubtitle = false
let currentOnscreenSubtitle: string | null = null
let lastProcessedBatch: string | null = null
let mouseHandler: SubtitleMouseHandler | null = null

const updateResults = (newMap: Map<string, ProcessedSubtitle>) => {
  setSubtitleStore({ results: new Map(newMap) })
}

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

    mouseHandler = new SubtitleMouseHandler(subtitleStore.results)

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
  const text = element.textContent?.replace(/[+-]\d+ms/g, "").trim()
  if (text && !cachedSubtitles.includes(text)) {
    cachedSubtitles.push(text)
  }
}

async function processOffscreenSubtitles(element?: HTMLElement): Promise<void> {
  if (!currentOnscreenSubtitle || cachedSubtitles.length === 0) return

  const batchKey = cachedSubtitles.join("|")
  if (batchKey === lastProcessedBatch && subtitleStore.results.size > 0) {
    console.log("Using cached results for batch")
    return
  }

  try {
    console.log(`Processing batch of ${cachedSubtitles.length} subtitles`)
    const vocabularyResults =
      await JpdbProcessor.fetchVocabularyBatch(cachedSubtitles)

    // Validate the response structure
    if (
      !vocabularyResults?.tokens?.length ||
      !vocabularyResults?.vocabulary?.length ||
      vocabularyResults.tokens.length !== cachedSubtitles.length
    ) {
      console.warn("Skipping invalid vocabulary results:", vocabularyResults)
      return
    }

    // Clear previous results if this is a new batch
    if (batchKey !== lastProcessedBatch) {
      updateResults(new Map())
    }

    const newResults = new Map(subtitleStore.results)

    // Process each subtitle with its vocabulary results
    cachedSubtitles.forEach((subtitle, index) => {
      if (!vocabularyResults.tokens[index]) return

      // Map tokens to objects
      const subtitleVocab = vocabularyResults.tokens[index].map(
        ([vocabularyIndex, position, length]) => {
          const vocab = vocabularyResults.vocabulary[vocabularyIndex]
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
            position,
            length,
          }
        }
      )

      const processedSubtitle = {
        originalText: subtitle,
        vocabulary: subtitleVocab,
      }
      newResults.set(subtitle, processedSubtitle)

      if (subtitle === currentOnscreenSubtitle && element) {
        updateSubtitleDisplay(element, processedSubtitle)
      }
    })

    // console.log("New results:", newResults)
    updateResults(newResults)
    lastProcessedBatch = batchKey
    console.log(
      `Successfully processed ${subtitleStore.results.size} subtitles`
    )

    // Update mouse handler with new results
    mouseHandler?.updateProcessedResults(subtitleStore.results)
  } catch (error) {
    console.error("Error processing subtitles:", error)
  }
}

function processOnscreenSubtitle(element: HTMLElement): void {
  // Get either all lines in jss49 container or just the single element
  const container = element.closest("div.jss49")
  const elements = container
    ? Array.from(container.querySelectorAll("p.subtitle-line:not(.hidden)"))
    : [element]

  // If this is our first subtitle encounter, cache all lines and trigger processing
  if (!hasProcessedFirstSubtitle && elements.length > 0) {
    hasProcessedFirstSubtitle = true
    elements.forEach((el) => {
      const text = el.textContent?.replace(/[+-]\d+ms/g, "").trim()
      if (text && !cachedSubtitles.includes(text)) {
        cachedSubtitles.push(text)
      }
    })
    processOffscreenSubtitles(elements[0] as HTMLElement)
  }

  // Style each element that has been processed
  elements.forEach((el) => {
    const text = el.textContent?.replace(/[+-]\d+ms/g, "").trim()
    if (text) {
      currentOnscreenSubtitle = text
      if (subtitleStore.results.has(text)) {
        updateSubtitleDisplay(
          el as HTMLElement,
          subtitleStore.results.get(text)!
        )
      }
    }
  })
}

function updateSubtitleDisplay(
  element: HTMLElement,
  subtitleData: ProcessedSubtitle
): void {
  const crSubtitleDiv = document.createElement("div")
  crSubtitleDiv.className = "cr-subtitle"
  crSubtitleDiv.style.position = "relative"
  crSubtitleDiv.style.zIndex = "3" // Ensures subtitle stays above effects

  element.classList.add("hidden")
  element.classList.remove("subtitle-line")
  element.removeAttribute("style")

  const sortedVocab = [...subtitleData.vocabulary].sort(
    (a, b) => a.position - b.position
  )
  let currentPosition = 0

  sortedVocab.forEach((vocabEntry) => {
    if (vocabEntry.position > currentPosition) {
      const unparsedText = subtitleData.originalText.slice(
        currentPosition,
        vocabEntry.position
      )
      if (unparsedText) {
        const span = document.createElement("span")
        span.className = "jpdb-unparsed"
        span.textContent = unparsedText
        crSubtitleDiv.appendChild(span)
      }
    }

    const cardState =
      Array.isArray(vocabEntry.cardState) && vocabEntry.cardState.length > 0
        ? vocabEntry.cardState[0] === "redundant" && vocabEntry.cardState[1]
          ? vocabEntry.cardState[1]
          : vocabEntry.cardState[0]
        : null

    const wordSpan = document.createElement("span")
    wordSpan.className = getCardStateClass(cardState)
    wordSpan.textContent = subtitleData.originalText.slice(
      vocabEntry.position,
      vocabEntry.position + vocabEntry.length
    )
    crSubtitleDiv.appendChild(wordSpan)

    currentPosition = vocabEntry.position + vocabEntry.length
  })

  if (currentPosition < subtitleData.originalText.length) {
    const span = document.createElement("span")
    span.className = "jpdb-unparsed"
    span.textContent = subtitleData.originalText.slice(currentPosition)
    crSubtitleDiv.appendChild(span)
  }

  element.parentNode?.insertBefore(crSubtitleDiv, element.nextSibling)
}

// Export for use in other components
export const updateWordState = async (
  originalText: string,
  vocabularyId: number
): Promise<void> => {
  try {
    const result = await JpdbProcessor.fetchVocabularyBatch([originalText])
    if (!result?.vocabulary) return

    const vocabEntry = result.vocabulary.find((v) => v[0] === vocabularyId)
    if (!vocabEntry) return

    const newResults = new Map(subtitleStore.results)

    newResults.forEach((subtitle, text) => {
      if (subtitle.vocabulary.some((v) => v.vid === vocabularyId)) {
        const updatedVocabulary = subtitle.vocabulary.map((v) =>
          v.vid === vocabularyId ? { ...v, cardState: vocabEntry[7] } : v
        )
        newResults.set(text, { ...subtitle, vocabulary: updatedVocabulary })
      }
    })

    updateResults(newResults)

    const currentElement =
      document.querySelector(".cr-subtitle")?.previousElementSibling
    if (currentElement instanceof HTMLElement && currentOnscreenSubtitle) {
      currentElement.classList.remove("hidden")
      document.querySelector(".cr-subtitle")?.remove()
      processOnscreenSubtitle(currentElement)
    }
  } catch (error) {
    console.error("Error updating word state:", error)
  }
}
