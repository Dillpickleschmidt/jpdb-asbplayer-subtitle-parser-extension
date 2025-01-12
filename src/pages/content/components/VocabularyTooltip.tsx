// VocabularyTooltip.tsx
import { For, Show, createEffect, createSignal } from "solid-js"
import { useDeckSelection } from "../hooks/useDeckSelection"
import { useKeybinds } from "../hooks/useKeybinds"
import { useTranslationInput } from "../hooks/useTranslationInput"
import { addToDeck, getTranslation, reviewWord } from "../services/jpdb-api"
import type { ProcessedSubtitle, VocabularyEntry } from "../types"
import { getCardStateClass } from "../utils/card-state"
import { ReviewButton } from "./ReviewButton"
import { updateWordState } from "./SubtitleStyler"
import { TranslationInput } from "./TranslationInput"

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

export default function VocabularyTooltip(props: {
  vocabulary: VocabularyEntry
  sentence: string
  processedResults: Map<string, ProcessedSubtitle>
}) {
  const [isAdding, setIsAdding] = createSignal(false)
  const { decks, currentDeck, tooltipButtons, handleDeckChange } =
    useDeckSelection()

  const translation = useTranslationInput(async () => {
    await handleAddToDeckPlus()
  })

  createEffect(() => {
    if (translation.showTranslation()) {
      document.addEventListener("keydown", translation.handleKeyDown, true)
      return () =>
        document.removeEventListener("keydown", translation.handleKeyDown, true)
    }
  })

  const handleReview = async (rating: string) => {
    try {
      setIsAdding(true)
      await reviewWord(props.vocabulary.vid, props.vocabulary.sid, rating)
      await updateWordState(props.sentence, props.vocabulary.vid)
    } catch (error) {
      console.error("Error reviewing word:", error)
      alert("Failed to review word. Please try again.")
    } finally {
      setIsAdding(false)
    }
  }

  const handleSpecialDeck = async (deckId: "blacklist" | "never-forget") => {
    try {
      setIsAdding(true)
      await addToDeck(props.vocabulary.vid, props.vocabulary.sid, deckId)
      await updateWordState(props.sentence, props.vocabulary.vid)
    } catch (error) {
      console.error("Error adding word to special deck:", error)
      alert("Failed to add word. Please try again.")
    } finally {
      setIsAdding(false)
    }
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
      console.log("here")
      await updateWordState(props.sentence, props.vocabulary.vid)
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

    if (!translation.showTranslation()) {
      translation.startTranslation(async () => getTranslation(props.sentence))
      return
    }

    try {
      setIsAdding(true)
      await addToDeck(
        props.vocabulary.vid,
        props.vocabulary.sid,
        selectedDeckId,
        props.sentence,
        translation.translation()
      )
      alert("Word successfully added to deck!")
      translation.reset()
    } catch (error) {
      console.error("Error adding word to deck:", error)
      alert("Failed to add word to deck. Please try again.")
    } finally {
      setIsAdding(false)
    }
  }

  useKeybinds({
    // Set up event listeners
    onReview: (rating) => {
      if (!translation.showTranslation()) {
        handleReview(rating)
      }
    },
    onSpecialDeck: (deckId) => {
      if (!translation.showTranslation()) {
        handleSpecialDeck(deckId)
      }
    },
    onAdd: () => {
      if (!translation.showTranslation()) {
        handleAddToDeck()
      }
    },
  })

  return (
    <>
      <div class="absolute -top-20 left-1/2 z-50 flex w-80 -translate-x-1/2 -translate-y-full flex-col justify-between overflow-x-hidden rounded-md bg-black/95 text-start text-base text-white shadow-lg [text-shadow:none] hover:cursor-default">
        {/* Main content section */}
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
                title="Go to the extension Settings page and check the decks you want to appear in this list."
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
                      class={`cursor-text text-end italic leading-5 ${getStateClassName(
                        cardState
                      )}`}
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

        {/* Buttons section */}
        <div class="grid w-full grid-cols-4 gap-1 px-3 pb-3 pt-1">
          {/* First Row */}
          <Show when={tooltipButtons().enabled.nothing}>
            <ReviewButton
              label="Noth."
              color={tooltipButtons().colors.nothing}
              onClick={() => handleReview("nothing")}
              disabled={isAdding()}
              loading={isAdding()}
            />
          </Show>
          <Show when={tooltipButtons().enabled.something}>
            <ReviewButton
              label="Somth."
              color={tooltipButtons().colors.something}
              onClick={() => handleReview("something")}
              disabled={isAdding()}
              loading={isAdding()}
            />
          </Show>
          <Show when={tooltipButtons().enabled.hard}>
            <ReviewButton
              label="Hard"
              color={tooltipButtons().colors.hard}
              onClick={() => handleReview("hard")}
              disabled={isAdding()}
              loading={isAdding()}
            />
          </Show>
          <Show when={tooltipButtons().enabled.okay}>
            <ReviewButton
              label="Okay"
              color={tooltipButtons().colors.okay}
              onClick={() => handleReview("okay")}
              disabled={isAdding()}
              loading={isAdding()}
            />
          </Show>

          {/* Second Row */}
          <Show when={tooltipButtons().enabled.easy}>
            <ReviewButton
              label="Easy"
              color={tooltipButtons().colors.easy}
              onClick={() => handleReview("easy")}
              disabled={isAdding()}
              loading={isAdding()}
            />
          </Show>
          <Show when={tooltipButtons().enabled.blacklist}>
            <ReviewButton
              label="Blackl."
              color={tooltipButtons().colors.blacklist}
              onClick={() => handleSpecialDeck("blacklist")}
              disabled={isAdding()}
              loading={isAdding()}
            />
          </Show>
          <Show when={tooltipButtons().enabled.never_forget}>
            <ReviewButton
              label="Never F."
              color={tooltipButtons().colors.never_forget}
              onClick={() => handleSpecialDeck("never-forget")}
              disabled={isAdding()}
              loading={isAdding()}
            />
          </Show>
          <Show when={tooltipButtons().enabled.add}>
            <ReviewButton
              label="Add"
              color={tooltipButtons().colors.add}
              onClick={handleAddToDeck}
              disabled={isAdding() || !currentDeck()}
              loading={isAdding()}
            />
          </Show>
          <Show when={tooltipButtons().enabled.addEdit}>
            <ReviewButton
              label="Add+"
              color={tooltipButtons().colors.addEdit}
              onClick={handleAddToDeckPlus}
              disabled={isAdding() || !currentDeck()}
              loading={isAdding()}
            />
          </Show>
        </div>
      </div>

      <TranslationInput
        show={translation.showTranslation()}
        value={translation.translation()}
        isTranslating={translation.isTranslating()}
        onInput={translation.setTranslation}
        onKeyDown={translation.handleKeyDown}
        ref={(el) => (translation.inputRef = el)}
      />
    </>
  )
}
