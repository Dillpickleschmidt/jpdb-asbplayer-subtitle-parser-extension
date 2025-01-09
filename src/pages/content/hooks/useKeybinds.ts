import { DEFAULT_SETTINGS } from "@src/types"
import { createEffect, createSignal } from "solid-js"
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
  let unsubscribe: (() => void) | null = null

  const setupKeybindListeners = (
    currentKeybinds: typeof DEFAULT_SETTINGS.keybinds
  ) => {
    if (unsubscribe) {
      unsubscribe()
    }

    unsubscribe = tinykeys(window, {
      [currentKeybinds.reviewNothing]: (e) => {
        e.preventDefault()
        onAction.onReview("nothing")
      },
      [currentKeybinds.reviewSomething]: (e) => {
        e.preventDefault()
        onAction.onReview("something")
      },
      [currentKeybinds.reviewHard]: (e) => {
        e.preventDefault()
        onAction.onReview("hard")
      },
      [currentKeybinds.reviewOkay]: (e) => {
        e.preventDefault()
        onAction.onReview("okay")
      },
      [currentKeybinds.reviewEasy]: (e) => {
        e.preventDefault()
        onAction.onReview("easy")
      },
      [currentKeybinds.blacklist]: (e) => {
        e.preventDefault()
        onAction.onSpecialDeck(SPECIAL_DECKS.BLACKLIST)
      },
      [currentKeybinds.neverForget]: (e) => {
        e.preventDefault()
        onAction.onSpecialDeck(SPECIAL_DECKS.NEVER_FORGET)
      },
      [currentKeybinds.addToDeck]: (e) => {
        e.preventDefault()
        onAction.onAdd()
      },
    })
  }

  createEffect(() => {
    chrome.storage.sync.get(["keybinds"], (result) => {
      const currentKeybinds = result.keybinds || DEFAULT_SETTINGS.keybinds
      setKeybinds(currentKeybinds)
      setupKeybindListeners(currentKeybinds)
    })

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
    return () => {
      chrome.storage.onChanged.removeListener(storageListener)
      if (unsubscribe) {
        unsubscribe()
      }
    }
  })

  return { keybinds }
}
