import { For, Show } from "solid-js"

// VocabularyTooltip.tsx
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

export default function VocabularyTooltip(props: {
  vocabulary: VocabularyEntry
}) {
  return (
    <div class="absolute -top-20 left-1/2 z-50 flex w-80 -translate-x-1/2 -translate-y-full flex-col justify-between overflow-x-hidden rounded-md bg-black/95 text-start text-base text-white shadow-lg">
      <div class="max-h-64 overflow-y-auto p-4">
        <div class="mb-2 flex justify-between">
          <div class="flex">
            <div>
              <div class="text-3xl font-bold">{props.vocabulary.spelling}</div>
              <div class="text-sm leading-6">
                {props.vocabulary.partOfSpeech.join(", ")}
              </div>
            </div>
            <Show when={props.vocabulary.spelling != props.vocabulary.reading}>
              <div class="text-lg font-medium">
                【{props.vocabulary.reading}】
              </div>
            </Show>
          </div>
          <div class="flex flex-col items-end justify-between">
            <div class="text-right text-xs font-normal italic opacity-70">
              Rank #{props.vocabulary.frequencyRank}
            </div>
            <div>
              <For each={props.vocabulary.cardState}>
                {(cardState) => (
                  <div class="text-end italic leading-5">{cardState}</div>
                )}
              </For>
            </div>
          </div>
        </div>
        <div class="space-y-0.5 p-1 font-normal">
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
      <div class="flex w-full space-x-0.5 px-3 pb-3 pt-1">
        <button class="h-8 w-full rounded-md border border-black bg-red-500 text-black">
          Add
        </button>
        <button class="h-8 w-full rounded-md border border-black bg-yellow-500 text-black">
          Add
        </button>
        <button class="h-8 w-full rounded-md border border-black bg-green-500 text-black">
          Add
        </button>
        <button class="h-8 w-full rounded-md border border-black bg-sky-500 text-black">
          Add
        </button>
      </div>
    </div>
  )
}
