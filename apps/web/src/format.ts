import type { TokenResult } from "@triggertracker/domain"

export const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`)

export const tokenLabel = (token: TokenResult) => {
  const { power, toughness, name } = token.token
  return power !== undefined && toughness !== undefined ? `${power}/${toughness} ${name}` : name
}
