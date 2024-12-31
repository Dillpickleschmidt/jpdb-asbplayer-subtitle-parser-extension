// subtitle-manager.ts
import { createFrameHandlers } from "./frame-handlers"
import {
  createOffscreenSubtitleObserver,
  createSubtitleObserver,
} from "./subtitle-observer"

// Coordinates subtitle observation across different contexts (main window, iframes)
export const createSubtitleManager = (
  updateCallback: (element: HTMLElement) => void,
  offscreenCallback: (element: HTMLElement) => void
) => {
  const isParentDocument = window.self === window.top
  const frameHandlers = createFrameHandlers(isParentDocument)
  const observer = createSubtitleObserver(
    updateCallback,
    frameHandlers.frameInfoListener
  )
  const offscreenObserver = createOffscreenSubtitleObserver(offscreenCallback)

  const bind = () => {
    observer.bind()
    offscreenObserver.bind()
  }

  const unbind = () => {
    observer.unbind()
    offscreenObserver.unbind()
    frameHandlers.unbind()
  }

  return { bind, unbind }
}
