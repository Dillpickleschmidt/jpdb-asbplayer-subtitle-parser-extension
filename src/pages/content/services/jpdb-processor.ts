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

// // Limit to 1 request per second
// import { ChromeMessage, RawJpdbBatchProcessingResult } from "../types"

// export class JpdbProcessor {
//   private static cooldown: Promise<void> = Promise.resolve()

//   static async fetchVocabularyBatch(
//     texts: string[]
//   ): Promise<RawJpdbBatchProcessingResult> {
//     await this.cooldown

//     const response = (await chrome.runtime.sendMessage({
//       type: "JPDB_parseTextBatch",
//       args: {
//         params: [texts],
//       },
//     })) as ChromeMessage<RawJpdbBatchProcessingResult>

//     this.cooldown = new Promise((resolve) => setTimeout(resolve, 1000))

//     if (!response.success) throw new Error(response.error)

//     return response.data
//   }
// }
