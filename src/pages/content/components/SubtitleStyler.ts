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

function createSpansForSegment(
  text: string,
  jpdbSegment: JpdbSegment,
  ichiMoeWords: IchiMoeWord[],
  subtitleData: ProcessedSubtitle
): HTMLSpanElement {
  const segmentSpan = document.createElement("span")
  segmentSpan.className = "jpdb-segment"

  const overlappingWords = ichiMoeWords.filter((word) => {
    const wordEnd = word.position + word.length
    return word.position < jpdbSegment.end && wordEnd > jpdbSegment.position
  })

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
    const spans = createSpansForWord(
      word,
      jpdbSegment.position,
      jpdbSegment.end,
      subtitleData,
      text
    )
    spans.forEach((span) => segmentSpan.appendChild(span))
  })

  return segmentSpan
}

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
    const nonSegmentText = text.slice(0, jpdbSegments[0].position)
    const span = createWordSpan(nonSegmentText, null, subtitleData.vocabulary)
    resultSpan.appendChild(span)
    currentPosition = jpdbSegments[0].position
  }

  // Process each JPDB segment
  jpdbSegments.forEach((segment) => {
    // Add text between segments if there is any
    if (segment.position > currentPosition) {
      const nonSegmentText = text.slice(currentPosition, segment.position)
      const span = createWordSpan(nonSegmentText, null, subtitleData.vocabulary)
      resultSpan.appendChild(span)
    }

    // Create the JPDB segment with its inner colorized spans
    const segmentSpan = createSpansForSegment(
      text,
      segment,
      ichiMoeWords,
      subtitleData
    )
    resultSpan.appendChild(segmentSpan)

    currentPosition = segment.position + segment.length
  })

  // Handle any remaining text after the last segment
  if (currentPosition < text.length) {
    const remainingText = text.slice(currentPosition)
    const span = createWordSpan(remainingText, null, subtitleData.vocabulary)
    resultSpan.appendChild(span)
  }
}

async function processSubtitle(
  element: HTMLElement,
  processor: SubtitleProcessor,
  jpdbProcessor: JpdbSubtitleProcessor
): Promise<void> {
  const text = element.textContent?.trim() || ""
  const existingProcessed = element.nextElementSibling as HTMLElement

  try {
    let hasProcessed = false

    const onGroupProcessed = async (result: BatchProcessingResult) => {
      if (hasProcessed) return

      const subtitleData = result.vocabulary.find(
        (s) => s.originalText === text
      )
      const segmentationData = result.segmentation.find(
        (s: SegmentedWords) => s.originalText === text
      )
      const jpdbData = await jpdbProcessor.getSegmentationForText(text)

      if (!subtitleData || !segmentationData || !jpdbData) return

      hasProcessed = true
      console.log("Processing text:", text)
      console.log("JPDB data:", jpdbData)

      const resultSpan = existingProcessed?.classList.contains("cr-subtitle")
        ? existingProcessed
        : document.createElement("span")

      resultSpan.className = "cr-subtitle"
      resultSpan.innerHTML = ""

      const jpdbSegments = createJpdbSegments(text, jpdbData)
      const ichiMoeWords = createIchiMoeWords(
        text,
        segmentationData,
        subtitleData
      )

      createSpansForText(
        text,
        jpdbSegments,
        ichiMoeWords,
        subtitleData,
        resultSpan
      )

      if (!existingProcessed?.classList.contains("cr-subtitle")) {
        element.parentNode?.insertBefore(resultSpan, element.nextSibling)
        element.classList.add("hidden")
        element.removeAttribute("style")
      }
    }

    await processor.processSubtitleWindow(text, onGroupProcessed)
  } catch (error) {
    console.error("Error processing subtitle:", error)
    if (!existingProcessed?.classList.contains("cr-subtitle")) {
      const errorSpan = document.createElement("span")
      errorSpan.textContent = text
      element.parentNode?.insertBefore(errorSpan, element.nextSibling)
    }
  }
}

export function initializeSubtitleHandler(): void {
  createEffect(() => {
    const offscreenSubtitleCollection: HTMLElement[] = []
    let processor: SubtitleProcessor | null = null
    let jpdbProcessor: JpdbSubtitleProcessor | null = null
    let hasProcessedOffscreen = false

    const updateSubtitle = async (element: HTMLElement) => {
      if (!processor || !jpdbProcessor) return
      await processSubtitle(element, processor, jpdbProcessor)
    }

    const updateOffscreenSubtitle = (element: HTMLElement) => {
      if (!hasProcessedOffscreen) {
        offscreenSubtitleCollection.push(element)
      }
    }

    const onObservationComplete = async () => {
      if (!hasProcessedOffscreen) {
        processor = new SubtitleProcessor(offscreenSubtitleCollection)
        jpdbProcessor = new JpdbSubtitleProcessor(offscreenSubtitleCollection)
        jpdbProcessor.logGroups()
        await jpdbProcessor.processGroups()
        hasProcessedOffscreen = true
      }
    }

    const { bind, unbind } = createSubtitleManager(
      updateSubtitle,
      updateOffscreenSubtitle,
      onObservationComplete
    )

    bind()
    onCleanup(unbind)
  })
}
