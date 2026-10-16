import { Schema } from "effect"
import { CardId } from "./Card.ts"

/** Whether a card is in play, and which mode was chosen for modal cards. */
export const BattlefieldEntry = Schema.Struct({
  cardId: CardId,
  inPlay: Schema.Boolean,
  choice: Schema.NullOr(Schema.String)
})
export type BattlefieldEntry = typeof BattlefieldEntry.Type

export const BattlefieldUpdate = Schema.Struct({
  inPlay: Schema.optionalKey(Schema.Boolean),
  choice: Schema.optionalKey(Schema.NullOr(Schema.String))
})
export type BattlefieldUpdate = typeof BattlefieldUpdate.Type
