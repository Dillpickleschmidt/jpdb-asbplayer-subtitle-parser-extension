import { For } from "solid-js"

export function DeckSelector(props: {
  decks: { id: number; name: string }[]
  currentDeck: string
  onDeckChange: (e: Event & { currentTarget: HTMLSelectElement }) => void
}) {
  return (
    <select
      name="decks"
      id="deck-select"
      class="max-w-24 bg-black text-right"
      value={props.currentDeck}
      onChange={props.onDeckChange}
    >
      <option value="">Sel. Deck</option>
      <For each={props.decks}>
        {(deck) => (
          <option value={deck.id}>{`${deck.id} - ${deck.name}`}</option>
        )}
      </For>
    </select>
  )
}
