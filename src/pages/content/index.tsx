import { render } from "solid-js/web"
import "../../styles/index.css"
import { ControlPanel } from "./components/ControlPanel"
import { initializeSubtitleHandler } from "./components/SubtitleStyler"

// Initialize subtitle handling in all frames
initializeSubtitleHandler()

// Only mount UI in main window
if (window.self === window.top) {
  const root = document.createElement("div")
  root.id = "extension-root"
  document.body.append(root)

  render(() => <ControlPanel />, root)
}
