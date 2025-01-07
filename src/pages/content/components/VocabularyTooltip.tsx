// VocabularyTooltip.tsx
import { DEFAULT_SETTINGS, TooltipButtons } from "@src/types"
import { For, Show, createEffect, createSignal } from "solid-js"
import type { ChromeMessage, RawJpdbBatchProcessingResult } from "../types"
import { getCardStateClass } from "../utils/card-state"

type VocabularyEntry = {
  vid: number
  sid: number
  rid: number
  spelling: string
  reading: string
  frequencyRank: number
  meanings: string[]
  partOfSpeech: string[]
  cardState: string[] | null
}

// Helper to get the appropriate class for a card state
const getStateClassName = (cardState: string) => {
  let state = cardState
  if (
    cardState === "redundant" &&
    Array.isArray(cardState) &&
    cardState.length > 1
  ) {
    state = cardState[1]
  }
  return getCardStateClass(state)
}

async function getTranslation(text: string): Promise<string> {
  const response = await chrome.runtime.sendMessage({
    type: "JPDB_getEnglishTranslation",
    args: {
      params: [text],
    },
  })

  if (!response.success) throw new Error(response.error)
  return response.data.text
}

async function addToDeck(
  vid: number,
  sid: number,
  deckId: number,
  sentence: string,
  translation?: string
): Promise<void> {
  // First add to deck
  const response = (await chrome.runtime.sendMessage({
    type: "JPDB_addToDeck",
    args: {
      params: [vid, sid, deckId],
    },
  })) as ChromeMessage<RawJpdbBatchProcessingResult>

  if (!response.success) throw new Error(response.error)

  // Get machine translation if not provided
  const finalTranslation = translation || (await getTranslation(sentence))

  // Then set the sentence with translation
  const setSentenceResponse = await chrome.runtime.sendMessage({
    type: "JPDB_setSentence",
    args: {
      params: [vid, sid, sentence, finalTranslation],
    },
  })

  if (!setSentenceResponse.success) throw new Error(setSentenceResponse.error)
}

export default function VocabularyTooltip(props: {
  vocabulary: VocabularyEntry
  sentence: string
}) {
  const [selectedDecks, setSelectedDecks] = createSignal<number[]>([])
  const [decks, setDecks] = createSignal<{ id: number; name: string }[]>([])
  const [currentDeck, setCurrentDeck] = createSignal<string>("")
  const [tooltipButtons, setTooltipButtons] = createSignal<TooltipButtons>(
    DEFAULT_SETTINGS.tooltipButtons
  )
  const [isAdding, setIsAdding] = createSignal(false)
  const [showTranslation, setShowTranslation] = createSignal(false)
  const [translation, setTranslation] = createSignal("")
  let inputRef: HTMLInputElement | undefined = undefined
  const [isTranslating, setIsTranslating] = createSignal(false)

  const handleKeyDown = (e: KeyboardEvent) => {
    if (showTranslation()) {
      e.stopPropagation()
      if (e.key === "Escape") {
        setShowTranslation(false)
        setTranslation("")
      } else if (e.key === "Enter") {
        handleAddToDeckPlus()
      }
    }
  }

  // Load selected decks and filtered deck data
  createEffect(() => {
    chrome.storage.sync.get(
      ["selectedDecks", "userDecks", "tooltipSelectedDeck"],
      (result) => {
        const selectedIds = result.selectedDecks || []
        setSelectedDecks(selectedIds)

        const userDecks = result.userDecks?.decks || []
        const filteredDecks = userDecks
          .filter((deck: number[]) => selectedIds.includes(deck[0]))
          .map((deck: number[]) => ({ id: deck[0], name: deck[1] }))
        setDecks(filteredDecks)

        if (result.tooltipSelectedDeck) {
          setCurrentDeck(result.tooltipSelectedDeck)
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
              .filter((deck: number[]) =>
                updatedSelectedDecks.includes(deck[0])
              )
              .map((deck: number[]) => ({ id: deck[0], name: deck[1] }))
            setDecks(filteredDecks)

            if (
              !filteredDecks.some((deck) => String(deck.id) === currentDeck())
            ) {
              setCurrentDeck("")
              chrome.storage.sync.set({ tooltipSelectedDeck: "" })
            }
          })
        }
      }
    }

    chrome.storage.onChanged.addListener(storageListener)

    return () => {
      chrome.storage.onChanged.removeListener(storageListener)
    }
  })

  createEffect(() => {
    if (showTranslation()) {
      document.addEventListener("keydown", handleKeyDown, true)
      return () => document.removeEventListener("keydown", handleKeyDown, true)
    }
  })

  const handleDeckChange = (
    e: Event & { currentTarget: HTMLSelectElement }
  ) => {
    const selectedDeckId = e.currentTarget.value
    setCurrentDeck(selectedDeckId)

    chrome.storage.sync.set({ tooltipSelectedDeck: selectedDeckId })
  }

  const handleAddToDeck = async () => {
    const selectedDeckId = parseInt(currentDeck())
    if (!selectedDeckId) {
      alert("Please select a deck first")
      return
    }

    try {
      setIsAdding(true)
      await addToDeck(
        props.vocabulary.vid,
        props.vocabulary.sid,
        selectedDeckId,
        props.sentence
      )
      alert("Word successfully added to deck!")
    } catch (error) {
      console.error("Error adding word to deck:", error)
      alert("Failed to add word to deck. Please try again.")
    } finally {
      setIsAdding(false)
    }
  }

  const handleAddToDeckPlus = async () => {
    const selectedDeckId = parseInt(currentDeck())
    if (!selectedDeckId) {
      alert("Please select a deck first")
      return
    }

    if (!showTranslation()) {
      setShowTranslation(true)
      setIsTranslating(true)

      // Get machine translation and prefill
      try {
        const machineTranslation = await getTranslation(props.sentence)
        setTranslation(machineTranslation)
      } catch (error) {
        console.error("Error getting machine translation:", error)
        // Continue anyway, user can still type translation manually
      } finally {
        setIsTranslating(false)
      }

      setTimeout(() => inputRef?.focus(), 0)
      return
    }

    try {
      setIsAdding(true)
      await addToDeck(
        props.vocabulary.vid,
        props.vocabulary.sid,
        selectedDeckId,
        props.sentence,
        translation()
      )
      alert("Word successfully added to deck!")
      setShowTranslation(false)
      setTranslation("")
    } catch (error) {
      console.error("Error adding word to deck:", error)
      alert("Failed to add word to deck. Please try again.")
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <>
      <div class="absolute -top-20 left-1/2 z-50 flex w-80 -translate-x-1/2 -translate-y-full flex-col justify-between overflow-x-hidden rounded-md bg-black/95 text-start text-base text-white shadow-lg [text-shadow:none] hover:cursor-default">
        <div class="max-h-80 overflow-y-auto p-4">
          <div class="mb-2 flex justify-between">
            <div class="text-start">
              <div class="text-3xl font-bold">{props.vocabulary.spelling}</div>
              <Show
                when={props.vocabulary.spelling != props.vocabulary.reading}
              >
                <div class="cursor-text text-lg font-medium">
                  【{props.vocabulary.reading}】
                </div>
              </Show>
              <div class="cursor-text text-sm leading-6">
                {props.vocabulary.partOfSpeech.join(", ")}
              </div>
            </div>
            <div class="flex flex-col items-end">
              <select
                name="decks"
                id="deck-select"
                class="max-w-24 bg-black text-right"
                value={currentDeck()}
                onChange={handleDeckChange}
              >
                <option value="">Sel. Deck</option>
                <For each={decks()}>
                  {(deck) => (
                    <option
                      value={deck.id}
                    >{`${deck.id} - ${deck.name}`}</option>
                  )}
                </For>
              </select>
              <div class="cursor-text text-right text-xs font-normal italic opacity-70">
                Rank #{props.vocabulary.frequencyRank}
              </div>
              <div>
                <For each={props.vocabulary.cardState}>
                  {(cardState) => (
                    <div
                      class={`cursor-text text-end italic leading-5 ${getStateClassName(cardState)}`}
                    >
                      {cardState}
                    </div>
                  )}
                </For>
              </div>
            </div>
          </div>
          <div class="cursor-text space-y-0.5 p-1 font-normal">
            <For each={props.vocabulary.meanings}>
              {(meaning) => (
                <div>
                  <span class="pr-3 text-2xl">•</span>
                  {meaning}
                </div>
              )}
            </For>
          </div>
        </div>
        <div class="grid w-full grid-cols-4 gap-1 px-3 pb-3 pt-1">
          {/* First Row */}
          <Show when={tooltipButtons().enabled.nothing}>
            <button
              class="h-8 rounded-md border border-black px-1 text-black"
              style={{ "background-color": tooltipButtons().colors.nothing }}
            >
              Noth.
            </button>
          </Show>
          <Show when={tooltipButtons().enabled.something}>
            <button
              class="h-8 rounded-md border border-black px-1 text-black"
              style={{ "background-color": tooltipButtons().colors.something }}
            >
              Somth.
            </button>
          </Show>
          <Show when={tooltipButtons().enabled.hard}>
            <button
              class="h-8 rounded-md border border-black px-1 text-black"
              style={{ "background-color": tooltipButtons().colors.hard }}
            >
              Hard
            </button>
          </Show>
          <Show when={tooltipButtons().enabled.okay}>
            <button
              class="h-8 rounded-md border border-black px-1 text-black"
              style={{ "background-color": tooltipButtons().colors.okay }}
            >
              Okay
            </button>
          </Show>

          {/* Second Row */}
          <Show when={tooltipButtons().enabled.easy}>
            <button
              class="h-8 rounded-md border border-black px-1 text-black"
              style={{ "background-color": tooltipButtons().colors.easy }}
            >
              Easy
            </button>
          </Show>
          <Show when={tooltipButtons().enabled.blacklist}>
            <button
              class="h-8 rounded-md border border-black px-1 text-black"
              style={{ "background-color": tooltipButtons().colors.blacklist }}
            >
              Blackl.
            </button>
          </Show>
          <Show when={tooltipButtons().enabled.add}>
            <button
              class="h-8 rounded-md border border-black px-1 text-black"
              style={{ "background-color": tooltipButtons().colors.add }}
              onClick={handleAddToDeck}
              disabled={isAdding() || !currentDeck()}
            >
              {isAdding() ? "..." : "Add"}
            </button>
          </Show>
          <Show when={tooltipButtons().enabled.addEdit}>
            <button
              class="h-8 rounded-md border border-black px-1 text-black"
              style={{ "background-color": tooltipButtons().colors.addEdit }}
              onClick={handleAddToDeckPlus}
              disabled={isAdding() || !currentDeck()}
            >
              {isAdding() ? "..." : "Add+"}
            </button>
          </Show>
        </div>
      </div>

      {/* Translation Input */}
      <Show when={showTranslation()}>
        <div class="fixed left-0 top-[-15rem] z-[2000] w-full space-y-2 rounded-lg bg-black/95 px-6 pb-6 pt-5 text-start text-xl font-normal text-white [text-shadow:none]">
          <label>Write the English translation here:</label>
          <input
            ref={(el) => (inputRef = el)}
            value={translation()}
            onInput={(e) => setTranslation(e.currentTarget.value)}
            class="w-full rounded-md border-2 border-neutral-700/75 bg-neutral-800/75 px-3 py-2 text-white"
            placeholder={
              isTranslating()
                ? "Loading translation..."
                : "Type translation and press Enter"
            }
            disabled={isTranslating()}
          />
        </div>
      </Show>
    </>
  )
}
