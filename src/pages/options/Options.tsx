// Options.tsx
import "@src/styles/index.css"
import { createEffect, createSignal } from "solid-js"
import KeybindCapture from "./components/KeybindCapture"
import { buildCSS, colorConfig, getColorsFromCSS } from "./cssConfig"

const Options = () => {
  const [customCSS, setCustomCSS] = createSignal(buildCSS())
  const [colors, setColors] = createSignal({})
  const [saveStatus, setSaveStatus] = createSignal("")

  // Load saved CSS when component mounts
  createEffect(() => {
    chrome.storage.sync.get(["customWordCSS"], (result) => {
      if (result.customWordCSS) {
        setCustomCSS(result.customWordCSS)
        setColors(getColorsFromCSS(result.customWordCSS))
      }
    })
  })

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

  const resetToDefault = () => {
    const defaultCSS = buildCSS()
    setCustomCSS(defaultCSS)
    setColors({})
    saveCSS(defaultCSS)
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

  const handleKeybindChange = (newKeybind: string) => {
    console.log("New keybind:", newKeybind)
  }

  return (
    <div>
      <header class="flex min-h-screen flex-col items-center bg-[#282c34] text-lg text-white">
        <div class="min-h-screen w-full max-w-4xl space-y-6 pb-24">
          <h1 class="mt-32 pb-6 text-center text-5xl font-bold">
            JPDB Subtitle Parser Settings
          </h1>
          <div class="flex items-center justify-between">
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
            <label class="col-start-1 col-end-3">Standard deck to add to</label>
            <input class="col-start-3 col-end-6 rounded-md border-2 border-red-500 bg-gray-700 px-3 py-2 text-white" />
            <button class="col-start-6 h-full rounded-md bg-emerald-400/50 text-black hover:bg-emerald-500">
              Default
            </button>

            <label class="col-start-1 col-end-3">
              Number of context sentences
            </label>
            <input
              type="number"
              value={1}
              min={1}
              class="col-start-3 col-end-6 rounded-md border-2 border-gray-600 bg-gray-700 px-3 py-2 text-white"
            />
            <button class="col-start-6 h-full rounded-md bg-emerald-400/50 text-black hover:bg-emerald-500">
              Default
            </button>
          </div>

          <h2 class="pt-6 text-2xl font-bold">Keybinds</h2>
          <div class="grid w-full grid-cols-6 items-center gap-6">
            <label class="col-start-1 col-end-3">Show popup</label>
            <KeybindCapture
              class="col-start-3 col-end-6 rounded-md border border-neutral-500 bg-amber-500/75 px-3 py-2 text-black saturate-50 hover:bg-neutral-500"
              defaultValue="Shift"
              placeholder="Click to set keybind"
              onChange={handleKeybindChange}
            />
            <button class="col-start-6 h-full rounded-md bg-emerald-400/50 text-black hover:bg-emerald-500">
              Default
            </button>

            <label class="col-start-1 col-end-3">Review word as nothing</label>
            <KeybindCapture
              class="col-start-3 col-end-6 rounded-md border border-neutral-500 bg-amber-500/75 px-3 py-2 text-black saturate-50 hover:bg-neutral-500"
              defaultValue="1"
              placeholder="Click to set keybind"
              onChange={handleKeybindChange}
            />
            <button class="col-start-6 h-full rounded-md bg-emerald-400/50 text-black hover:bg-emerald-500">
              Default
            </button>

            <label class="col-start-1 col-end-3">
              Review word as something
            </label>
            <KeybindCapture
              class="col-start-3 col-end-6 rounded-md border border-neutral-500 bg-amber-500/75 px-3 py-2 text-black saturate-50 hover:bg-neutral-500"
              defaultValue="2"
              placeholder="Click to set keybind"
              onChange={handleKeybindChange}
            />
            <button class="col-start-6 h-full rounded-md bg-emerald-400/50 text-black hover:bg-emerald-500">
              Default
            </button>

            <label class="col-start-1 col-end-3">Review word as hard</label>
            <KeybindCapture
              class="col-start-3 col-end-6 rounded-md border border-neutral-500 bg-amber-500/75 px-3 py-2 text-black saturate-50 hover:bg-neutral-500"
              defaultValue="3"
              placeholder="Click to set keybind"
              onChange={handleKeybindChange}
            />
            <button class="col-start-6 h-full rounded-md bg-emerald-400/50 text-black hover:bg-emerald-500">
              Default
            </button>

            <label class="col-start-1 col-end-3">Review word as good</label>
            <KeybindCapture
              class="col-start-3 col-end-6 rounded-md border border-neutral-500 bg-amber-500/75 px-3 py-2 text-black saturate-50 hover:bg-neutral-500"
              defaultValue="4"
              placeholder="Click to set keybind"
              onChange={handleKeybindChange}
            />
            <button class="col-start-6 h-full rounded-md bg-emerald-400/50 text-black hover:bg-emerald-500">
              Default
            </button>

            <label class="col-start-1 col-end-3">Review word as easy</label>
            <KeybindCapture
              class="col-start-3 col-end-6 rounded-md border border-neutral-500 bg-amber-500/75 px-3 py-2 text-black saturate-50 hover:bg-neutral-500"
              defaultValue="5"
              placeholder="Click to set keybind"
              onChange={handleKeybindChange}
            />
            <button class="col-start-6 h-full rounded-md bg-emerald-400/50 text-black hover:bg-emerald-500">
              Default
            </button>

            <label class="col-start-1 col-end-3">
              Mark word as never forget
            </label>
            <KeybindCapture
              class="col-start-3 col-end-6 rounded-md border border-neutral-500 bg-amber-500/75 px-3 py-2 text-black saturate-50 hover:bg-neutral-500"
              defaultValue="6"
              placeholder="Click to set keybind"
              onChange={handleKeybindChange}
            />
            <button class="col-start-6 h-full rounded-md bg-emerald-400/50 text-black hover:bg-emerald-500">
              Default
            </button>

            <label class="col-start-1 col-end-3">Blacklist word</label>
            <KeybindCapture
              class="col-start-3 col-end-6 rounded-md border border-neutral-500 bg-amber-500/75 px-3 py-2 text-black saturate-50 hover:bg-neutral-500"
              defaultValue="0"
              placeholder="Click to set keybind"
              onChange={handleKeybindChange}
            />
            <button class="col-start-6 h-full rounded-md bg-emerald-400/50 text-black hover:bg-emerald-500">
              Default
            </button>

            <label class="col-start-1 col-end-3">Add word to deck</label>
            <KeybindCapture
              class="col-start-3 col-end-6 rounded-md border border-neutral-500 bg-amber-500/75 px-3 py-2 text-black saturate-50 hover:bg-neutral-500"
              defaultValue="Shift + A"
              placeholder="Click to set keybind"
              onChange={handleKeybindChange}
            />
            <button class="col-start-6 h-full rounded-md bg-emerald-400/50 text-black hover:bg-emerald-500">
              Default
            </button>
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
                  class="ml-2 font-bold"
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

export default Options
