// services/jpdb-api.ts
export async function getTranslation(text: string): Promise<string> {
  const response = await chrome.runtime.sendMessage({
    type: "JPDB_getEnglishTranslation",
    args: { params: [text] },
  })

  if (!response.success) throw new Error(response.error)
  return response.data.text
}

export async function addToDeck(
  vid: number,
  sid: number,
  deckId: number,
  sentence?: string,
  translation?: string
): Promise<void> {
  const response = await chrome.runtime.sendMessage({
    type: "JPDB_addToDeck",
    args: { params: [vid, sid, deckId] },
  })

  if (!response.success) throw new Error(response.error)

  if (sentence) {
    const finalTranslation = translation || (await getTranslation(sentence))
    const setSentenceResponse = await chrome.runtime.sendMessage({
      type: "JPDB_setSentence",
      args: { params: [vid, sid, sentence, finalTranslation] },
    })

    if (!setSentenceResponse.success) throw new Error(setSentenceResponse.error)
  }
}

export async function reviewWord(
  vid: number,
  sid: number,
  rating: string
): Promise<void> {
  const response = await chrome.runtime.sendMessage({
    type: "JPDB_review",
    args: { params: [vid, sid, rating] },
  })

  if (!response.success) throw new Error(response.error)
}
