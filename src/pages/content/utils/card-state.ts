// utils/card-state.ts
export const getCardStateClass = (cardState: string | null): string => {
  if (cardState === null) {
    return "jpdb-word jpdb-segment jpdb-not-in-deck"
  }
  return `jpdb-word jpdb-segment jpdb-${cardState}`
}
