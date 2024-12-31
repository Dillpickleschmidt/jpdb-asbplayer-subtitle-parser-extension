export async function fetchIchiMoe(url: string): Promise<string> {
  try {
    console.log("Attempting Ichi.moe fetch:", url)
    const response = await fetch(url)

    if (!response.ok) {
      console.error("Ichi.moe Error:", {
        status: response.status,
        statusText: response.statusText,
        url,
      })
      throw new Error(
        `Ichi.moe HTTP error: ${response.status} ${response.statusText}`
      )
    }

    return await response.text()
  } catch (error) {
    console.error("Ichi.moe fetch error:", {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack,
      raw: error,
    })
    throw error
  }
}
