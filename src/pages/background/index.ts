// background/index.ts
import { defaultCSS } from "../options/css"
import { fetchIchiMoe } from "./api/ichi-moe"
import * as JpdbApi from "./api/jpdb"

console.log("background loaded")

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "FETCH_ICHI_MOE") {
    fetchIchiMoe(request.url)
      .then((html) => sendResponse({ success: true, data: html }))
      .catch((error) => {
        sendResponse({
          success: false,
          error: error.message,
        })
      })
    return true
  }

  if (request.type.startsWith("JPDB_")) {
    const functionName = request.type.replace("JPDB_", "")
    const apiFunction = JpdbApi[functionName]

    if (typeof apiFunction === "function") {
      console.log(`Routing to JPDB API function: ${functionName}`)
      apiFunction(request.args || [])
        .then((result) => sendResponse({ success: true, data: result }))
        .catch((error) => {
          console.error(`JPDB API error in ${functionName}:`, error)
          sendResponse({
            success: false,
            error: error.message,
          })
        })
      return true // Will respond asynchronously
    } else {
      console.error(`JPDB API function not found: ${functionName}`)
      sendResponse({
        success: false,
        error: `Function ${functionName} does not exist in JPDB API.`,
      })
      return false
    }
  }

  console.error("Unrecognized request type:", request.type)
  sendResponse({
    success: false,
    error: "Invalid request type.",
  })
})

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    // Set default CSS on first installation
    chrome.storage.sync.set({ customWordCSS: defaultCSS }, () => {
      console.log("Default CSS installed")
    })
  }
})
