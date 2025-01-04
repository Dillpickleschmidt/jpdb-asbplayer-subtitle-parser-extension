// SubtitleStyler.ts
import { createEffect, onCleanup } from "solid-js"
import { IchiMoeProcessor } from "../services/ichi-moe-processor"
import { JpdbProcessor } from "../services/jpdb-processor"
import { createSubtitleManager } from "../services/subtitle-manager"
import "../styles/subtitle.css"
import {
  JpdbBatchProcessingResult,
  ProcessedSubtitle,
  SegmentedWords,
  VocabularyEntry,
} from "../types"

// Caching subtitles and results
let groupedSubtitles: string[][] = []
let currentProcessingPromise: Promise<void> | null = null
const cachedSubtitles: string[] = []
const processedResults = new Map<string, ProcessedSubtitle>()
const processedGroups = new Set<number>()

// Variable to track the current onscreen subtitle
let currentOnscreenSubtitle: string | null = null

// Variable to control the total number of groups processed
let maxGroupsToProcess: number | null = 6 // Set to null for uncapped processing

export function initializeSubtitleHandler(): void {
  createEffect(() => {
    const { bind, unbind } = createSubtitleManager(
      processOnscreenSubtitle,
      cacheOffscreenSubtitle,
      processOffscreenSubtitles
    )
    bind()
    onCleanup(unbind)
  })
}

function cacheOffscreenSubtitle(element: HTMLElement): void {
  const text = element.textContent?.trim()
  if (text && !cachedSubtitles.includes(text)) {
    cachedSubtitles.push(text)
    // When we have new subtitles, update the grouping
    groupedSubtitles = IchiMoeProcessor.groupSubtitles(cachedSubtitles)
  }
}

async function processOffscreenSubtitles(): Promise<void> {
  if (!currentOnscreenSubtitle || groupedSubtitles.length === 0) {
    console.warn(
      "No onscreen subtitle or grouped subtitles available for processing."
    )
    return
  }

  // If there's already a processing chain running, wait for it
  if (currentProcessingPromise) {
    await currentProcessingPromise
    return
  }

  try {
    currentProcessingPromise = (async () => {
      const onscreenGroupIndex = groupedSubtitles.findIndex((group) =>
        group.some((subtitle) => subtitle.includes(currentOnscreenSubtitle!))
      )
      if (onscreenGroupIndex === -1) {
        console.warn("Onscreen subtitle not found in cached subtitles")
        return
      }

      let processingSequence = generateProcessingSequence(
        onscreenGroupIndex,
        groupedSubtitles.length
      )

      if (maxGroupsToProcess !== null) {
        processingSequence = processingSequence.slice(0, maxGroupsToProcess)
      }

      console.log(`Processing sequence: ${processingSequence.join(", ")}`)

      // Process groups one at a time
      for (const groupIndex of processingSequence) {
        if (processedGroups.has(groupIndex)) {
          console.log(`Group ${groupIndex} already processed, skipping...`)
          continue
        }

        const groupText = groupedSubtitles[groupIndex].join(" ")
        console.log(`Processing group ${groupIndex}: ${groupText.length} chars`)

        // Fetch morphemes
        const morphemes = await IchiMoeProcessor.fetchMorphemes(groupText)

        // Fetch vocabulary batch
        const jpdbResults = await JpdbProcessor.fetchVocabularyBatch(
          groupedSubtitles[groupIndex]
        )

        // Map results to subtitles
        const groupResults = mapResultsToSubtitles(
          groupedSubtitles[groupIndex],
          morphemes,
          jpdbResults
        )

        // Store processed results
        groupedSubtitles[groupIndex].forEach((subtitle, index) => {
          processedResults.set(subtitle, groupResults[index])
        })

        // Mark this group as processed
        processedGroups.add(groupIndex)
        console.log(`Completed processing group ${groupIndex}`)
        console.log("Updated processed results:", processedResults)
      }

      console.log("All groups in range processed:", processedResults)
    })()

    await currentProcessingPromise
  } catch (error) {
    console.error("Error processing offscreen subtitles:", error)
  } finally {
    currentProcessingPromise = null
  }
}

function mapResultsToSubtitles(
  subtitles: string[],
  morphemes: SegmentedWords,
  jpdbResults: JpdbBatchProcessingResult
): ProcessedSubtitle[] {
  return subtitles.map((subtitle, index) => {
    const jpdbTokens = jpdbResults.tokens[index] || []
    const vocabulary = jpdbTokens
      .map((token) => {
        const vocabEntry = jpdbResults.vocabulary[token[0]] // vocabularyIndex is at index 0
        if (!vocabEntry) return null

        return {
          ...vocabEntry,
          word: subtitle.slice(token[1], token[1] + token[2]), // position at index 1, length at index 2
          position: token[1],
          length: token[2],
        }
      })
      .filter((entry): entry is VocabularyEntry => entry !== null)

    // Find all segments that match this subtitle
    const matchingSegments = morphemes.surfaceForms
      .map((_, i) => {
        const surfaceForm = morphemes.surfaceForms[i]
        const separatedForm = morphemes.separatedForms[i]
        const baseForm = morphemes.baseForms[i]

        if (subtitle.includes(surfaceForm)) {
          return {
            surfaceForm,
            separatedForm,
            baseForm,
          }
        }
        return null
      })
      .filter((segment) => segment !== null)

    return {
      originalText: subtitle,
      morphemes: {
        originalText: subtitle,
        surfaceForms: matchingSegments.map((s) => s!.surfaceForm),
        separatedForms: matchingSegments.map((s) => s!.separatedForm),
        baseForms: matchingSegments.map((s) => s!.baseForm),
      },
      vocabulary,
    }
  })
}

async function processOnscreenSubtitle(element: HTMLElement): Promise<void> {
  const text = element.textContent?.trim()
  if (!text) return

  currentOnscreenSubtitle = text

  const result = processedResults.get(text)
  if (result) {
    console.log("Using cached result for subtitle:", text)
    updateSubtitleDisplay(element, result)
  } else {
    console.log("Starting processing for new subtitle:", text)
    await processOffscreenSubtitles()

    // Check again after processing in case this subtitle was processed
    const updatedResult = processedResults.get(text)
    if (updatedResult) {
      updateSubtitleDisplay(element, updatedResult)
    }
  }
}

function updateSubtitleDisplay(
  element: HTMLElement,
  subtitleData: ProcessedSubtitle
): void {
  // Check for existing processed element
  const existingProcessed = element.nextElementSibling as HTMLElement

  // Get or create result span
  const resultSpan = existingProcessed?.classList.contains("cr-subtitle")
    ? existingProcessed
    : document.createElement("span")

  // Clear any existing content
  resultSpan.innerHTML = ""
  resultSpan.className = "cr-subtitle"

  // Create word spans
  subtitleData.morphemes.surfaceForms.forEach((surfaceForm, idx) => {
    const span = document.createElement("span")
    span.textContent = surfaceForm
    span.className = `jpdb-word ${
      subtitleData.vocabulary[idx]?.cardState || "unparsed"
    }`
    resultSpan.appendChild(span)
  })

  // Update DOM
  if (!existingProcessed?.classList.contains("cr-subtitle")) {
    element.parentNode?.insertBefore(resultSpan, element.nextSibling)
    element.classList.add("hidden")
    element.removeAttribute("style")
  }
}

/**
 * Generates a sequence of group indices for processing, revolving around the
 * given onscreen group index. Includes both forward and backward groups.
 */
function generateProcessingSequence(
  groupIndex: number,
  totalGroups: number
): number[] {
  const sequence: number[] = [groupIndex]
  let forward = groupIndex + 1
  let backward = groupIndex - 1

  while (forward < totalGroups || backward >= 0) {
    // Add two forward groups if not already processed
    for (let i = 0; i < 2 && forward < totalGroups; i++) {
      if (!processedGroups.has(forward)) {
        sequence.push(forward)
      }
      forward++
    }

    // Add one backward group if not already processed
    if (backward >= 0 && !processedGroups.has(backward)) {
      sequence.push(backward)
    }
    backward--
  }

  return sequence
}
