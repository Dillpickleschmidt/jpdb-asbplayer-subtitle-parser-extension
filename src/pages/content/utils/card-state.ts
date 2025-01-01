// services/card-state.ts
export const getCardStateClass = (cardState: string | null): string => {
  if (!cardState) {
    return "jpdb-word jpdb-unparsed"
  }
  return `jpdb-word jpdb-${cardState}`
}
