import { createEffect, onCleanup } from "solid-js"
import { IchiMoeProcessor } from "../services/ichi-moe-processor"
import { JpdbProcessor } from "../services/jpdb-processor"
import { createSubtitleManager } from "../services/subtitle-manager"
import "../styles/subtitle.css"
import {
  alignedBaseFormState,
  JpdbBatchProcessingResult,
  ProcessedSubtitle,
  SegmentedWords,
} from "../types"

// Configuration
const MAX_GROUPS_TO_PROCESS = 6
const BUFFER_SIZE = {
  FORWARD: 0,
  BACKWARD: 0,
}

// State Management
const cachedSubtitles: string[] = []
const processedResults = new Map<string, ProcessedSubtitle>()
const processedGroups = new Set<number>()
let currentProcessingPromise: Promise<void> | null = null
let currentOnscreenSubtitle: string | null = null

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
  }
}

async function processOffscreenSubtitles(element?: HTMLElement): Promise<void> {
  if (!currentOnscreenSubtitle) {
    console.warn("No onscreen subtitle available for processing.")
    return
  }

  try {
    const groupedSubtitles = IchiMoeProcessor.groupSubtitles(cachedSubtitles)
    const onscreenGroupIndex = findOnscreenSubtitleGroup(groupedSubtitles)

    if (onscreenGroupIndex === -1) {
      console.warn("Onscreen subtitle not found in cached subtitles")
      return
    }

    console.log("Fetching vocabulary batch for all grouped subtitles...")
    const allVocabularyResults = await JpdbProcessor.fetchVocabularyBatch(
      groupedSubtitles.flat()
    )

    const processingSequence = generateProcessingSequence(
      onscreenGroupIndex,
      groupedSubtitles.length
    )

    console.log(`Processing sequence: ${processingSequence.join(", ")}`)

    for (const groupIndex of processingSequence) {
      if (processedGroups.has(groupIndex)) {
        console.log(`Group ${groupIndex} already processed, skipping...`)
        continue
      }

      await processGroup(
        groupIndex,
        groupedSubtitles,
        allVocabularyResults,
        element
      )
    }

    console.log("All groups in range processed:", processedResults)
  } catch (error) {
    console.error("Error processing offscreen subtitles:", error)
  }
}

function findOnscreenSubtitleGroup(groupedSubtitles: string[][]): number {
  return groupedSubtitles.findIndex((group) =>
    group.some((subtitle) => subtitle.includes(currentOnscreenSubtitle!))
  )
}

async function processGroup(
  groupIndex: number,
  groupedSubtitles: string[][],
  jpdbVocabResults: JpdbBatchProcessingResult,
  onscreenElement?: HTMLElement
): Promise<void> {
  const groupText = groupedSubtitles[groupIndex].join(" ")
  console.log(`Processing group ${groupIndex}: ${groupText.length} chars`)

  // Fetch morphemes from ichi.moe
  const morphemes = await IchiMoeProcessor.fetchMorphemes(groupText)

  // Extract all base forms from morphemes
  const baseFormsForCardStates = morphemes.baseForms
    .flatMap((form) => (Array.isArray(form) ? form : [form]))
    .join(" ")

  // Fetch card states for all base forms
  const cardStatesResult = await JpdbProcessor.fetchCardStates(
    baseFormsForCardStates
  )

  const baseFormStates: alignedBaseFormState[] = cardStatesResult.tokens.map(
    (token) => {
      const vocabEntry = cardStatesResult.vocabulary[token[0]]
      return {
        baseWord: baseFormsForCardStates.slice(token[1], token[1] + token[2]),
        jpdbBaseWord: vocabEntry[0] as string,
        state: vocabEntry[1] as string[],
      }
    }
  )

  console.log("baseFormStates:", baseFormStates)

  // Map results to individual subtitles
  const groupResults = mapResultsToSubtitles(
    groupedSubtitles[groupIndex],
    morphemes,
    jpdbVocabResults,
    baseFormStates
  )

  // Store results and update UI if needed
  groupedSubtitles[groupIndex].forEach((subtitle, index) => {
    processedResults.set(subtitle, groupResults[index])

    if (subtitle === currentOnscreenSubtitle && onscreenElement) {
      console.log("Updating onscreen subtitle immediately:", subtitle)
      updateSubtitleDisplay(onscreenElement, groupResults[index])
    }
  })

  processedGroups.add(groupIndex)
  console.log(`Completed processing group ${groupIndex}`)
  console.log("Updated processed results:", processedResults)
}

function mapResultsToSubtitles(
  subtitles: string[],
  morphemes: SegmentedWords,
  jpdbResults: JpdbBatchProcessingResult,
  alignedBaseFormStates: alignedBaseFormState[]
): ProcessedSubtitle[] {
  let currentMorphemeIndex = 0

  return subtitles.map((subtitle) => {
    const processedMorphemes: SegmentedWords = {
      originalText: subtitle,
      surfaceForms: [],
      separatedForms: [],
      baseForms: [],
      cardStates: [],
    }

    // Process the current subtitle by iterating over morphemes
    let remainingText = subtitle
    while (
      remainingText.length > 0 &&
      currentMorphemeIndex < morphemes.surfaceForms.length
    ) {
      const surfaceForm = morphemes.surfaceForms[currentMorphemeIndex]
      const separatedForm = morphemes.separatedForms[currentMorphemeIndex]
      const baseForm = morphemes.baseForms[currentMorphemeIndex]

      if (remainingText.startsWith(surfaceForm)) {
        processedMorphemes.surfaceForms.push(surfaceForm)
        processedMorphemes.separatedForms.push(separatedForm)

        if (baseForm !== null) {
          const matchedStates = matchBaseFormWithStates(
            baseForm,
            alignedBaseFormStates
          )
          processedMorphemes.baseForms.push(matchedStates.baseWords)
          processedMorphemes.cardStates.push(matchedStates.cardStates)
        } else {
          processedMorphemes.baseForms.push(null)
          processedMorphemes.cardStates.push(null)
        }

        remainingText = remainingText.slice(surfaceForm.length)
        currentMorphemeIndex++
      } else {
        // If no match, treat the next character as unparsed text
        processedMorphemes.surfaceForms.push(remainingText[0])
        processedMorphemes.separatedForms.push(remainingText[0])
        processedMorphemes.baseForms.push(null)
        processedMorphemes.cardStates.push(null)
        remainingText = remainingText.slice(1)
      }
    }

    return {
      originalText: subtitle,
      morphemes: processedMorphemes,
      vocabulary: [], // Can be populated later if needed
    }
  })
}

function matchBaseFormWithStates(
  baseForm: string | string[],
  alignedBaseFormStates: alignedBaseFormState[]
): { baseWords: string | string[]; cardStates: string | string[] | null } {
  if (Array.isArray(baseForm)) {
    // Handle compound words
    const matchedStates = baseForm.map((word) =>
      alignedBaseFormStates.find((state) => state.baseWord === word)
    )

    return {
      baseWords: matchedStates.map(
        (state, idx) => state?.jpdbBaseWord || baseForm[idx]
      ),
      cardStates: matchedStates.map((state) =>
        state?.state?.length > 0 ? state.state[0] : null
      ),
    }
  } else {
    // Handle single words
    const matchedState = alignedBaseFormStates.find(
      (state) => state.baseWord === baseForm
    )
    return {
      baseWords: matchedState?.jpdbBaseWord || baseForm,
      cardStates:
        matchedState?.state?.length > 0 ? matchedState.state[0] : null,
    }
  }
}

function processOnscreenSubtitle(element: HTMLElement): void {
  const text = element.textContent?.trim()
  if (!text) {
    console.warn("Empty subtitle element encountered")
    return
  }

  currentOnscreenSubtitle = text

  if (processedResults.has(text)) {
    updateSubtitleDisplay(element, processedResults.get(text)!)
    return
  }

  if (!currentProcessingPromise) {
    currentProcessingPromise = processOffscreenSubtitles(element)
      .then(() => {
        // No need to update here since it will be updated as soon as its group is processed
      })
      .catch((error) => {
        console.error("Failed to process subtitles:", error)
      })
      .finally(() => {
        currentProcessingPromise = null
      })
  }
}

interface ProcessingBuffer {
  forward: number
  backward: number
}

interface ProcessingBounds {
  start: number
  end: number
}

function generateProcessingSequence(
  currentIndex: number,
  totalGroups: number,
  buffer: ProcessingBuffer = {
    forward: BUFFER_SIZE.FORWARD,
    backward: BUFFER_SIZE.BACKWARD,
  }
): number[] {
  const bounds: ProcessingBounds = {
    start: Math.max(0, currentIndex - buffer.backward),
    end: Math.min(totalGroups - 1, currentIndex + buffer.forward),
  }

  const sequence: number[] = []
  if (!processedGroups.has(currentIndex)) {
    sequence.push(currentIndex)
  }

  let forward = currentIndex + 1
  let backward = currentIndex - 1

  while (forward <= bounds.end || backward >= bounds.start) {
    for (let i = 0; i < 2 && forward <= bounds.end; i++) {
      if (!processedGroups.has(forward)) {
        sequence.push(forward)
      }
      forward++
    }

    if (backward >= bounds.start) {
      if (!processedGroups.has(backward)) {
        sequence.push(backward)
      }
      backward--
    }
  }

  return sequence
}

function createUnparsedSpan(text: string): HTMLSpanElement {
  const span = document.createElement("span")
  span.className = "jpdb-unparsed"
  span.textContent = text
  return span
}

function createParsedMorphemeSpan(
  text: string,
  separatedForm: string | string[]
): HTMLSpanElement {
  const segmentSpan = document.createElement("span")
  segmentSpan.className = "jpdb-segment"

  const components = Array.isArray(separatedForm)
    ? separatedForm
    : separatedForm.split("")

  components.forEach((component) => {
    const componentSpan = document.createElement("span")
    componentSpan.className = "jpdb-new"
    componentSpan.textContent = component
    segmentSpan.appendChild(componentSpan)
  })

  return segmentSpan
}

function processMorpheme(
  crSubtitleSpan: HTMLSpanElement,
  morpheme: string,
  separatedForm: string | string[],
  baseForm: string | string[] | null
): void {
  if (morpheme && separatedForm) {
    if (baseForm === null) {
      // If there's no base form, treat it as unparsed text
      crSubtitleSpan.appendChild(createUnparsedSpan(morpheme))
    } else {
      // Create a parsed span for the morpheme
      const segmentSpan = document.createElement("span")
      segmentSpan.className = "jpdb-segment"

      if (Array.isArray(separatedForm)) {
        // Handle array of separated forms (e.g., ['されて', 'きて'])
        separatedForm.forEach((component) => {
          const componentSpan = document.createElement("span")
          componentSpan.className = "jpdb-new"
          componentSpan.textContent = component
          segmentSpan.appendChild(componentSpan)
        })
      } else {
        // Handle single separated form (e.g., 'ずっと')
        const componentSpan = document.createElement("span")
        componentSpan.className = "jpdb-new"
        componentSpan.textContent = separatedForm
        segmentSpan.appendChild(componentSpan)
      }

      crSubtitleSpan.appendChild(segmentSpan)
    }
  }
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
  let currentMorphemeIndex = 0

  for (const vocabEntry of sortedVocab) {
    if (vocabEntry.position > currentPosition) {
      const unparsedText = subtitleData.originalText.slice(
        currentPosition,
        vocabEntry.position
      )

      if (unparsedText) {
        while (
          currentMorphemeIndex < subtitleData.morphemes.separatedForms.length &&
          subtitleData.morphemes.surfaceForms[currentMorphemeIndex].length <=
            unparsedText.length
        ) {
          processMorpheme(
            crSubtitleSpan,
            subtitleData.morphemes.surfaceForms[currentMorphemeIndex],
            subtitleData.morphemes.separatedForms[currentMorphemeIndex],
            subtitleData.morphemes.baseForms[currentMorphemeIndex]
          )
          currentMorphemeIndex++
        }
      }
    }

    while (
      currentMorphemeIndex < subtitleData.morphemes.separatedForms.length
    ) {
      const morpheme = subtitleData.morphemes.surfaceForms[currentMorphemeIndex]
      if (
        !morpheme ||
        subtitleData.originalText.indexOf(morpheme, vocabEntry.position) !==
          vocabEntry.position
      ) {
        break
      }

      processMorpheme(
        crSubtitleSpan,
        morpheme,
        subtitleData.morphemes.separatedForms[currentMorphemeIndex],
        subtitleData.morphemes.baseForms[currentMorphemeIndex]
      )
      currentMorphemeIndex++
    }

    currentPosition = vocabEntry.position + vocabEntry.length
  }

  if (currentPosition < subtitleData.originalText.length) {
    while (
      currentMorphemeIndex < subtitleData.morphemes.separatedForms.length
    ) {
      processMorpheme(
        crSubtitleSpan,
        subtitleData.morphemes.surfaceForms[currentMorphemeIndex],
        subtitleData.morphemes.separatedForms[currentMorphemeIndex],
        subtitleData.morphemes.baseForms[currentMorphemeIndex]
      )
      currentMorphemeIndex++
    }
  }

  element.classList.add("hidden")
  element.parentNode?.insertBefore(crSubtitleSpan, element.nextSibling)
}
