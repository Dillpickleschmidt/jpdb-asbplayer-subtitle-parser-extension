// subtitle-mouse-handler.tsx
import { DEFAULT_SETTINGS } from "@src/types"
import { render } from "solid-js/web"
import { tinykeys } from "tinykeys"
import { ProcessedSubtitle } from "../types"
import VocabularyTooltip from "./VocabularyTooltip"

export class SubtitleMouseHandler {
  private processedResults: Map<string, ProcessedSubtitle>
  private activeSegment: HTMLElement | null = null
  private hoveredSegment: HTMLElement | null = null
  private dispose: (() => void) | null = null
  private unsubscribe: (() => void) | null = null

  constructor(processedResults: Map<string, ProcessedSubtitle>) {
    this.processedResults = processedResults
    this.initialize()
  }

  private async initialize(): Promise<void> {
    // Load keybinds from storage
    const result = await chrome.storage.sync.get(["keybinds"])
    const keybinds = result.keybinds || DEFAULT_SETTINGS.keybinds
    console.log("Loading keybinds:", keybinds) // Debug log
    this.setupKeybindListener(keybinds.showPopup)

    // Listen for storage changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === "sync" && changes.keybinds) {
        const newKeybinds = changes.keybinds
          .newValue as typeof DEFAULT_SETTINGS.keybinds
        console.log("Keybinds changed:", newKeybinds) // Debug log
        this.setupKeybindListener(newKeybinds.showPopup)
      }
    })

    document.addEventListener("mouseover", this.handleMouseOver.bind(this))
    document.addEventListener("mouseout", this.handleMouseOut.bind(this))
    document.addEventListener("click", this.handleClick.bind(this))
  }

  private setupKeybindListener(keybindStr: string) {
    // Clean up existing listener
    if (this.unsubscribe) {
      this.unsubscribe()
    }

    console.log("Setting up listener for:", keybindStr) // Debug log

    // Set up new keybind listener using tinykeys
    this.unsubscribe = tinykeys(window, {
      [keybindStr]: (event) => {
        console.log("Keybind triggered:", keybindStr) // Debug log
        if (this.hoveredSegment) {
          event.preventDefault()
          // If we're hovering a different segment than the active one, close the tooltip
          if (
            this.activeSegment &&
            this.hoveredSegment !== this.activeSegment
          ) {
            this.closeTooltip()
          }
          this.processSegment(this.hoveredSegment)
        } else {
          // If we're not hovering any segment, close any open tooltip
          this.closeTooltip()
        }
      },
      Escape: () => {
        this.closeTooltip()
      },
    })
  }

  private handleMouseOver(event: MouseEvent): void {
    const segment = (event.target as HTMLElement).closest(
      ".jpdb-segment"
    ) as HTMLElement
    if (segment) {
      this.hoveredSegment = segment
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

  private extractRelevantSentence(
    text: string,
    wordPosition: number,
    wordLength: number
  ): string {
    const normalizedText = text.replace(/\n/g, " ")
    const periods = ["。", "｡"]

    // Find closest period after word (or end of string)
    const endPosition = periods
      .map((p) => normalizedText.indexOf(p, wordPosition + wordLength))
      .filter((pos) => pos !== -1)
      .reduce(
        (closest, pos) =>
          closest === -1 ? pos + 1 : Math.min(closest, pos + 1),
        normalizedText.length
      )

    // Find furthest period before word (or start of string)
    const startPosition = periods
      .map((p) => normalizedText.lastIndexOf(p, wordPosition))
      .reduce((furthest, pos) => Math.max(furthest, pos + 1), 0)

    return normalizedText.substring(startPosition, endPosition).trim()
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
      const relevantSentence = this.extractRelevantSentence(
        subtitleText,
        matchingVocab.position,
        matchingVocab.length
      )

      this.dispose = render(
        () => (
          <VocabularyTooltip
            vocabulary={matchingVocab}
            sentence={relevantSentence}
          />
        ),
        container
      )
    }
  }

  public updateProcessedResults(results: Map<string, ProcessedSubtitle>): void {
    this.processedResults = results
  }

  public destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe()
    }
    document.removeEventListener("mouseover", this.handleMouseOver.bind(this))
    document.removeEventListener("mouseout", this.handleMouseOut.bind(this))
    document.removeEventListener("click", this.handleClick.bind(this))
    this.closeTooltip()
  }
}
