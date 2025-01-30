// subtitle-observer.ts
import { createFrameInfoListener } from "./frame-handlers"

const SUBTITLE_SELECTOR = `
  .asbplayer-subtitles-container-bottom .asbplayer-subtitles span,
  .asbplayer-fullscreen-subtitles span
`.trim()

export const createSubtitleObserver = (
  updateCallback: (element: HTMLElement) => void,
  frameInfoListener?: ReturnType<typeof createFrameInfoListener>
) => {
  const mainObserver = new MutationObserver(handleMainDocumentMutations)
  const shadowObserver = new MutationObserver(handleShadowDomMutations)

  // Set to cache processed elements
  const processedElements = new Set<string>()

  function generateElementKey(element: HTMLElement): string {
    return (
      element.id || `${element.tagName}-${element.textContent?.trim() || ""}`
    )
  }

  function safeUpdateCallback(element: HTMLElement) {
    // Skip if already a cr-subtitle or has one as next sibling
    if (
      element.classList.contains("cr-subtitle") ||
      element.nextElementSibling?.classList.contains("cr-subtitle")
    ) {
      return
    }

    const key = generateElementKey(element)
    if (!processedElements.has(key)) {
      processedElements.add(key)
      updateCallback(element)
    }
  }

  function handleMainDocumentMutations(mutations: MutationRecord[]) {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) {
          if (node.classList.contains("cr-subtitle")) {
            return
          }

          if (
            node.matches(SUBTITLE_SELECTOR) &&
            !node.classList.contains("cr-subtitle")
          ) {
            safeUpdateCallback(node)
          }

          node
            .querySelectorAll(`${SUBTITLE_SELECTOR}:not(.cr-subtitle)`)
            .forEach((el) => safeUpdateCallback(el as HTMLElement))
        }
      })
    })
  }

  function handleShadowDomMutations(mutations: MutationRecord[]) {
    mutations.forEach((mutation) => {
      const target = mutation.target
      if (target instanceof Element && target.shadowRoot) {
        target.shadowRoot
          .querySelectorAll(`${SUBTITLE_SELECTOR}:not(.cr-subtitle)`)
          .forEach((el) => safeUpdateCallback(el as HTMLElement))
      }
    })
  }

  function checkExistingSubtitles() {
    document
      .querySelectorAll(SUBTITLE_SELECTOR)
      .forEach((el) => safeUpdateCallback(el as HTMLElement))

    document.querySelectorAll("*").forEach((host) => {
      if (host.shadowRoot) {
        host.shadowRoot
          .querySelectorAll(SUBTITLE_SELECTOR)
          .forEach((el) => safeUpdateCallback(el as HTMLElement))
      }
    })

    if (frameInfoListener) {
      Object.values(frameInfoListener.iframesById).forEach((iframe) => {
        try {
          const iframeDoc =
            iframe.contentDocument || iframe.contentWindow?.document
          if (iframeDoc) {
            iframeDoc
              .querySelectorAll(SUBTITLE_SELECTOR)
              .forEach((el) => safeUpdateCallback(el as HTMLElement))
          }
        } catch (e) {
          // Silently handle cross-origin iframe access restrictions
        }
      })
    }
  }

  const bind = () => {
    mainObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "class"],
    })

    document.querySelectorAll("*").forEach((host) => {
      if (host.shadowRoot) {
        shadowObserver.observe(host.shadowRoot, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ["style", "class"],
        })
      }
    })

    checkExistingSubtitles()
  }

  const unbind = () => {
    mainObserver.disconnect()
    shadowObserver.disconnect()
    processedElements.clear()
  }

  return { bind, unbind }
}

// Offscreen Observer (Unchanged)
export const createOffscreenSubtitleObserver = (
  updateCallback: (element: HTMLElement) => void,
  onComplete: () => void
) => {
  const offscreenProcessedTexts = new Set<string>()
  let lastProcessedCount = 0 // Track the last processed count

  const offscreenObserver = new MutationObserver((mutations) => {
    const newSubtitles: HTMLElement[] = []

    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) {
          const elements = node.matches(
            "body > div.asbplayer-offscreen > div > span"
          )
            ? [node]
            : Array.from(
                node.querySelectorAll(
                  "body > div.asbplayer-offscreen > div > span"
                )
              )

          elements.forEach((el) => {
            const text = el.textContent?.replace(/[+-]\d+ms/g, "").trim() || ""
            if (!offscreenProcessedTexts.has(text)) {
              offscreenProcessedTexts.add(text)
              newSubtitles.push(el as HTMLElement)
            }
          })
        }
      })
    })

    // Only process if we have a significant change in subtitle count (>10)
    const countDiff = Math.abs(
      offscreenProcessedTexts.size - lastProcessedCount
    )
    if (countDiff > 10 && newSubtitles.length > 0) {
      lastProcessedCount = offscreenProcessedTexts.size
      newSubtitles.forEach((el) => updateCallback(el))
      console.log(
        `Offscreen subtitles processing complete: ${newSubtitles.length} new subtitles`
      )
      onComplete()
    }
  })

  const bind = () => {
    offscreenObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "class"],
    })
  }

  const unbind = () => {
    offscreenObserver.disconnect()
    offscreenProcessedTexts.clear()
    lastProcessedCount = 0
  }

  return { bind, unbind }
}
