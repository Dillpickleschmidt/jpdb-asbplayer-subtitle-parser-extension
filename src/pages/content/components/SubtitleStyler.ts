// SubtitleStyler.ts
import { createEffect, onCleanup } from "solid-js"
import { processJpdb } from "../services/jpdb-service"
import { createSubtitleManager } from "../services/subtitle-manager"
import "../styles/subtitle.css" // Updated path for subtitle CSS

export const initializeSubtitleHandler = () => {
  createEffect(() => {
    const updateSubtitle = async (element: HTMLElement) => {
      if (
        element.classList.contains("hidden") ||
        element.nextElementSibling?.classList.contains("character-count")
      ) {
        return
      }

      element.removeAttribute("style")
      element.classList.add("hidden")

      try {
        const text = element.textContent?.trim() || ""
        console.log("Processing subtitle text:", text)

        const resultSpan = document.createElement("span")
        resultSpan.className = "cr-subtitle character-count"

        const processedContent = await processJpdb(text)
        resultSpan.appendChild(processedContent)

        console.log("Final DOM structure:", resultSpan.outerHTML)

        element.parentNode?.insertBefore(resultSpan, element.nextSibling)
      } catch (error) {
        console.error("Error processing subtitle:", error)
        const errorSpan = document.createElement("span")
        errorSpan.className = "cr-subtitle character-count"
        errorSpan.textContent = "Processing error"
        element.parentNode?.insertBefore(errorSpan, element.nextSibling)
      }
    }

    const { bind, unbind } = createSubtitleManager(updateSubtitle)
    bind()
    onCleanup(unbind)
  })
}
