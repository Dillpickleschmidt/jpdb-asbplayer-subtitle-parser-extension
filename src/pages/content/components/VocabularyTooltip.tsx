// VocabularyTooltip.tsx
import { DEFAULT_SETTINGS, TooltipButtons } from "@src/types"
import { For, Show, createEffect, createSignal } from "solid-js"
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
  // Use the same mapping as in updateSubtitleDisplay
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

export default function VocabularyTooltip(props: {
  vocabulary: VocabularyEntry
}) {
  const [tooltipButtons, setTooltipButtons] = createSignal<TooltipButtons>(
    DEFAULT_SETTINGS.tooltipButtons
  )

  // Load tooltip button settings when component mounts and listen for changes
  createEffect(() => {
    // Initial load
    chrome.storage.sync.get(["tooltipButtons"], (result) => {
      if (result.tooltipButtons) {
        setTooltipButtons(result.tooltipButtons)
      }
    })

    // Listen for changes
    const storageListener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      namespace: string
    ) => {
      if (namespace === "sync" && changes.tooltipButtons) {
        setTooltipButtons(changes.tooltipButtons.newValue)
      }
    }

    // Add listener
    chrome.storage.onChanged.addListener(storageListener)

    // Cleanup listener when component unmounts
    return () => {
      chrome.storage.onChanged.removeListener(storageListener)
    }
  })

  return (
    <div class="absolute -top-20 left-1/2 z-50 flex w-80 -translate-x-1/2 -translate-y-full flex-col justify-between overflow-x-hidden rounded-md bg-black/95 text-start text-base text-white shadow-lg hover:cursor-default">
      <div class="max-h-80 overflow-y-auto p-4">
        <div class="mb-2 flex justify-between">
          <div class="text-start">
            <div class="text-3xl font-bold">{props.vocabulary.spelling}</div>
            <Show when={props.vocabulary.spelling != props.vocabulary.reading}>
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
            >
              <option value="">Sel. Deck</option>
              <option value="deck-1">Deck 1</option>
              <option value="deck-2">Deck 2</option>
              <option value="deck-3">Deck 3</option>
              <option value="deck-4">Deck 4</option>
              <option value="deck-5">Deck 5</option>
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
          >
            Add
          </button>
        </Show>
        <Show when={tooltipButtons().enabled.addEdit}>
          <button
            class="h-8 rounded-md border border-black px-1 text-black"
            style={{ "background-color": tooltipButtons().colors.addEdit }}
          >
            Add+
          </button>
        </Show>
      </div>
    </div>
  )
}
