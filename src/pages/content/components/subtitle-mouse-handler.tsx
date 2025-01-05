// subtitle-mouse-handler.tsx
import { render } from "solid-js/web"
import { ProcessedSubtitle } from "../types"
import VocabularyTooltip from "./VocabularyTooltip"

export class SubtitleMouseHandler {
  private processedResults: Map<string, ProcessedSubtitle>
  private activeSegment: HTMLElement | null = null
  private hoveredSegment: HTMLElement | null = null
  private dispose: (() => void) | null = null
  private isShiftPressed = false

  constructor(processedResults: Map<string, ProcessedSubtitle>) {
    this.processedResults = processedResults
    this.initialize()
  }

  private initialize(): void {
    document.addEventListener("keydown", this.handleKeyDown.bind(this))
    document.addEventListener("keyup", this.handleKeyUp.bind(this))
    document.addEventListener("mouseover", this.handleMouseOver.bind(this))
    document.addEventListener("mouseout", this.handleMouseOut.bind(this))
    document.addEventListener("click", this.handleClick.bind(this))
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.closeTooltip()
    })
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key === "Shift" && !this.isShiftPressed) {
      this.isShiftPressed = true
      if (this.hoveredSegment) {
        this.processSegment(this.hoveredSegment)
      }
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    if (event.key === "Shift") {
      this.isShiftPressed = false
      if (this.activeSegment !== this.hoveredSegment) {
        this.closeTooltip()
      }
    }
  }

  private handleMouseOver(event: MouseEvent): void {
    const segment = (event.target as HTMLElement).closest(
      ".jpdb-segment"
    ) as HTMLElement
    if (segment) {
      this.hoveredSegment = segment
      if (this.isShiftPressed) {
        this.processSegment(segment)
      }
    }
  }

  private handleMouseOut(event: MouseEvent): void {
    const segment = (event.target as HTMLElement).closest(
      ".jpdb-segment"
    ) as HTMLElement
    if (segment && this.hoveredSegment === segment) {
      this.hoveredSegment = null
    }
  }

  private handleClick(event: MouseEvent): void {
    const clickedSegment = (event.target as HTMLElement).closest(
      ".jpdb-segment"
    ) as HTMLElement
    if (!clickedSegment || clickedSegment !== this.activeSegment) {
      this.closeTooltip()
    }
  }

  private closeTooltip(): void {
    if (this.dispose) {
      this.dispose()
      this.dispose = null
      this.activeSegment = null
    }
  }

  private processSegment(segment: HTMLElement): void {
    if (segment === this.activeSegment) return

    if (this.activeSegment) {
      this.closeTooltip()
    }

    const subtitleContainer = segment.closest(".cr-subtitle") as HTMLElement
    if (!subtitleContainer) return

    const originalSubtitle =
      subtitleContainer.previousElementSibling as HTMLElement
    if (!originalSubtitle?.textContent) return

    const subtitleText = originalSubtitle.textContent.trim()
    const subtitleData = this.processedResults.get(subtitleText)
    if (!subtitleData) return

    let segmentStart = 0
    let currentSegment = segment
    while (currentSegment.previousSibling) {
      if (currentSegment.previousSibling.textContent) {
        segmentStart += currentSegment.previousSibling.textContent.length
      }
      currentSegment = currentSegment.previousSibling as HTMLElement
    }

    const segmentText = segment.textContent || ""
    const matchingVocab = subtitleData.vocabulary.find(
      (vocab) =>
        vocab.position === segmentStart && vocab.length === segmentText.length
    )

    if (matchingVocab) {
      const container = document.createElement("div")
      container.style.position = "relative"
      segment.appendChild(container)

      this.activeSegment = segment
      this.dispose = render(
        () => <VocabularyTooltip vocabulary={matchingVocab} />,
        container
      )
    }
  }

  public updateProcessedResults(results: Map<string, ProcessedSubtitle>): void {
    this.processedResults = results
  }

  public destroy(): void {
    document.removeEventListener("keydown", this.handleKeyDown.bind(this))
    document.removeEventListener("keyup", this.handleKeyUp.bind(this))
    document.removeEventListener("mouseover", this.handleMouseOver.bind(this))
    document.removeEventListener("mouseout", this.handleMouseOut.bind(this))
    document.removeEventListener("click", this.handleClick.bind(this))
    this.closeTooltip()
  }
}
