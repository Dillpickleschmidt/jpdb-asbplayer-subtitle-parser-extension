// SubtitleStyler.ts
import { createEffect, onCleanup } from "solid-js"
import { processJpdb } from "../services/jpdb-service"
import { createSubtitleManager } from "../services/subtitle-manager"
import "../styles/subtitle.css" // Updated path for subtitle CSS

export const initializeSubtitleHandler = () => {
  createEffect(() => {
    const updateSubtitle = async (element: HTMLElement) => {
      // Skip if already processed or if next element is our processed subtitle
      if (element.nextElementSibling?.classList.contains("cr-subtitle")) {
        return
      }

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

    const { bind, unbind } = createSubtitleManager(updateSubtitle)
    bind()
    onCleanup(unbind)
  })
}
