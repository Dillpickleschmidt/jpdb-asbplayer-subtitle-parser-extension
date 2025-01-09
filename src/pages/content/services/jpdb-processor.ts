// services/jpdb-processor.ts
import { ChromeMessage, RawJpdbBatchProcessingResult } from "../types"

export class JpdbProcessor {
  static async fetchVocabularyBatch(
    texts: string[]
  ): Promise<RawJpdbBatchProcessingResult> {
    const response = (await chrome.runtime.sendMessage({
      type: "JPDB_parseTextBatch",
      args: {
        params: [texts],
      },
    })) as ChromeMessage<RawJpdbBatchProcessingResult>

    if (!response.success) throw new Error(response.error)

    return response.data
  }
}
