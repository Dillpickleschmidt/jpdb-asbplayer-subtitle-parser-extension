// subtitle-observer.ts
import { createFrameInfoListener } from "./frame-handlers"

// Observes DOM mutations to catch and style subtitle elements, handling both
// regular DOM and shadow DOM contexts
export const createSubtitleObserver = (
  updateCallback: (element: HTMLElement) => void,
  frameInfoListener?: ReturnType<typeof createFrameInfoListener>
) => {
  const mainObserver = new MutationObserver(handleMainDocumentMutations)
  const shadowObserver = new MutationObserver(handleShadowDomMutations)

  function handleMainDocumentMutations(mutations: MutationRecord[]) {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) {
          // Skip if this is one of our character count spans
          if (node.classList.contains("cr-subtitle")) {
            return
          }

          // Original subtitle node check
          if (
            node.matches(
              ".asbplayer-subtitles-container-bottom .asbplayer-subtitles span"
            ) &&
            !node.classList.contains("cr-subtitle")
          ) {
            updateCallback(node)
          }

          // Check child nodes, excluding our count spans
          node
            .querySelectorAll(
              ".asbplayer-subtitles-container-bottom .asbplayer-subtitles span:not(.cr-subtitle)"
            )
            .forEach((el) => updateCallback(el as HTMLElement))
        }
      })
    })
  }

  function handleShadowDomMutations(mutations: MutationRecord[]) {
    mutations.forEach((mutation) => {
      const target = mutation.target
      if (target instanceof Element && target.shadowRoot) {
        target.shadowRoot
          .querySelectorAll(
            ".asbplayer-subtitles-container-bottom .asbplayer-subtitles span:not(.cr-subtitle)"
          )
          .forEach((el) => updateCallback(el as HTMLElement))
      }
    })
  }

  // Initial sweep to catch any existing subtitles before observers are attached
  function checkExistingSubtitles() {
    document
      .querySelectorAll(
        ".asbplayer-subtitles-container-bottom .asbplayer-subtitles span"
      )
      .forEach((el) => updateCallback(el as HTMLElement))

    document.querySelectorAll("*").forEach((host) => {
      if (host.shadowRoot) {
        host.shadowRoot
          .querySelectorAll(
            ".asbplayer-subtitles-container-bottom .asbplayer-subtitles span"
          )
          .forEach((el) => updateCallback(el as HTMLElement))
      }
    })

    // Check iframes, handling potential cross-origin restrictions
    if (frameInfoListener) {
      Object.values(frameInfoListener.iframesById).forEach((iframe) => {
        try {
          const iframeDoc =
            iframe.contentDocument || iframe.contentWindow?.document
          if (iframeDoc) {
            iframeDoc
              .querySelectorAll(
                ".asbplayer-subtitles-container-bottom .asbplayer-subtitles span"
              )
              .forEach((el) => updateCallback(el as HTMLElement))
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
  }

  return { bind, unbind }
}

// Separate observer for offscreen subtitles
export const createOffscreenSubtitleObserver = (
  updateCallback: (element: HTMLElement) => void,
  onComplete: () => void // Callback to signal all spans have been collected
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
                console.log("Offscreen subtitle:", el.textContent)
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
