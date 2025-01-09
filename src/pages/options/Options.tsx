// Options.tsx
import "@src/styles/index.css"
import { DEFAULT_SETTINGS } from "@src/types"
import { createEffect, createSignal, For } from "solid-js"
import { ChromeMessage, RawJpdbUserDecksResponse } from "../content/types"
import KeybindCapture from "./components/KeybindCapture"
import { buildCSS, colorConfig, getColorsFromCSS } from "./cssConfig"

type KeybindType = keyof typeof DEFAULT_SETTINGS.keybinds
type TooltipButtonType = keyof typeof DEFAULT_SETTINGS.tooltipButtons.enabled

const fetchUserDecks = async (): Promise<RawJpdbUserDecksResponse> => {
  const response = (await chrome.runtime.sendMessage({
    type: "JPDB_getUserDecks",
    args: {
      params: [], // getUserDecks doesn't take any parameters
    },
  })) as ChromeMessage<RawJpdbUserDecksResponse>

  if (!response.success) throw new Error(response.error)

  return response.data
}

export default function Options() {
  const [customCSS, setCustomCSS] = createSignal(buildCSS())
  const [colors, setColors] = createSignal({})
  const [saveStatus, setSaveStatus] = createSignal("")
  const [keybinds, setKeybinds] = createSignal(DEFAULT_SETTINGS.keybinds)
  const [tooltipButtons, setTooltipButtons] = createSignal(
    DEFAULT_SETTINGS.tooltipButtons
  )
  const [userDecks, setUserDecks] =
    createSignal<RawJpdbUserDecksResponse | null>(null)
  const [error, setError] = createSignal<string | null>(null)
  const [selectedDecks, setSelectedDecks] = createSignal<number[]>([])

  // Load saved settings when component mounts
  createEffect(() => {
    chrome.storage.sync.get(
      ["customWordCSS", "keybinds", "tooltipButtons"],
      (result) => {
        if (result.customWordCSS) {
          setCustomCSS(result.customWordCSS)
          setColors(getColorsFromCSS(result.customWordCSS))
        }
        if (result.keybinds) {
          setKeybinds(result.keybinds)
        }
        if (result.tooltipButtons) {
          setTooltipButtons(result.tooltipButtons)
        }
      }
    )
  })

  // Fetch user decks when the component mounts
  createEffect(() => {
    ;(async () => {
      try {
        const decks = await fetchUserDecks()
        setUserDecks(decks)
        console.log("User decks:", decks)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
        console.error("Failed to fetch user decks:", err)
      }
    })().then(() => chrome.storage.sync.set({ userDecks: userDecks() }))
  })

  // Load selected decks on component mount
  createEffect(() => {
    chrome.storage.sync.get("selectedDecks", (result) => {
      if (result.selectedDecks) {
        setSelectedDecks(result.selectedDecks)
      }
    })
  })

  const handleDeckSelection = (deckId: number, isSelected: boolean) => {
    const updatedDecks = isSelected
      ? [...selectedDecks(), deckId]
      : selectedDecks().filter((id) => id !== deckId)

    setSelectedDecks(updatedDecks)

    chrome.storage.sync.set({ selectedDecks: updatedDecks }, () => {
      console.log("Selected decks updated:", updatedDecks)
    })
  }

  const handleColorChange = (className: string, newColor: string) => {
    const newColors = { ...colors(), [className]: newColor }
    setColors(newColors)
    setCustomCSS(buildCSS(newColors))
  }

  const handleCSSChange = (
    e: Event & { currentTarget: HTMLTextAreaElement }
  ) => {
    const newCSS = e.currentTarget.value
    setCustomCSS(newCSS)
    setColors(getColorsFromCSS(newCSS))
  }

  const handleTooltipButtonChange = (
    button: TooltipButtonType,
    checked: boolean
  ) => {
    const newButtons = {
      ...tooltipButtons(),
      enabled: { ...tooltipButtons().enabled, [button]: checked },
    }
    setTooltipButtons(newButtons)
    setSaveStatus("Saving...")
    chrome.storage.sync.set({ tooltipButtons: newButtons }, () => {
      setSaveStatus("Saved!")
      setTimeout(() => setSaveStatus(""), 2000)
    })
  }

  const handleTooltipColorChange = (
    button: TooltipButtonType,
    color: string
  ) => {
    const newButtons = {
      ...tooltipButtons(),
      colors: { ...tooltipButtons().colors, [button]: color },
    }
    setTooltipButtons(newButtons)
    setSaveStatus("Saving...")
    chrome.storage.sync.set({ tooltipButtons: newButtons }, () => {
      setSaveStatus("Saved!")
      setTimeout(() => setSaveStatus(""), 2000)
    })
  }

  const resetToDefault = () => {
    const defaultCSS = buildCSS()
    setCustomCSS(defaultCSS)
    setColors({})
    setKeybinds(DEFAULT_SETTINGS.keybinds)
    setTooltipButtons(DEFAULT_SETTINGS.tooltipButtons)
    saveCSS(defaultCSS)
    chrome.storage.sync.set(
      {
        keybinds: DEFAULT_SETTINGS.keybinds,
        tooltipButtons: DEFAULT_SETTINGS.tooltipButtons,
      },
      () => {
        setSaveStatus("Saved!")
        setTimeout(() => setSaveStatus(""), 2000)
      }
    )
  }

  const saveCSS = (css = customCSS()) => {
    setSaveStatus("Saving...")
    chrome.storage.sync.set({ customWordCSS: css }, () => {
      setSaveStatus("Saved!")
      // Update styles in all tabs
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          if (tab.id) {
            chrome.scripting
              .executeScript({
                target: { tabId: tab.id },
                func: (css) => {
                  let style = document.getElementById("jpdb-custom-styles")
                  if (!style) {
                    style = document.createElement("style")
                    style.id = "jpdb-custom-styles"
                    document.head.appendChild(style)
                  }
                  style.textContent = css
                },
                args: [css],
              })
              .catch(console.error)
          }
        })
      })
      setTimeout(() => setSaveStatus(""), 2000)
    })
  }

  const saveKeybinds = (newKeybinds: typeof DEFAULT_SETTINGS.keybinds) => {
    setSaveStatus("Saving...")
    chrome.storage.sync.set({ keybinds: newKeybinds }, () => {
      setSaveStatus("Saved!")
      setTimeout(() => setSaveStatus(""), 2000)
    })
  }

  const handleKeybindChange = (type: KeybindType) => (newKeybind: string) => {
    const newKeybinds = { ...keybinds(), [type]: newKeybind }
    setKeybinds(newKeybinds)
    saveKeybinds(newKeybinds)
  }

  const resetKeybindToDefault = (type: KeybindType) => () => {
    const newKeybinds = {
      ...keybinds(),
      [type]: DEFAULT_SETTINGS.keybinds[type],
    }
    setKeybinds(newKeybinds)
    saveKeybinds(newKeybinds)
  }

  return (
    <div>
      <header class="flex min-h-screen flex-col items-center bg-[#282c34] text-lg text-white">
        <div class="min-h-screen w-full max-w-4xl space-y-6 pb-24">
          <h1 class="mt-32 pb-6 text-center text-5xl font-bold">
            JPDB Subtitle Parser Settings
          </h1>

          <div>
            <h2 class="text-2xl font-bold">Decks</h2>
            <h3 class="mt-4">
              Select the decks you want to appear in the tooltip's quick deck
              selector.
            </h3>
          </div>
          <div class="mt-6 max-h-[600px] overflow-y-auto">
            {userDecks() ? (
              <table class="w-full text-left text-sm text-gray-300">
                <thead class="sticky top-0 bg-gray-700 text-gray-100">
                  <tr>
                    <th class="px-4 py-2">Select</th>
                    <th class="px-4 py-2">Name</th>
                    <th class="px-4 py-2">Word Count</th>
                    <th class="px-4 py-2">Known (%)</th>
                    <th class="px-4 py-2">In-Progress (%)</th>
                    <th class="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  <For each={userDecks()?.decks.sort((a, b) => a[0] - b[0])}>
                    {(deck) => (
                      <tr class="border-b border-gray-600 hover:bg-gray-700">
                        <td class="space-x-1 px-4 py-2">
                          <input
                            type="checkbox"
                            id={`deck-${deck[0]}`}
                            checked={selectedDecks().includes(deck[0])}
                            onChange={(e) =>
                              handleDeckSelection(
                                deck[0],
                                e.currentTarget.checked
                              )
                            }
                          />
                          <label for={`deck-${deck[0]}`}>{deck[0]}</label>
                        </td>
                        <td class="px-4 py-2">{deck[1]}</td> {/* name */}
                        <td class="px-4 py-2">{deck[2]}</td> {/* word_count */}
                        <td class="px-4 py-2">
                          {(deck[3] as number)?.toFixed(2)}%
                        </td>
                        <td class="px-4 py-2">
                          {(deck[4] as number)?.toFixed(2)}%
                        </td>
                        <td class="text-nowrap px-4 py-2 text-center">
                          {deck[5] ? "Built-in" : ""}
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            ) : error() ? (
              <p class="text-red-500">Error: {error()}</p>
            ) : (
              <p>Loading decks...</p>
            )}
          </div>

          {/* <div class="flex items-center justify-between pt-6">
            <h2 class="text-2xl font-bold">Mining</h2>
            <a
              class="text-center text-indigo-400"
              href="https://jpdb.io"
              target="_blank"
              rel="noopener noreferrer"
            >
              Go to jpdb.io
            </a>
          </div>
          <div class="grid w-full grid-cols-6 items-center gap-6">
            <label class="col-start-1 col-end-3 leading-6">
              Default number of sentences <strong>before</strong> (for
              additional context)
            </label>
            <input
              type="number"
              value={0}
              min={0}
              class="col-start-3 col-end-6 rounded-md border-2 border-gray-600 bg-gray-700 px-3 py-2 text-white"
            />
            <button class="col-start-6 h-full rounded-md bg-emerald-400/50 text-black hover:bg-emerald-500">
              Default
            </button>

            <label class="col-start-1 col-end-3">
              Default number of sentences <strong>after</strong> (for additional
              context)
            </label>
            <input
              type="number"
              value={0}
              min={0}
              class="col-start-3 col-end-6 rounded-md border-2 border-gray-600 bg-gray-700 px-3 py-2 text-white"
            />
            <button class="col-start-6 h-full rounded-md bg-emerald-400/50 text-black hover:bg-emerald-500">
              Default
            </button>
          </div> */}

          <h2 class="pt-6 text-2xl font-bold">Keybinds</h2>
          <div class="grid w-full grid-cols-6 items-center gap-6">
            {/* The first one was correct */}
            <label class="col-start-1 col-end-3">Show popup</label>
            <KeybindCapture
              class="col-start-3 col-end-6 rounded-md border border-neutral-500 bg-amber-500/75 px-3 py-2 text-black saturate-50 hover:bg-neutral-500"
              defaultValue={keybinds().showPopup}
              placeholder="Click to set keybind"
              onChange={handleKeybindChange("showPopup")}
            />
            <button
              class="col-start-6 h-full rounded-md bg-emerald-400/50 text-black hover:bg-emerald-500 disabled:opacity-25 disabled:hover:bg-emerald-400/50"
              onClick={resetKeybindToDefault("showPopup")}
              disabled={
                keybinds().showPopup === DEFAULT_SETTINGS.keybinds.showPopup
              }
            >
              {keybinds().showPopup === DEFAULT_SETTINGS.keybinds.showPopup
                ? "Default"
                : "Reset"}
            </button>

            <label class="col-start-1 col-end-3">Review word as nothing</label>
            <KeybindCapture
              class="col-start-3 col-end-6 rounded-md border border-neutral-500 bg-amber-500/75 px-3 py-2 text-black saturate-50 hover:bg-neutral-500"
              defaultValue={keybinds().reviewNothing}
              placeholder="Click to set keybind"
              onChange={handleKeybindChange("reviewNothing")}
            />
            <button
              class="col-start-6 h-full rounded-md bg-emerald-400/50 text-black hover:bg-emerald-500 disabled:opacity-25 disabled:hover:bg-emerald-400/50"
              onClick={resetKeybindToDefault("reviewNothing")}
              disabled={
                keybinds().reviewNothing ===
                DEFAULT_SETTINGS.keybinds.reviewNothing
              }
            >
              {keybinds().reviewNothing ===
              DEFAULT_SETTINGS.keybinds.reviewNothing
                ? "Default"
                : "Reset"}
            </button>

            <label class="col-start-1 col-end-3">
              Review word as something
            </label>
            <KeybindCapture
              class="col-start-3 col-end-6 rounded-md border border-neutral-500 bg-amber-500/75 px-3 py-2 text-black saturate-50 hover:bg-neutral-500"
              defaultValue={keybinds().reviewSomething}
              placeholder="Click to set keybind"
              onChange={handleKeybindChange("reviewSomething")}
            />
            <button
              class="col-start-6 h-full rounded-md bg-emerald-400/50 text-black hover:bg-emerald-500 disabled:opacity-25 disabled:hover:bg-emerald-400/50"
              onClick={resetKeybindToDefault("reviewSomething")}
              disabled={
                keybinds().reviewSomething ===
                DEFAULT_SETTINGS.keybinds.reviewSomething
              }
            >
              {keybinds().reviewSomething ===
              DEFAULT_SETTINGS.keybinds.reviewSomething
                ? "Default"
                : "Reset"}
            </button>

            <label class="col-start-1 col-end-3">Review word as hard</label>
            <KeybindCapture
              class="col-start-3 col-end-6 rounded-md border border-neutral-500 bg-amber-500/75 px-3 py-2 text-black saturate-50 hover:bg-neutral-500"
              defaultValue={keybinds().reviewHard}
              placeholder="Click to set keybind"
              onChange={handleKeybindChange("reviewHard")}
            />
            <button
              class="col-start-6 h-full rounded-md bg-emerald-400/50 text-black hover:bg-emerald-500 disabled:opacity-25 disabled:hover:bg-emerald-400/50"
              onClick={resetKeybindToDefault("reviewHard")}
              disabled={
                keybinds().reviewHard === DEFAULT_SETTINGS.keybinds.reviewHard
              }
            >
              {keybinds().reviewHard === DEFAULT_SETTINGS.keybinds.reviewHard
                ? "Default"
                : "Reset"}
            </button>

            <label class="col-start-1 col-end-3">Review word as good</label>
            <KeybindCapture
              class="col-start-3 col-end-6 rounded-md border border-neutral-500 bg-amber-500/75 px-3 py-2 text-black saturate-50 hover:bg-neutral-500"
              defaultValue={keybinds().reviewOkay}
              placeholder="Click to set keybind"
              onChange={handleKeybindChange("reviewOkay")}
            />
            <button
              class="col-start-6 h-full rounded-md bg-emerald-400/50 text-black hover:bg-emerald-500 disabled:opacity-25 disabled:hover:bg-emerald-400/50"
              onClick={resetKeybindToDefault("reviewOkay")}
              disabled={
                keybinds().reviewOkay === DEFAULT_SETTINGS.keybinds.reviewOkay
              }
            >
              {keybinds().reviewOkay === DEFAULT_SETTINGS.keybinds.reviewOkay
                ? "Default"
                : "Reset"}
            </button>

            <label class="col-start-1 col-end-3">Review word as easy</label>
            <KeybindCapture
              class="col-start-3 col-end-6 rounded-md border border-neutral-500 bg-amber-500/75 px-3 py-2 text-black saturate-50 hover:bg-neutral-500"
              defaultValue={keybinds().reviewEasy}
              placeholder="Click to set keybind"
              onChange={handleKeybindChange("reviewEasy")}
            />
            <button
              class="col-start-6 h-full rounded-md bg-emerald-400/50 text-black hover:bg-emerald-500 disabled:opacity-25 disabled:hover:bg-emerald-400/50"
              onClick={resetKeybindToDefault("reviewEasy")}
              disabled={
                keybinds().reviewEasy === DEFAULT_SETTINGS.keybinds.reviewEasy
              }
            >
              {keybinds().reviewEasy === DEFAULT_SETTINGS.keybinds.reviewEasy
                ? "Default"
                : "Reset"}
            </button>

            <label class="col-start-1 col-end-3">
              Mark word as never forget
            </label>
            <KeybindCapture
              class="col-start-3 col-end-6 rounded-md border border-neutral-500 bg-amber-500/75 px-3 py-2 text-black saturate-50 hover:bg-neutral-500"
              defaultValue={keybinds().neverForget}
              placeholder="Click to set keybind"
              onChange={handleKeybindChange("neverForget")}
            />
            <button
              class="col-start-6 h-full rounded-md bg-emerald-400/50 text-black hover:bg-emerald-500 disabled:opacity-25 disabled:hover:bg-emerald-400/50"
              onClick={resetKeybindToDefault("neverForget")}
              disabled={
                keybinds().neverForget === DEFAULT_SETTINGS.keybinds.neverForget
              }
            >
              {keybinds().neverForget === DEFAULT_SETTINGS.keybinds.neverForget
                ? "Default"
                : "Reset"}
            </button>

            <label class="col-start-1 col-end-3">Blacklist word</label>
            <KeybindCapture
              class="col-start-3 col-end-6 rounded-md border border-neutral-500 bg-amber-500/75 px-3 py-2 text-black saturate-50 hover:bg-neutral-500"
              defaultValue={keybinds().blacklist}
              placeholder="Click to set keybind"
              onChange={handleKeybindChange("blacklist")}
            />
            <button
              class="col-start-6 h-full rounded-md bg-emerald-400/50 text-black hover:bg-emerald-500 disabled:opacity-25 disabled:hover:bg-emerald-400/50"
              onClick={resetKeybindToDefault("blacklist")}
              disabled={
                keybinds().blacklist === DEFAULT_SETTINGS.keybinds.blacklist
              }
            >
              {keybinds().blacklist === DEFAULT_SETTINGS.keybinds.blacklist
                ? "Default"
                : "Reset"}
            </button>

            <label class="col-start-1 col-end-3">Add word to deck</label>
            <KeybindCapture
              class="col-start-3 col-end-6 rounded-md border border-neutral-500 bg-amber-500/75 px-3 py-2 text-black saturate-50 hover:bg-neutral-500"
              defaultValue={keybinds().addToDeck}
              placeholder="Click to set keybind"
              onChange={handleKeybindChange("addToDeck")}
            />
            <button
              class="col-start-6 h-full rounded-md bg-emerald-400/50 text-black hover:bg-emerald-500 disabled:opacity-25 disabled:hover:bg-emerald-400/50"
              onClick={resetKeybindToDefault("addToDeck")}
              disabled={
                keybinds().addToDeck === DEFAULT_SETTINGS.keybinds.addToDeck
              }
            >
              {keybinds().addToDeck === DEFAULT_SETTINGS.keybinds.addToDeck
                ? "Default"
                : "Reset"}
            </button>
          </div>

          <h2 class="pt-6 text-2xl font-bold">Tooltip Buttons</h2>
          <div class="grid grid-cols-2 gap-4">
            {(
              Object.keys(DEFAULT_SETTINGS.tooltipButtons.enabled) as Array<
                keyof typeof DEFAULT_SETTINGS.tooltipButtons.enabled
              >
            ).map((key) => (
              <div class="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id={`btn-${key}`}
                  checked={tooltipButtons().enabled[key]}
                  onChange={(e) =>
                    handleTooltipButtonChange(key, e.currentTarget.checked)
                  }
                  class="h-4 w-4 rounded border-gray-300 bg-gray-700 text-emerald-500 focus:ring-emerald-500"
                />
                <input
                  type="color"
                  value={tooltipButtons().colors[key]}
                  onChange={(e) =>
                    handleTooltipColorChange(key, e.currentTarget.value)
                  }
                  class="h-8 w-12 rounded bg-transparent"
                />
                <label for={`btn-${key}`} class="cursor-pointer">
                  {DEFAULT_SETTINGS.tooltipButtons.labels[key]}
                </label>
              </div>
            ))}
          </div>

          <h2 class="pt-6 text-2xl font-bold">Text Colors</h2>
          <div class="grid grid-cols-2 gap-4">
            {colorConfig.map((config) => (
              <div class="flex items-center space-x-4">
                <input
                  type="color"
                  value={colors()[config.class] || config.color}
                  onChange={(e) =>
                    handleColorChange(config.class, e.currentTarget.value)
                  }
                  class="h-8 w-12 rounded bg-transparent"
                />
                <label>{config.label}</label>
                <span
                  class="cr-subtitle ml-2 font-bold"
                  style={{ color: colors()[config.class] || config.color }}
                >
                  Sample text
                </span>
              </div>
            ))}
          </div>

          <h2 class="pt-6 text-2xl font-bold">Custom CSS</h2>
          <textarea
            class="h-96 w-full overflow-y-auto rounded-md border border-gray-800 bg-gray-600/75 px-3 py-2 font-mono text-white"
            value={customCSS()}
            onInput={handleCSSChange}
            spellcheck={false}
          />

          <div class="flex items-center justify-between">
            <div class="space-x-4">
              <button
                onClick={resetToDefault}
                class="rounded-md bg-red-400/75 px-4 py-2 text-black hover:bg-red-400"
              >
                Reset to Default
              </button>
              <button
                onClick={() => saveCSS()}
                class="rounded-md bg-emerald-500 px-4 py-2 text-black hover:bg-emerald-400"
              >
                Save
              </button>
              {saveStatus() && (
                <span class="ml-2 text-emerald-400">{saveStatus()}</span>
              )}
            </div>
          </div>
        </div>
      </header>
    </div>
  )
}
