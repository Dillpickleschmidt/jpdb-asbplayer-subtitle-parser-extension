// SubtitleStyler.ts
import { createEffect, onCleanup } from "solid-js"
import { JpdbSubtitleProcessor } from "../services/jpdb-processor"
import { createSubtitleManager } from "../services/subtitle-manager"
import { SubtitleProcessor } from "../services/subtitle-processor"
import "../styles/subtitle.css"
import {
  BatchProcessingResult,
  ProcessedSubtitle,
  SegmentedWords,
} from "../types"
import { getCardStateClass } from "../utils/card-state"

// Types and Interfaces
interface JpdbSegment {
  position: number
  length: number
  end: number
  text: string
  vocabularyIndex: number
}

interface IchiMoeWord {
  text: string
  position: number
  length: number
  baseForm: string | string[] | null
  separatedForm: string | string[]
  vocabularyEntry: any
}

// 1. Main Entry Point & Initialization
export function initializeSubtitleHandler(): void {
  createEffect(() => {
    const state = {
      offscreenSubtitleCollection: [] as HTMLElement[],
      processor: null as SubtitleProcessor | null,
      jpdbProcessor: null as JpdbSubtitleProcessor | null,
      hasProcessedOffscreen: false,
    }

    // Setup handlers
    const handlers = createSubtitleHandlers(state)

    // Bind subtitle manager
    const { bind, unbind } = createSubtitleManager(
      handlers.updateSubtitle,
      handlers.updateOffscreenSubtitle,
      handlers.onObservationComplete
    )

    bind()
    onCleanup(unbind)
  })
}

// 2. Subtitle Handler Creation
function createSubtitleHandlers(state: {
  offscreenSubtitleCollection: HTMLElement[]
  processor: SubtitleProcessor | null
  jpdbProcessor: JpdbSubtitleProcessor | null
  hasProcessedOffscreen: boolean
}) {
  const updateSubtitle = async (element: HTMLElement) => {
    if (!state.processor || !state.jpdbProcessor) return
    await processSubtitle(element, state.processor, state.jpdbProcessor)
  }

  const updateOffscreenSubtitle = (element: HTMLElement) => {
    if (!state.hasProcessedOffscreen) {
      state.offscreenSubtitleCollection.push(element)
    }
  }

  const onObservationComplete = async () => {
    if (!state.hasProcessedOffscreen) {
      state.processor = new SubtitleProcessor(state.offscreenSubtitleCollection)
      state.jpdbProcessor = new JpdbSubtitleProcessor(
        state.offscreenSubtitleCollection
      )
      state.jpdbProcessor.logGroups()
      await state.jpdbProcessor.processGroups()
      state.hasProcessedOffscreen = true
    }
  }

  return { updateSubtitle, updateOffscreenSubtitle, onObservationComplete }
}

// Map to track processed subtitles
const processedSubtitles = new Map<string, boolean>()

// 3. Main Subtitle Processing
async function processSubtitle(
  element: HTMLElement,
  processor: SubtitleProcessor,
  jpdbProcessor: JpdbSubtitleProcessor
): Promise<void> {
  const text = element.textContent?.trim() || ""
  const existingProcessed = element.nextElementSibling as HTMLElement

  // Skip if already processed
  if (processedSubtitles.get(text)) {
    console.log("Skipping already processed subtitle:", text)
    return
  }

  try {
    // Step 1: Get JPDB data (might be cached)
    const jpdbData = await jpdbProcessor.getSegmentationForText(text)

    // Step 2: Process subtitle window with callback
    const onGroupProcessed = async (result: BatchProcessingResult) => {
      // Skip if already processed (double-check in case of race conditions)
      if (processedSubtitles.get(text)) {
        console.log("Skipping already processed subtitle:", text)
        return
      }

      console.log("Processing group for text:", text)
      console.log(
        "Result vocabulary:",
        result.vocabulary.map((v) => v.originalText)
      )
      console.log(
        "Result segmentation:",
        result.segmentation.map((s) => s.originalText)
      )

      const subtitleData = result.vocabulary.find(
        (s) => s.originalText === text
      )
      const segmentationData = result.segmentation.find(
        (s: SegmentedWords) => s.originalText === text
      )

      console.log("Found subtitle data:", !!subtitleData)
      console.log("Found segmentation data:", !!segmentationData)

      if (!subtitleData || !segmentationData || !jpdbData) return

      // Mark as processed before creating DOM elements
      processedSubtitles.set(text, true)

      // Step 3: Create DOM elements
      const resultSpan = getOrCreateResultSpan(element, existingProcessed)

      // Step 4: Process text data
      const jpdbSegments = createJpdbSegments(text, jpdbData)
      const ichiMoeWords = createIchiMoeWords(
        text,
        segmentationData,
        subtitleData
      )

      // Step 5: Create spans and update DOM
      createSpansForText(
        text,
        jpdbSegments,
        ichiMoeWords,
        subtitleData,
        resultSpan
      )
      updateDOM(element, existingProcessed, resultSpan)
    }

    await processor.processSubtitleWindow(text, onGroupProcessed)
  } catch (error) {
    handleProcessingError(error, element, existingProcessed)
  }
}

// 4. Text Processing Functions
function createJpdbSegments(text: string, jpdbData: any): JpdbSegment[] {
  return jpdbData.tokens
    .map((token: [number, number, number]) => ({
      position: token[1],
      length: token[2],
      end: token[1] + token[2],
      text: text.slice(token[1], token[1] + token[2]),
      vocabularyIndex: token[0],
    }))
    .sort((a, b) => a.position - b.position)
}

function createIchiMoeWords(
  text: string,
  segmentationData: SegmentedWords,
  subtitleData: ProcessedSubtitle
): IchiMoeWord[] {
  let position = 0
  const words: IchiMoeWord[] = []

  segmentationData.surfaceForms.forEach((surfaceWord, index) => {
    words.push({
      text: surfaceWord,
      position,
      length: surfaceWord.length,
      baseForm: segmentationData.baseForms[index],
      separatedForm: segmentationData.separatedForms[index],
      vocabularyEntry: null,
    })
    position += surfaceWord.length
  })

  return words
}

function createSpansForWord(
  word: IchiMoeWord,
  segmentStart: number,
  segmentEnd: number,
  subtitleData: ProcessedSubtitle,
  text: string
): HTMLSpanElement[] {
  const spans: HTMLSpanElement[] = []

  if (Array.isArray(word.separatedForm)) {
    // Handle compound word
    let currentPos = word.position
    word.separatedForm.forEach((component, componentIndex) => {
      const componentStart = currentPos
      const componentEnd = currentPos + component.length

      // Only create span if the component overlaps with the current segment
      if (componentStart < segmentEnd && componentEnd > segmentStart) {
        const spanStart = Math.max(componentStart, segmentStart)
        const spanEnd = Math.min(componentEnd, segmentEnd)
        const componentText = text.slice(spanStart, spanEnd)

        const baseForm = Array.isArray(word.baseForm)
          ? word.baseForm[componentIndex]
          : null

        const span = createWordSpan(
          componentText,
          baseForm,
          subtitleData.vocabulary
        )
        spans.push(span)
      }
      currentPos += component.length
    })
  } else {
    // Handle single word
    const wordText = text.slice(
      Math.max(word.position, segmentStart),
      Math.min(word.position + word.length, segmentEnd)
    )
    spans.push(
      createWordSpan(
        wordText,
        word.baseForm as string | null,
        subtitleData.vocabulary
      )
    )
  }

  return spans
}

// 5. Span Creation Hierarchy
function createSpansForText(
  text: string,
  jpdbSegments: JpdbSegment[],
  ichiMoeWords: IchiMoeWord[],
  subtitleData: ProcessedSubtitle,
  resultSpan: HTMLSpanElement
): void {
  let currentPosition = 0

  // Handle text before first segment
  if (jpdbSegments.length > 0 && jpdbSegments[0].position > 0) {
    appendNonSegmentText(
      text,
      0,
      jpdbSegments[0].position,
      subtitleData,
      resultSpan
    )
    currentPosition = jpdbSegments[0].position
  }

  // Process each JPDB segment
  jpdbSegments.forEach((segment) => {
    // Add text between segments
    if (segment.position > currentPosition) {
      appendNonSegmentText(
        text,
        currentPosition,
        segment.position,
        subtitleData,
        resultSpan
      )
    }

    // Create and append segment spans
    const segmentSpan = createSpansForSegment(
      text,
      segment,
      ichiMoeWords,
      subtitleData
    )
    resultSpan.appendChild(segmentSpan)

    currentPosition = segment.position + segment.length
  })

  // Handle remaining text
  if (currentPosition < text.length) {
    appendNonSegmentText(
      text,
      currentPosition,
      text.length,
      subtitleData,
      resultSpan
    )
  }
}

function createSpansForSegment(
  text: string,
  jpdbSegment: JpdbSegment,
  ichiMoeWords: IchiMoeWord[],
  subtitleData: ProcessedSubtitle
): HTMLSpanElement {
  const segmentSpan = document.createElement("span")
  segmentSpan.className = "jpdb-segment"

  const overlappingWords = findOverlappingWords(jpdbSegment, ichiMoeWords)

  if (overlappingWords.length === 0) {
    const unparsedSpan = createWordSpan(
      jpdbSegment.text,
      null,
      subtitleData.vocabulary
    )
    segmentSpan.appendChild(unparsedSpan)
    return segmentSpan
  }

  overlappingWords.forEach((word) => {
    const wordSpans = createSpansForWord(
      word,
      jpdbSegment.position,
      jpdbSegment.end,
      subtitleData,
      text
    )
    wordSpans.forEach((span) => segmentSpan.appendChild(span))
  })

  return segmentSpan
}

// 6. Helper Functions
function getOrCreateResultSpan(
  element: HTMLElement,
  existingProcessed: HTMLElement
): HTMLSpanElement {
  const resultSpan = existingProcessed?.classList.contains("cr-subtitle")
    ? existingProcessed
    : document.createElement("span")

  resultSpan.className = "cr-subtitle"
  resultSpan.innerHTML = ""

  return resultSpan
}

function updateDOM(
  element: HTMLElement,
  existingProcessed: HTMLElement,
  resultSpan: HTMLSpanElement
): void {
  if (!existingProcessed?.classList.contains("cr-subtitle")) {
    element.parentNode?.insertBefore(resultSpan, element.nextSibling)
    element.classList.add("hidden")
    element.removeAttribute("style")
  }
}

function handleProcessingError(
  error: any,
  element: HTMLElement,
  existingProcessed: HTMLElement
): void {
  console.error("Error processing subtitle:", error)
  if (!existingProcessed?.classList.contains("cr-subtitle")) {
    const errorSpan = document.createElement("span")
    errorSpan.textContent = element.textContent || ""
    element.parentNode?.insertBefore(errorSpan, element.nextSibling)
  }
}

function findOverlappingWords(
  segment: JpdbSegment,
  words: IchiMoeWord[]
): IchiMoeWord[] {
  return words.filter((word) => {
    const wordEnd = word.position + word.length
    return word.position < segment.end && wordEnd > segment.position
  })
}

function appendNonSegmentText(
  text: string,
  start: number,
  end: number,
  subtitleData: ProcessedSubtitle,
  resultSpan: HTMLSpanElement
): void {
  const nonSegmentText = text.slice(start, end)
  const span = createWordSpan(nonSegmentText, null, subtitleData.vocabulary)
  resultSpan.appendChild(span)
}

function createWordSpan(
  text: string,
  baseForm: string | null,
  vocabulary: ProcessedSubtitle["vocabulary"]
): HTMLSpanElement {
  const span = document.createElement("span")
  span.textContent = text

  if (baseForm) {
    const vocabEntry = vocabulary.find((v) => v.spelling === baseForm)
    span.className = `jpdb-word ${getCardStateClass(vocabEntry?.cardState || null)}`
  } else {
    span.className = "jpdb-word jpdb-unparsed"
  }

  return span
}
