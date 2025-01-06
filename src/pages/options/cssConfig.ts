// cssConfig.ts
export const colorConfig = [
  { class: "jpdb-not-in-deck", label: "Not in deck", color: "#ffffff" },
  { class: "jpdb-locked", label: "Locked", color: "#a0522d" },
  { class: "jpdb-redundant", label: "Redundant", color: "#708090" },
  { class: "jpdb-new", label: "New", color: "#ff4500" },
  { class: "jpdb-learning", label: "Learning", color: "#4169e1" },
  { class: "jpdb-known", label: "Known", color: "#228b22" },
  { class: "jpdb-never-forget", label: "Never forget", color: "#9370db" },
  { class: "jpdb-due", label: "Due", color: "#ffd700" },
  { class: "jpdb-failed", label: "Failed", color: "#dc143c" },
  { class: "jpdb-suspended", label: "Suspended", color: "#696969" },
  { class: "jpdb-blacklisted", label: "Blacklisted", color: "#b0b0b0" },
  { class: "jpdb-unparsed", label: "Unparsed", color: "#ffffff" },
] as const

// Base CSS that doesn't change
const baseCSS = `
.jpdb-word {
  /* Base word styling if needed */
}

.jpdb-segment {
  position: relative;
  border-radius: 0.25em;
  padding-left: 2px;
  padding-right: 2px;
  padding-top: 0;
  padding-bottom: 0;
  display: inline-block;
  white-space: pre-wrap;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
}

.jpdb-segment::before {
  content: "";
  position: absolute;
  top: 0px;
  bottom: -4px;
  left: -8px;
  right: -8px;
  border-radius: 0.125em;
  opacity: 0;
  transition: opacity 0.15s ease;
  background-color: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(5px);
  z-index: -1;
  pointer-events: none;
}

.jpdb-segment:hover::before {
  opacity: 1;
}

.cr-subtitle {
  font-family: "Noto Sans JP", sans-serif;
  font-size: 48px;
  font-weight: 700;
  color: white;
  text-shadow:
    /* Outline shadows */
    0px 3.75px 0.5px #000,
    3.675px 0.7875px 0.5px #000,
    1.575px -3.4125px 0.5px #000,
    -3px -2.25px 0.5px #000,
    -2.85px 2.4375px 0.5px #000,
    1.8px 3.3px 0.5px #000,
    3.6px -1.05px 0.5px #000,
    -0.2625px -3.75px 0.5px #000,
    -3.7125px -0.5625px 0.5px #000,
    -1.3125px 3.525px 0.5px #000,
    3.15px 2.025px 0.5px #000,
    2.6625px -2.625px 0.5px #000,
    -2.025px -3.15px 0.5px #000,
    -3.525px 1.3125px 0.5px #000,
    0.525px 3.7125px 0.5px #000,
    3.75px 0.3px 0.5px #000,
    1.0875px -3.6px 0.5px #000,
    -3.2625px -1.8px 0.5px #000,
    -2.475px 2.8125px 0.5px #000,
    2.2125px 3px 0.5px #000,
    3.4125px -1.5375px 0.5px #000,
    -0.7875px -3.675px 0.5px #000,
    -3.75px -0.0375px 0.5px #000,
    -0.825px 3.675px 0.5px #000,
    3.4125px 1.575px 0.5px #000,
    2.2875px -3px 0.5px #000,
    -2.4375px -2.85px 0.5px #000,
    -3.3px 1.7625px 0.5px #000,
    1.0125px 3.6px 0.5px #000,
    3.75px -0.225px 0.5px #000,
    0.5625px -3.7125px 0.5px #000,
    -3.4875px -1.35px 0.5px #000,
    -2.0625px 3.15px 0.5px #000,
    2.625px 2.7px 0.5px #000,
    3.1875px -1.9875px 0.5px #000,
    -1.275px -3.525px 0.5px #000,
    -3.7125px 0.4875px 0.5px #000,
    -0.3px 3.75px 0.5px #000,
    3.6px 1.0875px 0.5px #000,
    1.8375px -3.2625px 0.5px #000,
    -2.8125px -2.5125px 0.5px #000,
    -3.0375px 2.2125px 0.5px #000,
    1.5px 3.45px 0.5px #000,
    3.675px -0.75px 0.5px #000,
    0.075px -3.75px 0.5px #000,
    -3.6375px -0.8625px 0.5px #000,
    -1.6125px 3.375px 0.5px #000,
    2.9625px 2.2875px 0.5px #000,
    /* Semi-transparent drop shadow */ 5px 5px 2px rgba(0, 0, 0, 0.8);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}`

// Simple function to get colors from CSS
export const getColorsFromCSS = (css: string) => {
  const colors = {}
  colorConfig.forEach((config) => {
    const regex = new RegExp(
      `\\.${config.class}\\s*{\\s*color:\\s*(#[0-9a-fA-F]{6})\\s*}`
    )
    const match = css.match(regex)
    colors[config.class] = match?.[1] || config.color
  })
  return colors
}

// Simple function to build CSS with colors
export const buildCSS = (colors = {}) => {
  const colorCSS = colorConfig
    .map(
      (config) =>
        `.${config.class} { color: ${colors[config.class] || config.color}; }`
    )
    .join("\n")
  return baseCSS + "\n\n" + colorCSS
}
