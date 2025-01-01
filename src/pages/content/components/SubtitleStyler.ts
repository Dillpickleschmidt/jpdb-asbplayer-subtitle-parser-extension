// SubtitleStyler.ts
import { createEffect, onCleanup } from "solid-js"
import { createSubtitleManager } from "../services/subtitle-manager"
import { SubtitleProcessor } from "../services/subtitle-processor"
import "../styles/subtitle.css"
import { IchiMoeProcessedWord } from "../types"
import { getCardStateClass } from "../utils/card-state"

export const initializeSubtitleHandler = () => {
  createEffect(() => {
    const offscreenSubtitleCollection: HTMLElement[] = []
    let processor: SubtitleProcessor | null = null
    let hasProcessedOffscreen = false

    const updateSubtitle = async (element: HTMLElement) => {
      if (element.nextElementSibling?.classList.contains("cr-subtitle")) {
        console.log("Found existing onscreen subtitle, skipping processing...")
        return
      }

      try {
        const text = element.textContent?.trim() || ""
        console.log("Detected onscreen subtitle:", text)

        if (!processor) {
          console.log("Missing processor, skipping processing...")
          return
        }

        const result = await processor.processSubtitleWindow(text)
        if (result) {
          console.log("Processed data:", result)

          const subtitleData = result.vocabulary.find(
            (s) => s.originalText === text
          )
          const segmentationData = result.segmentation.find(
            (s: IchiMoeProcessedWord) => s.originalText === text
          )

          if (subtitleData && segmentationData) {
            const resultSpan = document.createElement("span")
            resultSpan.className = "cr-subtitle"

            let currentPosition = 0

            // Process each word and its components
            segmentationData.surfaceForm.forEach((surfaceWord, index) => {
              const separatedForm = segmentationData.separatedForm[index]
              const baseForm = segmentationData.baseForm[index]

              if (Array.isArray(separatedForm)) {
                // Handle compound word
                separatedForm.forEach((component, componentIndex) => {
                  const span = document.createElement("span")
                  span.textContent = component

                  const baseComponent = Array.isArray(baseForm)
                    ? baseForm[componentIndex]
                    : null
                  // Match vocabulary using both spelling and word for compounds
                  const vocabEntry = subtitleData.vocabulary.find(
                    (v) =>
                      (baseComponent && v.spelling === baseComponent) ||
                      v.position === text.indexOf(component, currentPosition)
                  )

                  span.className = `jpdb-word ${getCardStateClass(vocabEntry?.cardState || null)}`
                  resultSpan.appendChild(span)
                  currentPosition += component.length
                })
              } else {
                const span = document.createElement("span")
                span.textContent = surfaceWord

                // Find matching vocabulary entry with more flexible matching
                const vocabEntry = subtitleData.vocabulary.find((v) => {
                  const wordMatch =
                    v.word === surfaceWord || v.spelling === surfaceWord
                  const positionMatch =
                    Math.abs(v.position - currentPosition) <= 1 // Allow small position variance
                  return (
                    wordMatch ||
                    (positionMatch && v.length === surfaceWord.length)
                  )
                })

                span.className = `jpdb-word ${getCardStateClass(vocabEntry?.cardState || null)}`
                resultSpan.appendChild(span)
                currentPosition += surfaceWord.length
              }
            })

            console.log("Final DOM structure:", resultSpan.outerHTML)

            element.parentNode?.insertBefore(resultSpan, element.nextSibling)
            element.classList.add("hidden")
            element.removeAttribute("style")
          }
        }
      } catch (error) {
        console.error("Error processing subtitle:", error)
        const errorSpan = document.createElement("span")
        errorSpan.className = "jpdb-word jpdb-unparsed"
        errorSpan.textContent = element.textContent?.trim() || ""
        element.parentNode?.insertBefore(errorSpan, element.nextSibling)
      }
    }

    const updateOffscreenSubtitle = (element: HTMLElement) => {
      // Only collect subtitles if we haven't processed them yet
      if (!hasProcessedOffscreen) {
        offscreenSubtitleCollection.push(element)
      }
    }

    const onObservationComplete = () => {
      // Only process offscreen subtitles once
      if (!hasProcessedOffscreen) {
        console.log("Processing initial offscreen subtitle collection")
        processor = new SubtitleProcessor(offscreenSubtitleCollection)
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
