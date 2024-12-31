// subtitle-manager.ts
import { createFrameHandlers } from "./frame-handlers"
import { createSubtitleObserver } from "./subtitle-observer"

// Coordinates subtitle observation across different contexts (main window, iframes)
export const createSubtitleManager = (
  updateCallback: (element: HTMLElement) => void
) => {
  const isParentDocument = window.self === window.top
  const frameHandlers = createFrameHandlers(isParentDocument)
  const observer = createSubtitleObserver(
    updateCallback,
    frameHandlers.frameInfoListener
  )

  const bind = () => {
    observer.bind()
  }

  const unbind = () => {
    observer.unbind()
    frameHandlers.unbind()
  }

  return { bind, unbind }
}
