// services/card-state.ts
export const getCardStateClass = (cardState: string[] | null): string => {
  if (!cardState || !cardState[0]) {
    return "jpdb-word jpdb-unparsed"
  }
  return `jpdb-word jpdb-${cardState[0]}`
}
