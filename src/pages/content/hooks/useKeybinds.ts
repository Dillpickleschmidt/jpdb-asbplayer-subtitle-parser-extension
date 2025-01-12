import { DEFAULT_SETTINGS } from "@src/types"
import { createEffect, createSignal, onCleanup } from "solid-js"
import { tinykeys } from "tinykeys"

const SPECIAL_DECKS = {
  BLACKLIST: 1879048194,
  NEVER_FORGET: 1879048193,
} as const

export function useKeybinds(onAction: {
  onReview: (rating: string) => void
  onSpecialDeck: (deckId: number) => void
  onAdd: () => void
}) {
  const [keybinds, setKeybinds] = createSignal(DEFAULT_SETTINGS.keybinds)
  let lastActionTime = 0
  const DEBOUNCE_TIME = 500 // Prevent multiple triggers within 500ms
  let unsubscribe: (() => void) | null = null

  const setupKeybindListeners = (
    currentKeybinds: typeof DEFAULT_SETTINGS.keybinds
  ) => {
    // Clean up existing listeners before setting up new ones
    if (unsubscribe) {
      unsubscribe()
    }

    const handleAction = (action: () => void) => {
      const now = Date.now()
      if (now - lastActionTime >= DEBOUNCE_TIME) {
        action()
        lastActionTime = now
      }
    }

    unsubscribe = tinykeys(window, {
      [currentKeybinds.reviewNothing]: (e) => {
        e.preventDefault()
        handleAction(() => onAction.onReview("nothing"))
      },
      [currentKeybinds.reviewSomething]: (e) => {
        e.preventDefault()
        handleAction(() => onAction.onReview("something"))
      },
      [currentKeybinds.reviewHard]: (e) => {
        e.preventDefault()
        handleAction(() => onAction.onReview("hard"))
      },
      [currentKeybinds.reviewOkay]: (e) => {
        e.preventDefault()
        handleAction(() => onAction.onReview("okay"))
      },
      [currentKeybinds.reviewEasy]: (e) => {
        e.preventDefault()
        handleAction(() => onAction.onReview("easy"))
      },
      [currentKeybinds.blacklist]: (e) => {
        e.preventDefault()
        handleAction(() => onAction.onSpecialDeck(SPECIAL_DECKS.BLACKLIST))
      },
      [currentKeybinds.neverForget]: (e) => {
        e.preventDefault()
        handleAction(() => onAction.onSpecialDeck(SPECIAL_DECKS.NEVER_FORGET))
      },
      [currentKeybinds.addToDeck]: (e) => {
        e.preventDefault()
        handleAction(() => onAction.onAdd())
      },
    })
  }

  // Initial setup and chrome storage sync
  createEffect(() => {
    // Load initial keybinds from storage
    chrome.storage.sync.get(["keybinds"], (result) => {
      const currentKeybinds = result.keybinds || DEFAULT_SETTINGS.keybinds
      setKeybinds(currentKeybinds)
      setupKeybindListeners(currentKeybinds)
    })

    // Listen for keybind changes in storage
    const storageListener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      namespace: string
    ) => {
      if (namespace === "sync" && changes.keybinds) {
        const newKeybinds = changes.keybinds.newValue
        setKeybinds(newKeybinds)
        setupKeybindListeners(newKeybinds)
      }
    }

    chrome.storage.onChanged.addListener(storageListener)

    // Cleanup on component unmount
    onCleanup(() => {
      chrome.storage.onChanged.removeListener(storageListener)
      if (unsubscribe) {
        unsubscribe()
      }
    })
  })

  return { keybinds }
}
