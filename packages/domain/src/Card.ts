import { Schema } from "effect"

export const CardId = Schema.String.pipe(Schema.brand("CardId"))
export type CardId = typeof CardId.Type

const Count = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0))
const Modifier = Schema.Int

/** Which spells a trigger reacts to. */
export const SpellTrigger = Schema.Literals(["any", "instantSorcery"])
export type SpellTrigger = typeof SpellTrigger.Type

/** A token a card creates, e.g. a 1/1 white Ally creature or a Treasure. */
export const TokenSpec = Schema.Struct({
  name: Schema.NonEmptyString,
  types: Schema.Array(Schema.NonEmptyString),
  subtypes: Schema.Array(Schema.NonEmptyString),
  power: Schema.optionalKey(Schema.Int),
  toughness: Schema.optionalKey(Schema.Int),
  keywords: Schema.optionalKey(Schema.Array(Schema.NonEmptyString))
})
export type TokenSpec = typeof TokenSpec.Type

/** Prowess: +1/+1 until end of turn whenever you cast a noncreature spell. */
export const Prowess = Schema.Struct({
  type: Schema.Literal("prowess"),
  targets: Schema.Literals(["self", "allies", "all"]),
  excludeSelf: Schema.optionalKey(Schema.Boolean)
})

/** Create tokens whenever you cast a matching spell. */
export const TokenOnCast = Schema.Struct({
  type: Schema.Literal("tokenOnCast"),
  token: TokenSpec,
  trigger: SpellTrigger
})

/** Triggered abilities caused by casting matching spells trigger an additional time (Veyran). */
export const TriggerDoubler = Schema.Struct({
  type: Schema.Literal("triggerDoubler"),
  triggers: SpellTrigger
})

/** Twice as many tokens are created instead. */
export const TokenDoubler = Schema.Struct({
  type: Schema.Literal("tokenDoubler")
})

/** A static buff to a group of creatures you control. */
export const Anthem = Schema.Struct({
  type: Schema.Literal("anthem"),
  targets: Schema.Literals(["all", "tokens", "allies"]),
  power: Modifier,
  toughness: Modifier,
  keywords: Schema.optionalKey(Schema.Array(Schema.NonEmptyString))
})

/** This creature gets +N/+N whenever you cast an instant or sorcery. */
export const Magecraft = Schema.Struct({
  type: Schema.Literal("magecraft"),
  bonus: Count
})

/** Whenever another Ally you control enters, put counters on it (Wartime Protestors). */
export const AllyEnters = Schema.Struct({
  type: Schema.Literal("allyEnters"),
  counterAmount: Count,
  gainsHaste: Schema.Boolean
})

export const CardEffect = Schema.Union([
  Prowess,
  TokenOnCast,
  TriggerDoubler,
  TokenDoubler,
  Anthem,
  Magecraft,
  AllyEnters
]).pipe(Schema.toTaggedUnion("type"))
export type CardEffect = typeof CardEffect.Type
export type CardEffectType = CardEffect["type"]

/** One mode of a modal card (e.g. Frostcliff Siege: Jeskai or Temur). */
export const CardChoice = Schema.Struct({
  name: Schema.NonEmptyString,
  effects: Schema.Array(CardEffect)
})
export type CardChoice = typeof CardChoice.Type

/** Everything about a card except its id. Used for create / update payloads. */
export const CardInput = Schema.Struct({
  name: Schema.Trimmed.check(Schema.isNonEmpty()),
  types: Schema.Array(Schema.NonEmptyString),
  subtypes: Schema.Array(Schema.NonEmptyString),
  power: Schema.optionalKey(Schema.Int),
  toughness: Schema.optionalKey(Schema.Int),
  effects: Schema.Array(CardEffect),
  choices: Schema.optionalKey(Schema.Array(CardChoice))
})
export type CardInput = typeof CardInput.Type

export const Card = Schema.Struct({
  id: CardId,
  ...CardInput.fields
})
export type Card = typeof Card.Type

export const isCreature = (card: { readonly types: ReadonlyArray<string> }): boolean => card.types.includes("Creature")

export const isAlly = (card: { readonly subtypes: ReadonlyArray<string> }): boolean => card.subtypes.includes("Ally")
