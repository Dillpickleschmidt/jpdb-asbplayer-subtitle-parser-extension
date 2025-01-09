// hooks/useDeckSelection.ts
import { DEFAULT_SETTINGS, TooltipButtons } from "@src/types"
import { createEffect, createSignal } from "solid-js"

type UserDeck = [number, string] // [id, name]

export function useDeckSelection() {
  const [selectedDecks, setSelectedDecks] = createSignal<number[]>([])
  const [decks, setDecks] = createSignal<{ id: number; name: string }[]>([])
  const [currentDeck, setCurrentDeck] = createSignal<string>("")
  const [tooltipButtons, setTooltipButtons] = createSignal<TooltipButtons>(
    DEFAULT_SETTINGS.tooltipButtons
  )

  // Load selected decks and filtered deck data
  createEffect(() => {
    chrome.storage.sync.get(
      ["selectedDecks", "userDecks", "tooltipSelectedDeck", "tooltipButtons"],
      (result) => {
        const selectedIds = result.selectedDecks || []
        setSelectedDecks(selectedIds)

        const userDecks = result.userDecks?.decks || []
        const filteredDecks = userDecks
          .filter((deck: UserDeck) => selectedIds.includes(deck[0]))
          .map((deck: UserDeck) => ({ id: deck[0], name: deck[1] }))

        setDecks(filteredDecks)

        if (result.tooltipSelectedDeck) {
          setCurrentDeck(result.tooltipSelectedDeck)
        }

        if (result.tooltipButtons) {
          setTooltipButtons(result.tooltipButtons)
        }
      }
    )

    // Listen for changes in Chrome storage
    const storageListener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      namespace: string
    ) => {
      if (namespace === "sync") {
        if (changes.selectedDecks) {
          const updatedSelectedDecks = changes.selectedDecks.newValue || []
          setSelectedDecks(updatedSelectedDecks)

          chrome.storage.sync.get(["userDecks"], (result) => {
            const userDecks = result.userDecks?.decks || []
            const filteredDecks = userDecks
              .filter((deck: UserDeck) =>
                updatedSelectedDecks.includes(deck[0])
              )
              .map((deck: UserDeck) => ({ id: deck[0], name: deck[1] }))

            setDecks(filteredDecks)

            // Reset current deck if it is no longer in the filtered decks
            if (
              !filteredDecks.some((deck) => String(deck.id) === currentDeck())
            ) {
              setCurrentDeck("")
              chrome.storage.sync.set({ tooltipSelectedDeck: "" })
            }
          })
        }

        if (changes.tooltipButtons) {
          setTooltipButtons(changes.tooltipButtons.newValue)
        }
      }
    }

    chrome.storage.onChanged.addListener(storageListener)

    // Cleanup listener when effect is disposed
    return () => {
      chrome.storage.onChanged.removeListener(storageListener)
    }
  })

  const handleDeckChange = (
    e: Event & { currentTarget: HTMLSelectElement }
  ) => {
    const selectedDeckId = e.currentTarget.value
    setCurrentDeck(selectedDeckId)

    chrome.storage.sync.set({ tooltipSelectedDeck: selectedDeckId })
  }

  const selectDeck = (deckId: string) => {
    setCurrentDeck(deckId)
    chrome.storage.sync.set({ tooltipSelectedDeck: deckId })
  }

  return {
    selectedDecks,
    decks,
    currentDeck,
    tooltipButtons,
    handleDeckChange,
    selectDeck,
  }
}
