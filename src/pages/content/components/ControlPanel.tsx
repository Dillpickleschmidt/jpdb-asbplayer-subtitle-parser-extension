// UI component - only runs in main window
import { Component } from "solid-js"

export const ControlPanel: Component = () => {
  return (
    <div class="fixed right-5 top-20 z-[2000] w-80 rounded-xl bg-white p-4 text-black shadow-lg">
      <header class="space-y-2">
        <h1 class="text-xl font-bold">Subtitle Styler</h1>
        <p class="text-sm">Subtitles will be blue with Noto Sans JP font</p>
      </header>
    </div>
  )
}
