// frame-handlers.ts
// Handles parent-child iframe communication for subtitle synchronization

// Parent window: Tracks child iframes and their subtitles
export const createFrameInfoListener = () => {
  const iframesById: Record<string, HTMLIFrameElement> = {}

  const handleMessage = (event: MessageEvent) => {
    if (event.data?.type === "asbplayer-frame-info") {
      if (event.source instanceof Window) {
        const iframe = event.source.frameElement as HTMLIFrameElement
        if (iframe) {
          iframesById[event.data.frameId] = iframe
        }
      }
    }
  }

  const bind = () => {
    window.addEventListener("message", handleMessage)
  }

  const unbind = () => {
    window.removeEventListener("message", handleMessage)
  }

  return { bind, unbind, iframesById }
}

// Child frame: Notifies parent window of its presence
export const createFrameInfoBroadcaster = () => {
  const frameId = Math.random().toString(36).substring(2)
  let bound = false

  const broadcastInfo = () => {
    window.parent.postMessage(
      {
        type: "asbplayer-frame-info",
        frameId,
      },
      "*"
    )
  }

  const bind = () => {
    if (bound) return
    bound = true
    broadcastInfo()
  }

  const unbind = () => {
    bound = false
  }

  return { bind, unbind, frameId }
}

export const createFrameHandlers = (isParentDocument: boolean) => {
  const frameInfoListener = isParentDocument
    ? createFrameInfoListener()
    : undefined
  const frameInfoBroadcaster = !isParentDocument
    ? createFrameInfoBroadcaster()
    : undefined

  const unbind = () => {
    frameInfoListener?.unbind()
    frameInfoBroadcaster?.unbind()
  }

  return { frameInfoListener, frameInfoBroadcaster, unbind }
}
