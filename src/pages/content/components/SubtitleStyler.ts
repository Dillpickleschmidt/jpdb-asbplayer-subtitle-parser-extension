// SubtitleStyler.ts
import { createEffect, onCleanup } from "solid-js"
import { createSubtitleManager } from "../services/subtitle-manager"
import { SubtitleProcessor } from "../services/subtitle-processor"
import "../styles/subtitle.css"
import { BatchProcessingResult, IchiMoeProcessedWord } from "../types"
import { getCardStateClass } from "../utils/card-state"

export const initializeSubtitleHandler = () => {
  createEffect(() => {
    const offscreenSubtitleCollection: HTMLElement[] = []
    let processor: SubtitleProcessor | null = null
    let hasProcessedOffscreen = false

    const updateSubtitle = async (element: HTMLElement) => {
      const text = element.textContent?.trim() || ""
      const existingProcessed = element.nextElementSibling as HTMLElement

      try {
        if (!processor) {
          // console.error("Missing processor, skipping...")
          return
        }

        const onGroupProcessed = (result: BatchProcessingResult) => {
          const subtitleData = result.vocabulary.find(
            (s) => s.originalText === text
          )
          const segmentationData = result.segmentation.find(
            (s: IchiMoeProcessedWord) => s.originalText === text
          )

          if (subtitleData && segmentationData) {
            const resultSpan = existingProcessed?.classList.contains(
              "cr-subtitle"
            )
              ? existingProcessed
              : document.createElement("span")

            resultSpan.className = "cr-subtitle"
            resultSpan.innerHTML = ""

            let currentPosition = 0

            segmentationData.surfaceForm.forEach((surfaceWord, index) => {
              const separatedForm = segmentationData.separatedForm[index]
              const baseForm = segmentationData.baseForm[index]

              if (Array.isArray(separatedForm)) {
                // Handle compound word
                separatedForm.forEach((component, componentIndex) => {
                  const span = document.createElement("span")
                  span.textContent = component

                  if (Array.isArray(baseForm)) {
                    const baseComponent = baseForm[componentIndex]
                    // Find vocabulary entry that matches this base form
                    const vocabEntry = subtitleData.vocabulary.find(
                      (v) => v.spelling === baseComponent
                    )
                    span.className = `jpdb-word ${getCardStateClass(vocabEntry?.cardState || null)}`
                  } else {
                    span.className = "jpdb-word jpdb-unparsed"
                  }

                  resultSpan.appendChild(span)
                  currentPosition += component.length
                })
              } else {
                const span = document.createElement("span")
                span.textContent = surfaceWord

                // Only look for vocabulary match if we have a base form
                if (baseForm) {
                  const vocabEntry = subtitleData.vocabulary.find(
                    (v) =>
                      v.spelling ===
                      (Array.isArray(baseForm) ? baseForm[0] : baseForm)
                  )
                  span.className = `jpdb-word ${getCardStateClass(vocabEntry?.cardState || null)}`
                } else {
                  span.className = "jpdb-word jpdb-unparsed"
                }

                resultSpan.appendChild(span)
                currentPosition += surfaceWord.length
              }
            })

            if (!existingProcessed?.classList.contains("cr-subtitle")) {
              element.parentNode?.insertBefore(resultSpan, element.nextSibling)
              element.classList.add("hidden")
              element.removeAttribute("style")
            }
          }
        }

        await processor.processSubtitleWindow(text, onGroupProcessed)
      } catch (error) {
        console.error("Error processing subtitle:", error)
        if (!existingProcessed?.classList.contains("cr-subtitle")) {
          const errorSpan = document.createElement("span")
          errorSpan.className = "jpdb-word jpdb-unparsed"
          errorSpan.textContent = text
          element.parentNode?.insertBefore(errorSpan, element.nextSibling)
        }
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
