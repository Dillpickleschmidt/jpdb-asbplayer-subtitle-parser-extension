/**
 * Groups subtitle text into chunks of approximately 16000 characters.
 * @param subtitles - Array of subtitle text.
 * @returns Array of grouped subtitle strings.
 */
const groupSubtitles = (subtitles: string[]): string[] => {
  const MAX_GROUP_SIZE = 16000
  const groups: string[] = []
  let currentGroup: string[] = []
  let currentLength = 0

  for (const subtitle of subtitles) {
    const subtitleLength = subtitle.length

    if (currentLength + subtitleLength > MAX_GROUP_SIZE) {
      groups.push(currentGroup.join(" "))
      currentGroup = []
      currentLength = 0
    }

    currentGroup.push(subtitle)
    currentLength += subtitleLength
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup.join(" "))
  }

  return groups
}

/**
 * Processes offscreen subtitles by grouping them into chunks and preparing for further processing.
 * @param elements - Array of HTMLElements containing subtitle text.
 */
export default async function handleOffscreenSubtitles(
  elements: HTMLElement[]
) {
  const subtitles = elements
    .map((el) => el.textContent?.trim() || "")
    .filter(Boolean)

  if (subtitles.length === 0) return

  const groups = groupSubtitles(subtitles)
  for (const group of groups) {
    console.log(`Sending group to ichi.moe: ${group}`)
    // TODO: Add ichi.moe API call logic here
  }
}
