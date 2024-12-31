import logo from "@assets/img/logo.svg"
import "@src/styles/index.css"
import { createEffect, createSignal } from "solid-js"
import styles from "./Popup.module.css"

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
    <div class={styles.App}>
      <header class={styles.header}>
        <img src={logo} class={styles.logo} alt="logo" />
        <div class="flex w-full max-w-md flex-col gap-4 p-4">
          <h2 class="text-xl font-bold">JPDB Settings</h2>

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
            class="rounded-md bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
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
        </div>
      </header>
    </div>
  )
}
