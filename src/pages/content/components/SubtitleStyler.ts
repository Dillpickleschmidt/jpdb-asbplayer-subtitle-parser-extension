// SubtitleStyler.ts
import { createEffect, onCleanup } from "solid-js"
import { processJpdb } from "../services/jpdb-service"
import {
  type ProcessingState,
  createSubtitleGroups,
  processSubtitleWindow,
} from "../services/offscreen-subtitle-processor"
import { createSubtitleManager } from "../services/subtitle-manager"
import "../styles/subtitle.css"

export const initializeSubtitleHandler = () => {
  createEffect(() => {
    const offscreenSubtitleCollection: HTMLElement[] = []
    let state: ProcessingState | null = null
    let hasProcessedOffscreen = false

    const updateSubtitle = async (element: HTMLElement) => {
      // Skip if already processed or if next element is our processed subtitle
      if (element.nextElementSibling?.classList.contains("cr-subtitle")) return

      try {
        const text = element.textContent?.trim() || ""
        console.log("Detected onscreen subtitle:", text)

        // Process the subtitle if we have state
        if (state) {
          processSubtitleWindow(text, state)
        }

        const resultSpan = document.createElement("span")
        resultSpan.className = "cr-subtitle"

        const processedContent = await processJpdb(text)
        resultSpan.appendChild(processedContent)

        console.log("Final DOM structure:", resultSpan.outerHTML)

        // Insert the new span after the original
        element.parentNode?.insertBefore(resultSpan, element.nextSibling)

        // Hide the original span
        element.classList.add("hidden")
        element.removeAttribute("style")
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
        state = createSubtitleGroups(offscreenSubtitleCollection)
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
