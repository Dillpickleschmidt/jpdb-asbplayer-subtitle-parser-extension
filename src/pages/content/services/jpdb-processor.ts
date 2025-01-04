import {
  ChromeMessage,
  JpdbBatchProcessingResult,
  JpdbFetchCardStateResult,
} from "../types"

export class JpdbProcessor {
  static async fetchVocabularyBatch(
    texts: string[]
  ): Promise<JpdbBatchProcessingResult> {
    const response = (await chrome.runtime.sendMessage({
      type: "JPDB_parseTextBatch",
      args: texts,
    })) as ChromeMessage<JpdbBatchProcessingResult>

    if (!response.success) throw new Error(response.error)

    return response.data
  }

  static async fetchCardStates(
    texts: string
  ): Promise<JpdbFetchCardStateResult> {
    const response = (await chrome.runtime.sendMessage({
      type: "JPDB_fetchCardStates",
      args: texts,
    })) as ChromeMessage<JpdbFetchCardStateResult>

    if (!response.success) throw new Error(response.error)

    return response.data
  }
}
