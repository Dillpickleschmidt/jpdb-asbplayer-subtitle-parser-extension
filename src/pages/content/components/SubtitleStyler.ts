import { createEffect, onCleanup } from "solid-js"
import { IchiMoeProcessor } from "../services/ichi-moe-processor"
import { JpdbProcessor } from "../services/jpdb-processor"
import { createSubtitleManager } from "../services/subtitle-manager"
import "../styles/subtitle.css"
import {
  JpdbBatchProcessingResult,
  JpdbToken,
  ProcessedSubtitle,
  SegmentedWords,
  VocabularyEntry,
} from "../types"

// Configuration
const MAX_GROUPS_TO_PROCESS = 6
const BUFFER_SIZE = {
  FORWARD: 2,
  BACKWARD: 1,
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

      await processGroup(groupIndex, groupedSubtitles, element)
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
  onscreenElement?: HTMLElement
) {
  const groupText = groupedSubtitles[groupIndex].join(" ")
  console.log(`Processing group ${groupIndex}: ${groupText.length} chars`)

  const [morphemes, jpdbResults] = await Promise.all([
    IchiMoeProcessor.fetchMorphemes(groupText),
    JpdbProcessor.fetchVocabularyBatch(groupedSubtitles[groupIndex]),
  ])

  const groupResults = mapResultsToSubtitles(
    groupedSubtitles[groupIndex],
    morphemes,
    jpdbResults
  )

  groupedSubtitles[groupIndex].forEach((subtitle, index) => {
    processedResults.set(subtitle, groupResults[index])

    // If this is the current onscreen subtitle, update it immediately
    if (subtitle === currentOnscreenSubtitle && onscreenElement) {
      console.log("Updating onscreen subtitle immediately:", subtitle)
      updateSubtitleDisplay(onscreenElement, groupResults[index])
    }
  })

  processedGroups.add(groupIndex)
  console.log(`Completed processing group ${groupIndex}`)
}

function mapResultsToSubtitles(
  subtitles: string[],
  morphemes: SegmentedWords,
  jpdbResults: JpdbBatchProcessingResult
): ProcessedSubtitle[] {
  const sortedWords = getSortedMorphemeWords(morphemes)

  return subtitles.map((subtitle) => ({
    originalText: subtitle,
    morphemes: processMorphemes(subtitle, sortedWords, morphemes),
    vocabulary: mapVocabulary(subtitle, jpdbResults),
  }))
}

function getSortedMorphemeWords(morphemes: SegmentedWords) {
  return morphemes.surfaceForms
    .map((word, idx) => ({ word, idx }))
    .sort((a, b) => b.word.length - a.word.length)
}

function processMorphemes(
  subtitle: string,
  sortedWords: Array<{ word: string; idx: number }>,
  morphemes: SegmentedWords
): SegmentedWords {
  const result: SegmentedWords = {
    originalText: subtitle,
    surfaceForms: [],
    separatedForms: [],
    baseForms: [],
  }

  let remaining = subtitle
  while (remaining.length > 0) {
    const matchedWord = sortedWords.find(({ word }) =>
      remaining.startsWith(word)
    )

    if (matchedWord) {
      result.surfaceForms.push(matchedWord.word)
      result.separatedForms.push(morphemes.separatedForms[matchedWord.idx])
      result.baseForms.push(morphemes.baseForms[matchedWord.idx])
      remaining = remaining.slice(matchedWord.word.length)
    } else {
      const char = remaining[0]
      result.surfaceForms.push(char)
      result.separatedForms.push(char)
      result.baseForms.push(null)
      remaining = remaining.slice(1)
    }
  }

  return result
}

function mapVocabulary(
  subtitle: string,
  jpdbResults: JpdbBatchProcessingResult
): VocabularyEntry[] {
  return jpdbResults.tokens.flatMap((tokens) =>
    tokens
      .map((token) => createVocabEntry(subtitle, token, jpdbResults))
      .filter((entry): entry is VocabularyEntry => entry !== null)
  )
}

function createVocabEntry(
  subtitle: string,
  token: JpdbToken,
  jpdbResults: JpdbBatchProcessingResult
): VocabularyEntry | null {
  const vocabEntry = jpdbResults.vocabulary[token[0]]
  if (!vocabEntry) return null

  return {
    ...vocabEntry,
    word: subtitle.slice(token[1], token[1] + token[2]),
    position: token[1],
    length: token[2],
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
      crSubtitleSpan.appendChild(createUnparsedSpan(morpheme))
    } else {
      crSubtitleSpan.appendChild(
        createParsedMorphemeSpan(morpheme, separatedForm)
      )
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
