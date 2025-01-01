// jpdb.ts
export type JpdbError = {
  error: string
  error_message: string
}

const API_RATELIMIT = 0.2 // seconds between requests
const BASE_URL = "https://jpdb.io/api/v1"

// Track last request time
let lastRequestTime = 0

async function waitForRateLimit() {
  const now = Date.now()
  const timeSinceLastRequest = (now - lastRequestTime) / 1000

  if (timeSinceLastRequest < API_RATELIMIT) {
    const waitTime = (API_RATELIMIT - timeSinceLastRequest) * 1000
    await new Promise((resolve) => setTimeout(resolve, waitTime))
  }

  lastRequestTime = Date.now()
}

async function getApiKey(): Promise<string> {
  const result = await chrome.storage.local.get("jpdb_key")
  if (!result.jpdb_key) {
    throw new Error("JPDB API key not found. Please set it in the popup.")
  }
  return result.jpdb_key
}

async function makeRequest(endpoint: string, body: any) {
  await waitForRateLimit()

  const key = await getApiKey()
  const response = await fetch(`${BASE_URL}/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw await handleJpdbError(response)
  }

  return response.json()
}

async function handleJpdbError(response: Response): Promise<Error> {
  const errorBody = await response.text()
  console.error("JPDB Error:", {
    status: response.status,
    statusText: response.statusText,
    body: errorBody,
  })

  if (response.status === 429) return new Error("JPDB rate limit exceeded")
  if (response.status === 403)
    return new Error("JPDB API token invalid or expired")
  return new Error(`JPDB HTTP error: ${response.status} ${response.statusText}`)
}

// API Functions
export async function parseText(text: string) {
  return makeRequest("parse", {
    text,
    token_fields: ["vocabulary_index", "position", "length", "furigana"],
    position_length_encoding: "utf16",
    vocabulary_fields: ["spelling", "part_of_speech", "card_state"],
  })
}

export async function parseTextBatch(texts: string[]) {
  return makeRequest("parse", {
    text: texts,
    token_fields: ["vocabulary_index", "position", "length", "furigana"],
    position_length_encoding: "utf16",
    vocabulary_fields: [
      "vid",
      "sid",
      "rid",
      "spelling",
      "reading",
      "frequency_rank",
      "meanings",
      "part_of_speech",
      "card_state",
    ],
  })
}

export async function addToDeck(
  vid: number,
  sid: number,
  deckId: number | "blacklist" | "never-forget"
) {
  return makeRequest("deck/add-vocabulary", {
    id: deckId,
    vocabulary: [[vid, sid]],
  })
}

export async function removeFromDeck(
  vid: number,
  sid: number,
  deckId: number | "blacklist" | "never-forget"
) {
  return makeRequest("deck/remove-vocabulary", {
    id: deckId,
    vocabulary: [[vid, sid]],
  })
}

export async function setSentence(
  vid: number,
  sid: number,
  sentence?: string,
  translation?: string
) {
  const body: any = { vid, sid }
  if (sentence) body.sentence = sentence
  if (translation) body.translation = translation

  return makeRequest("set-card-sentence", body)
}

export async function review(vid: number, sid: number, rating: string) {
  const REVIEW_GRADES = {
    nothing: "1",
    something: "2",
    hard: "3",
    good: "4",
    easy: "5",
    pass: "p",
    fail: "f",
    known: "k",
    unknown: "n",
    never_forget: "w",
    blacklist: "-1",
  }

  return makeRequest("review", {
    vid,
    sid,
    grade: REVIEW_GRADES[rating] || rating,
  })
}
