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

  // Cache to prevent duplicate processing
  const processedTexts = new Map<string, number>()
  const CACHE_TIMEOUT = 1000 // 1 second

  function isRecentlyProcessed(text: string): boolean {
    const lastProcessed = processedTexts.get(text)
    if (!lastProcessed) return false

    const now = Date.now()
    if (now - lastProcessed > CACHE_TIMEOUT) {
      processedTexts.delete(text)
      return false
    }
    return true
  }

  function markProcessed(text: string) {
    processedTexts.set(text, Date.now())
  }

  function safeUpdateCallback(element: HTMLElement) {
    const text = element.textContent || ""
    if (!isRecentlyProcessed(text)) {
      markProcessed(text)
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
    processedTexts.clear()
  }

  return { bind, unbind }
}

// Separate observer for offscreen subtitles
export const createOffscreenSubtitleObserver = (
  updateCallback: (element: HTMLElement) => void,
  onComplete: () => void
) => {
  let complete = true
  const offscreenObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) {
          if (
            node.matches("body > div.asbplayer-offscreen > div > span") ||
            node.querySelector("body > div.asbplayer-offscreen > div > span")
          ) {
            node
              .querySelectorAll(
                "body > div.asbplayer-offscreen > div > span:not(.cr-subtitle)"
              )
              .forEach((el) => {
                updateCallback(el as HTMLElement)
                complete = false
              })
          }
        }
      })
    })
    if (!complete) {
      onComplete()
      complete = true
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
  }

  return { bind, unbind }
}
