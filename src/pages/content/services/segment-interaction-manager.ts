// segment-interaction-manager.ts

export function createSegmentInteractionManager() {
  let isHovering = false
  let isOpen = false

  const handleMouseEnter = (e: MouseEvent) => {
    const target = e.target
    if (
      target instanceof Element &&
      target.classList.contains("jpdb-segment")
    ) {
      isHovering = true
    }
  }

  const handleMouseLeave = (e: MouseEvent) => {
    const target = e.target
    if (
      target instanceof Element &&
      target.classList.contains("jpdb-segment")
    ) {
      isHovering = false
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Shift") {
      if (isHovering && !isOpen) {
        isOpen = true
        console.log("opened")
      } else if (isOpen) {
        isOpen = false
        console.log("closed")
      }
    } else if (e.key === "Escape" && isOpen) {
      isOpen = false
      console.log("closed")
    }
  }

  const bind = () => {
    document.addEventListener("mouseenter", handleMouseEnter, true)
    document.addEventListener("mouseleave", handleMouseLeave, true)
    document.addEventListener("keydown", handleKeyDown)
  }

  const unbind = () => {
    document.removeEventListener("mouseenter", handleMouseEnter, true)
    document.removeEventListener("mouseleave", handleMouseLeave, true)
    document.removeEventListener("keydown", handleKeyDown)
  }

  return { bind, unbind }
}
