import { createEffect, onCleanup } from "solid-js"
import { processJpdb } from "../services/jpdb-service"
import handleOffscreenSubtitles from "../services/offscreen-subtitle-processor"
import { createSubtitleManager } from "../services/subtitle-manager"
import "../styles/subtitle.css"

export const initializeSubtitleHandler = () => {
  createEffect(() => {
    let offscreenSubtitleCollection: HTMLElement[] = []
    let isOffscreenProcessed = false

    const updateSubtitle = async (element: HTMLElement) => {
      // Skip if already processed or if next element is our processed subtitle
      if (element.nextElementSibling?.classList.contains("cr-subtitle")) return

      try {
        const text = element.textContent?.trim() || ""
        console.log("Processing subtitle text:", text)

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
      if (!isOffscreenProcessed) {
        offscreenSubtitleCollection.push(element)

        // Simulate a check for all spans being collected
        if (true) {
          /* condition to determine all spans are collected */
          handleOffscreenSubtitles(offscreenSubtitleCollection)
          isOffscreenProcessed = true
        }
      }
    }

    const { bind, unbind } = createSubtitleManager(
      updateSubtitle,
      updateOffscreenSubtitle
    )

    bind()
    onCleanup(unbind)
  })
}
