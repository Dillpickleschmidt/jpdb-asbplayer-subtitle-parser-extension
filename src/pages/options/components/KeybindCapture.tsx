import { createEffect, createSignal, onCleanup, onMount } from "solid-js"

export default function KeybindCapture(props) {
  const [keybind, setKeybind] = createSignal(props.defaultValue || "")
  const [isCapturing, setIsCapturing] = createSignal(false)
  const [currentKeys, setCurrentKeys] = createSignal<string[]>([])

  // Watch for changes to props.defaultValue
  createEffect(() => {
    setKeybind(props.defaultValue || "")
  })

  const startCapture = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsCapturing(true)
    setCurrentKeys([])
    setKeybind("Press any keys...")
  }

  const stopCapture = (newKeybind: string) => {
    setIsCapturing(false)
    setKeybind(newKeybind)
    setCurrentKeys([])
    props.onChange?.(newKeybind)
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isCapturing()) return
    e.preventDefault()
    e.stopPropagation()

    // Get the key name
    const key = e.key.length === 1 ? e.key.toUpperCase() : e.key

    // Add to current keys if not already there
    setCurrentKeys((prev) => {
      if (!prev.includes(key)) {
        return [...prev, key]
      }
      return prev
    })
  }

  const handleKeyUp = (e: KeyboardEvent) => {
    if (!isCapturing()) return

    const keys = currentKeys()
    if (keys.length === 0) return

    // If it's a single modifier key
    if (
      keys.length === 1 &&
      ["Control", "Alt", "Shift", "Meta"].includes(keys[0])
    ) {
      stopCapture(keys[0])
      return
    }

    // For combinations or single regular keys, sort modifiers first
    const modifiers = keys.filter((k) =>
      ["Control", "Alt", "Shift", "Meta"].includes(k)
    )
    const others = keys.filter(
      (k) => !["Control", "Alt", "Shift", "Meta"].includes(k)
    )

    if (others.length > 0) {
      // We have a main key, combine everything
      const allKeys = [...modifiers, others[others.length - 1]]
      stopCapture(allKeys.join("+"))
    }
  }

  onMount(() => {
    document.addEventListener("keydown", handleKeyDown)
    document.addEventListener("keyup", handleKeyUp)
  })

  onCleanup(() => {
    document.removeEventListener("keydown", handleKeyDown)
    document.removeEventListener("keyup", handleKeyUp)
  })

  return (
    <button
      type="button"
      class={props.class}
      onClick={startCapture}
      disabled={isCapturing()}
    >
      {keybind() || props.placeholder || "Click to set keybind"}
    </button>
  )
}
