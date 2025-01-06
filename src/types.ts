// types.ts
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

export const DEFAULT_SETTINGS = {
  keybinds: {
    showPopup: "Shift",
    reviewNothing: "1",
    reviewSomething: "2",
    reviewHard: "3",
    reviewOkay: "4",
    reviewEasy: "5",
    neverForget: "6",
    blacklist: "0",
    addToDeck: "Shift+A",
  },
  tooltipButtons: {
    enabled: {
      nothing: false,
      something: false,
      hard: false,
      okay: true,
      easy: false,
      blacklist: true,
      add: true,
      addEdit: true,
    },
    colors: {
      nothing: "#ff69b4", // pink
      something: "#ffd700", // yellow
      hard: "#38bdf8", // amber
      okay: "#38bdf8", // cyan
      easy: "#9370db", // purple
      blacklist: "#b0b0b0", // gray
      add: "#22c55e", // green
      addEdit: "#ef4444", // red
    },
    labels: {
      nothing: "Nothing",
      something: "Something",
      hard: "Hard",
      okay: "Okay",
      easy: "Easy",
      blacklist: "Blacklist",
      add: "Add",
      addEdit: "Add + Edit",
    },
  },
  subtitleColors: {
    colors: {
      notInDeck: "#ffffff",
      locked: "#a0522d",
      redundant: "#708090",
      new: "#ff4500",
      learning: "#4169e1",
      known: "#228b22",
      neverForget: "#9370db",
      due: "#ffd700",
      failed: "#dc143c",
      suspended: "#696969",
      blacklisted: "#b0b0b0",
      unparsed: "#ffffff",
    },
    labels: {
      notInDeck: "Not in deck",
      locked: "Locked",
      redundant: "Redundant",
      new: "New",
      learning: "Learning",
      known: "Known",
      neverForget: "Never forget",
      due: "Due",
      failed: "Failed",
      suspended: "Suspended",
      blacklisted: "Blacklisted",
      unparsed: "Unparsed",
    },
    classes: {
      notInDeck: "jpdb-not-in-deck",
      locked: "jpdb-locked",
      redundant: "jpdb-redundant",
      new: "jpdb-new",
      learning: "jpdb-learning",
      known: "jpdb-known",
      neverForget: "jpdb-never-forget",
      due: "jpdb-due",
      failed: "jpdb-failed",
      suspended: "jpdb-suspended",
      blacklisted: "jpdb-blacklisted",
      unparsed: "jpdb-unparsed",
    },
  },
  baseCSS: baseCSS, // Your existing base CSS
} as const

export type Settings = typeof DEFAULT_SETTINGS
export type Keybinds = Settings["keybinds"]
export type TooltipButtons = Settings["tooltipButtons"]
export type TextColorKey = keyof typeof DEFAULT_SETTINGS.subtitleColors.colors
