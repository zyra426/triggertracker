import { Schema } from "effect"
import { CardId, SpellTrigger, TokenSpec } from "./Card.ts"

const Count = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0))

/** Noncreature spells cast this turn. */
export const SpellCounts = Schema.Struct({
  instantSorcery: Count,
  otherNonCreature: Count,
  /** Instants / sorceries cast after moving to combat. */
  combatInstantSorcery: Count
})
export type SpellCounts = typeof SpellCounts.Type

export const CreatureResult = Schema.Struct({
  cardId: CardId,
  name: Schema.String,
  basePower: Schema.Int,
  baseToughness: Schema.Int,
  prowessInstances: Count,
  prowessBonus: Count,
  magecraftBonus: Count,
  anthemPower: Schema.Int,
  anthemToughness: Schema.Int,
  finalPower: Schema.Int,
  finalToughness: Schema.Int,
  keywords: Schema.Array(Schema.String)
})
export type CreatureResult = typeof CreatureResult.Type

/** Final stats of creature tokens as they enter the battlefield. */
export const TokenStats = Schema.Struct({
  basePower: Schema.Int,
  baseToughness: Schema.Int,
  anthemPower: Schema.Int,
  anthemToughness: Schema.Int,
  counters: Count,
  power: Schema.Int,
  toughness: Schema.Int,
  keywords: Schema.Array(Schema.String),
  prowessInstances: Count,
  /**
   * Prowess bonus of the earliest tokens. A token only sees spells cast after
   * it was created, so later tokens get less.
   */
  maxProwessBonus: Count
})
export type TokenStats = typeof TokenStats.Type

export const TokenResult = Schema.Struct({
  sourceId: CardId,
  source: Schema.String,
  token: TokenSpec,
  trigger: SpellTrigger,
  /** Number of times the token ability triggered, including trigger doublers. */
  triggers: Count,
  multiplier: Count,
  count: Count,
  stats: Schema.NullOr(TokenStats)
})
export type TokenResult = typeof TokenResult.Type

export const PhaseSpells = Schema.Struct({
  instantSorcery: Count,
  otherNonCreature: Count,
  total: Count
})
export type PhaseSpells = typeof PhaseSpells.Type

export const PhaseResult = Schema.Struct({
  spells: PhaseSpells,
  creatures: Schema.Array(CreatureResult),
  tokens: Schema.Array(TokenResult)
})
export type PhaseResult = typeof PhaseResult.Type

export const Modifiers = Schema.Struct({
  tokenMultiplier: Count,
  tokenDoublers: Schema.Array(Schema.String),
  triggerDoublers: Schema.Array(Schema.Struct({ source: Schema.String, triggers: SpellTrigger })),
  anthems: Schema.Array(Schema.Struct({
    source: Schema.String,
    targets: Schema.String,
    power: Schema.Int,
    toughness: Schema.Int,
    keywords: Schema.Array(Schema.String)
  }))
})
export type Modifiers = typeof Modifiers.Type

export const CalculationResult = Schema.Struct({
  preCombat: PhaseResult,
  /** Totals including combat spells, or null when none were cast in combat. */
  combat: Schema.NullOr(PhaseResult),
  modifiers: Modifiers,
  warnings: Schema.Array(Schema.String)
})
export type CalculationResult = typeof CalculationResult.Type
