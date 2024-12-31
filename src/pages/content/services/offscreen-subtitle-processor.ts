// offscreen-subtitle-processor.ts

export type ProcessingState = {
  subtitles: string[]
  groups: string[][]
  lastProcessedText: string
  processedGroups: Set<number> // Track which group indices we've processed
}

/**
 * Creates grouped chunks from offscreen subtitles
 */
export function createSubtitleGroups(elements: HTMLElement[]): ProcessingState {
  console.log(`Processing ${elements.length} offscreen elements`)
  const subtitles: string[] = []

  // Collect all subtitles
  for (let i = 0; i < elements.length; i++) {
    let text = elements[i].textContent?.trim() || ""
    while (text.endsWith("➡") && i < elements.length - 1) {
      const nextText = elements[i + 1].textContent?.trim() || ""
      text = text.slice(0, -1) + nextText
      i++
    }

    if (text) {
      subtitles.push(text)
    }
  }

  console.log(`Collected ${subtitles.length} subtitles`)

  if (subtitles.length === 0) {
    return {
      subtitles: [],
      groups: [],
      lastProcessedText: "",
      processedGroups: new Set(),
    }
  }

  // Create initial groups
  const MAX_GROUP_SIZE = 400
  const groups: string[][] = []
  let currentGroup: string[] = []
  let currentLength = 0

  for (const subtitle of subtitles) {
    const subtitleLength = subtitle.length

    if (currentLength + subtitleLength > MAX_GROUP_SIZE) {
      groups.push(currentGroup)
      currentGroup = []
      currentLength = 0
    }

    currentGroup.push(subtitle)
    currentLength += subtitleLength
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup)
  }

  return {
    subtitles,
    groups,
    lastProcessedText: "",
    processedGroups: new Set(),
  }
}

/**
 * Finds and processes a window of groups around the target subtitle
 */
export function processSubtitleWindow(
  text: string,
  state: ProcessingState
): void {
  if (text === state.lastProcessedText) {
    return
  }

  // Find which group contains our subtitle
  const groupIndex = state.groups.findIndex((group) => group.includes(text))

  if (groupIndex === -1) {
    console.log("Current subtitle not found in any group:", text)
    return
  }

  // Get window of groups
  const windowStart = Math.max(0, groupIndex - 2) // 2 groups before
  const windowEnd = Math.min(state.groups.length, groupIndex + 8) // 7 groups after

  console.log(`Processing groups ${windowStart} to ${windowEnd - 1}`)

  // Process the group window, skipping already processed groups
  for (let i = windowStart; i < windowEnd; i++) {
    if (!state.processedGroups.has(i)) {
      const combinedSubtitles = state.groups[i].join(" ")
      console.log(
        `Sending group ${i} to ichi.moe (${combinedSubtitles.length} chars):`,
        combinedSubtitles
      )
      state.processedGroups.add(i)
    } else {
      console.log(`Skipping previously processed group ${i}`)
    }
  }

  state.lastProcessedText = text
}
