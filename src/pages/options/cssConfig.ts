// cssConfig.ts
import { DEFAULT_SETTINGS, TextColorKey } from "@src/types"

// Generate color config from DEFAULT_SETTINGS
export const colorConfig = Object.entries(
  DEFAULT_SETTINGS.subtitleColors.colors
).map(([key, color]) => ({
  class: DEFAULT_SETTINGS.subtitleColors.classes[key as TextColorKey],
  label: DEFAULT_SETTINGS.subtitleColors.labels[key as TextColorKey],
  color,
}))

// Simple function to get colors from CSS
export const getColorsFromCSS = (css: string) => {
  const colors: Record<string, string> = {}
  Object.entries(DEFAULT_SETTINGS.subtitleColors.classes).forEach(
    ([key, className]) => {
      const regex = new RegExp(
        `\\.${className}\\s*{\\s*color:\\s*(#[0-9a-fA-F]{6})\\s*}`
      )
      const match = css.match(regex)
      colors[className] =
        match?.[1] ||
        DEFAULT_SETTINGS.subtitleColors.colors[key as TextColorKey]
    }
  )
  return colors
}

// Simple function to build CSS with colors
export const buildCSS = (colors = {}) => {
  const colorCSS = Object.entries(DEFAULT_SETTINGS.subtitleColors.classes)
    .map(
      ([key, className]) =>
        `.${className} { color: ${colors[className] || DEFAULT_SETTINGS.subtitleColors.colors[key as TextColorKey]}; }`
    )
    .join("\n")
  return DEFAULT_SETTINGS.baseCSS + "\n\n" + colorCSS
}
