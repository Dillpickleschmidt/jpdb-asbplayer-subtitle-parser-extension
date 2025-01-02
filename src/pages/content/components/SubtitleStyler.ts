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
  baseForm: string | null
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
    span.className = getCardStateClass(vocabEntry?.cardState || null)
  } else {
    span.className = "jpdb-unparsed"
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
    const baseForm = Array.isArray(segmentationData.baseForms[index])
      ? segmentationData.baseForms[index][0]
      : segmentationData.baseForms[index]

    words.push({
      text: surfaceWord,
      position,
      length: surfaceWord.length,
      baseForm,
      vocabularyEntry: baseForm
        ? subtitleData.vocabulary.find((v) => v.spelling === baseForm)
        : null,
    })
    position += surfaceWord.length
  })

  return words
}

function createSpansForSegment(
  text: string,
  jpdbSegment: JpdbSegment,
  ichiMoeWords: IchiMoeWord[],
  subtitleData: ProcessedSubtitle
): HTMLSpanElement {
  console.log("JPDB Vocabulary:", subtitleData.vocabulary)
  console.log("Processed Words:", ichiMoeWords)

  const segmentSpan = document.createElement("span")
  segmentSpan.className = "jpdb-segment"

  // Find all ichi.moe words that overlap with this JPDB segment
  const overlappingWords = ichiMoeWords.filter((word) => {
    const wordEnd = word.position + word.length
    return word.position < jpdbSegment.end && wordEnd > jpdbSegment.position
  })

  let currentPos = jpdbSegment.position

  overlappingWords.forEach((word) => {
    const wordEnd = word.position + word.length

    // Process each separatedForm for the current word
    const separatedForms = Array.isArray(word.baseForm)
      ? word.baseForm
      : [word.baseForm]

    let localPosition = word.position

    separatedForms.forEach((form) => {
      if (!form) return

      const formEnd = localPosition + form.length

      // Ensure the form is within the segment bounds
      const startPos = Math.max(localPosition, jpdbSegment.position)
      const endPos = Math.min(formEnd, jpdbSegment.end)

      if (startPos < endPos) {
        const formPart = text.slice(startPos, endPos)

        // Find the specific vocabulary entry for this form
        const vocabEntry = subtitleData.vocabulary.find(
          (v) => v.spelling === form
        )

        // Assign the correct class based on the vocabulary entry
        const colorSpan = createWordSpan(
          formPart,
          form,
          subtitleData.vocabulary
        )
        colorSpan.className = vocabEntry
          ? getCardStateClass(vocabEntry.cardState)
          : "jpdb-unparsed"

        segmentSpan.appendChild(colorSpan)
        currentPos = endPos
      }

      localPosition += form.length
    })
  })

  // Handle any remaining text within the segment that isn't part of overlapping words
  if (currentPos < jpdbSegment.end) {
    const remainingText = text.slice(currentPos, jpdbSegment.end)
    const unparsedSpan = createWordSpan(
      remainingText,
      null,
      subtitleData.vocabulary
    )
    segmentSpan.appendChild(unparsedSpan)
  }

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
