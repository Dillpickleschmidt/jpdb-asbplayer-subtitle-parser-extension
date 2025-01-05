import "@src/styles/index.css"
import { createEffect, createSignal } from "solid-js"

export default function Popup() {
  const [apiKey, setApiKey] = createSignal("")
  const [status, setStatus] = createSignal("")
  const [currentKey, setCurrentKey] = createSignal("") // New signal for current key

  // Load existing API key on component mount
  createEffect(() => {
    chrome.storage.local.get(["jpdb_key"], (result) => {
      if (result.jpdb_key) {
        setApiKey(result.jpdb_key)
        setCurrentKey(result.jpdb_key)
      }
    })
  })

  const handleSaveKey = () => {
    chrome.storage.local.set({ jpdb_key: apiKey() }, () => {
      if (chrome.runtime.lastError) {
        console.error("Storage error:", chrome.runtime.lastError)
        setStatus("Error saving API key: " + chrome.runtime.lastError.message)
      } else {
        setCurrentKey(apiKey()) // Update the current key display
        setStatus("API key saved successfully!")
        setTimeout(() => setStatus(""), 3000)
      }
    })
  }

  return (
    <div class="text-center">
      <header class="flex flex-col items-center justify-center bg-[#282c34] text-base text-white">
        {/* <img src={logo} class={styles.logo} alt="logo" /> */}
        <div class="flex w-full max-w-md flex-col gap-4 p-4">
          <h2 class="text-xl font-bold">JPDB Subtitle Parser</h2>
          <div class="flex flex-col gap-2">
            <label for="apiKey" class="font-medium">
              JPDB API Key
            </label>
            <input
              id="apiKey"
              value={apiKey()}
              onInput={(e) => setApiKey(e.currentTarget.value)}
              class="rounded-md border px-3 py-2 text-black"
              placeholder="Enter your JPDB API key"
            />
            <div class="text-sm text-gray-400">
              Current key: {currentKey() || "No key set"}
            </div>
          </div>
          <button
            onClick={handleSaveKey}
            class="rounded-md border-2 border-neutral-400/25 bg-neutral-500 px-4 py-2 text-white transition-colors hover:bg-neutral-600"
          >
            Save API Key
          </button>
          {status() && (
            <p
              class={
                status().includes("Error") ? "text-red-500" : "text-green-500"
              }
            >
              {status()}
            </p>
          )}
          <button
            onClick={() => chrome.runtime.openOptionsPage()}
            class="rounded-md border-2 border-indigo-300/25 bg-indigo-400 px-4 py-2 text-black transition-colors hover:bg-indigo-500"
          >
            Open Settings
          </button>
        </div>
      </header>
    </div>
  )
}
