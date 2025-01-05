import { createSignal, onCleanup } from "solid-js"

export default function KeybindCapture(props) {
  const [keybind, setKeybind] = createSignal(props.defaultValue || "")
  const [isCapturing, setIsCapturing] = createSignal(false)
  const [pressedKeys, setPressedKeys] = createSignal(new Set())

  const startCapture = (e) => {
    e.preventDefault()
    setIsCapturing(true)
    setKeybind("Press any keys...")
    setPressedKeys(new Set())
  }

  const stopCapture = () => {
    setIsCapturing(false)
    setPressedKeys(new Set())
    props.onChange?.(keybind())
  }

  const formatKeybind = (keys) => {
    const modifiers = []
    let mainKey = null

    // Sort keys into modifiers and main key
    for (const key of keys) {
      if (["Ctrl", "Shift", "Alt", "Meta"].includes(key)) {
        modifiers.push(key)
      } else {
        mainKey = key
      }
    }

    // If we only have one key and it's a modifier, use it alone
    if (modifiers.length === 1 && !mainKey) {
      return modifiers[0]
    }

    // Sort modifiers for consistent ordering
    modifiers.sort()

    // Combine modifiers with main key if present
    if (mainKey) {
      return [...modifiers, mainKey].join(" + ")
    }

    return modifiers.join(" + ")
  }

  const handleKeyDown = (e) => {
    if (!isCapturing()) return

    e.preventDefault() // Only prevent default if we're capturing

    // Get the key name
    let key = e.key
    switch (key) {
      case "Control":
        key = "Ctrl"
        break
      case "Meta":
        key = "Meta"
        break
      default:
        key = key.length === 1 ? key.toUpperCase() : key
    }

    // Add to pressed keys
    const newKeys = new Set(pressedKeys())
    newKeys.add(key)
    setPressedKeys(newKeys)

    // Update the displayed keybind
    setKeybind(formatKeybind(newKeys))
  }

  const handleKeyUp = (e) => {
    if (!isCapturing()) return

    // Get the normalized key name
    let key = e.key
    if (key === "Control") key = "Ctrl"

    const currentKeys = pressedKeys()

    // If only one key was pressed and it was a modifier, finalize immediately
    if (
      currentKeys.size === 1 &&
      ["Control", "Shift", "Alt", "Meta"].includes(e.key)
    ) {
      stopCapture()
    }
    // Otherwise, finalize on non-modifier key release
    else if (!["Control", "Shift", "Alt", "Meta"].includes(e.key)) {
      stopCapture()
    }
  }

  // Add event listeners when component mounts
  document.addEventListener("keydown", handleKeyDown)
  document.addEventListener("keyup", handleKeyUp)

  // Cleanup event listeners when component unmounts
  onCleanup(() => {
    document.removeEventListener("keydown", handleKeyDown)
    document.removeEventListener("keyup", handleKeyUp)
  })

  return (
    <button class={props.class} onClick={startCapture}>
      {keybind() || props.placeholder || "Click to set keybind"}
    </button>
  )
}
