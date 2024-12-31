// background/index.ts
console.log("background loaded")

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "FETCH_ICHI_MOE") {
    console.log("Attempting Ichi.moe fetch:", request.url)
    fetch(request.url)
      .then(async (response) => {
        if (!response.ok) {
          console.error("Ichi.moe Error:", {
            status: response.status,
            statusText: response.statusText,
            url: request.url,
          })
          throw new Error(
            `Ichi.moe HTTP error: ${response.status} ${response.statusText}`
          )
        }
        return response.text()
      })
      .then((html) => sendResponse({ success: true, data: html }))
      .catch((error) => {
        console.error("Ichi.moe fetch error:", {
          name: error.name,
          message: error.message,
          code: error.code,
          stack: error.stack,
          raw: error,
        })
        sendResponse({
          success: false,
          error: error.message,
        })
      })
    return true
  }

  if (request.type === "FETCH_JPDB") {
    console.log("Attempting to fetch JPDB key from storage")
    chrome.storage.local.get("jpdb_key", (result) => {
      const jpdb_key = result.jpdb_key

      if (!jpdb_key) {
        console.error("JPDB Error: No API key found in storage")
        sendResponse({
          success: false,
          error: "JPDB API key not found. Please set it in the popup.",
        })
        return
      }

      console.log("Attempting JPDB fetch with text:", request.text)
      fetch("https://jpdb.io/api/v1/parse", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jpdb_key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: request.text,
          token_fields: ["vocabulary_index", "position", "length", "furigana"],
          position_length_encoding: "utf16",
          vocabulary_fields: ["spelling", "part_of_speech", "card_state"],
        }),
      })
        .then(async (response) => {
          if (!response.ok) {
            const errorBody = await response.text()
            console.error("JPDB Error:", {
              status: response.status,
              statusText: response.statusText,
              body: errorBody,
              requestText: request.text,
            })

            if (response.status === 429) {
              throw new Error("JPDB rate limit exceeded")
            }
            if (response.status === 403) {
              throw new Error("JPDB API token invalid or expired")
            }
            throw new Error(
              `JPDB HTTP error: ${response.status} ${response.statusText}`
            )
          }
          return response.json()
        })
        .then((data) => {
          console.log("JPDB fetch successful")
          sendResponse({ success: true, data })
        })
        .catch((error) => {
          console.error("JPDB fetch error:", {
            name: error.name,
            message: error.message,
            code: error.code,
            stack: error.stack,
            raw: error,
          })
          sendResponse({
            success: false,
            error: error.message,
          })
        })
    })

    return true // Will respond asynchronously
  }
})
