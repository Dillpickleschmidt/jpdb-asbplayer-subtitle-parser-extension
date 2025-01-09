// components/TranslationInput.tsx
import { Show } from "solid-js"

type TranslationInputProps = {
  show: boolean
  value: string
  isTranslating: boolean
  onInput: (value: string) => void
  onKeyDown: (e: KeyboardEvent) => void
  ref: (el: HTMLInputElement | undefined) => void
}

export function TranslationInput(props: TranslationInputProps) {
  return (
    <Show when={props.show}>
      <div class="fixed left-0 top-[-15rem] z-[2000] w-full space-y-2 rounded-lg bg-black/95 px-6 pb-6 pt-5 text-start text-xl font-normal text-white [text-shadow:none]">
        <label>Write the English translation here:</label>
        <input
          ref={props.ref}
          value={props.value}
          onInput={(e) => props.onInput(e.currentTarget.value)}
          onKeyDown={props.onKeyDown}
          class="w-full rounded-md border-2 border-neutral-700/75 bg-neutral-800/75 px-3 py-2 text-white"
          placeholder={
            props.isTranslating
              ? "Loading translation..."
              : "Type translation and press Enter"
          }
          disabled={props.isTranslating}
        />
      </div>
    </Show>
  )
}
