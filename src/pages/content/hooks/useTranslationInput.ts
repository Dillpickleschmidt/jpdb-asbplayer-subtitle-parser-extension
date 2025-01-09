import { createSignal } from "solid-js"

export function useTranslationInput(onSubmit: () => Promise<void>) {
  const [showTranslation, setShowTranslation] = createSignal(false)
  const [translation, setTranslation] = createSignal("")
  const [isTranslating, setIsTranslating] = createSignal(false)
  let inputRef: HTMLInputElement | undefined

  const handleKeyDown = (e: KeyboardEvent) => {
    if (showTranslation()) {
      e.stopPropagation()
      if (e.key === "Escape") {
        setShowTranslation(false)
        setTranslation("")
      } else if (e.key === "Enter") {
        onSubmit()
      }
    }
  }

  const startTranslation = async (getTranslation: () => Promise<string>) => {
    setShowTranslation(true)
    setIsTranslating(true)

    try {
      const machineTranslation = await getTranslation()
      setTranslation(machineTranslation)
    } catch (error) {
      console.error("Error getting machine translation:", error)
    } finally {
      setIsTranslating(false)
      setTimeout(() => inputRef?.focus(), 0)
    }
  }

  const reset = () => {
    setShowTranslation(false)
    setTranslation("")
    setIsTranslating(false)
  }

  return {
    showTranslation,
    translation,
    isTranslating,
    inputRef,
    handleKeyDown,
    setTranslation,
    startTranslation,
    reset,
  }
}
