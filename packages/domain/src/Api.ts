import { Schema } from "effect"
import { HttpApi, HttpApiEndpoint, HttpApiGroup, HttpApiSchema, OpenApi } from "effect/http-api"
import { BattlefieldEntry, BattlefieldUpdate } from "./Battlefield.ts"
import { CalculationResult, SpellCounts } from "./Calculation.ts"
import { Card, CardId, CardInput } from "./Card.ts"
import { CardNotFound, DuplicateCardName, InvalidChoice } from "./Errors.ts"

/** Shape of an exported / imported card list. Ids are optional on import. */
export const CardsDocument = Schema.Struct({
  cards: Schema.Array(Schema.Struct({
    id: Schema.optionalKey(CardId),
    ...CardInput.fields
  }))
})
export type CardsDocument = typeof CardsDocument.Type

export class CardsApi extends HttpApiGroup.make("cards")
  .add(
    HttpApiEndpoint.get("list", "/", {
      success: Schema.Array(Card)
    }),
    HttpApiEndpoint.post("create", "/", {
      payload: CardInput,
      success: Card,
      error: DuplicateCardName
    }),
    HttpApiEndpoint.put("update", "/:id", {
      params: { id: CardId },
      payload: CardInput,
      success: Card,
      error: [CardNotFound, DuplicateCardName]
    }),
    HttpApiEndpoint.delete("remove", "/:id", {
      params: { id: CardId },
      success: HttpApiSchema.NoContent,
      error: CardNotFound
    }),
    HttpApiEndpoint.get("export", "/export", {
      success: CardsDocument
    }),
    HttpApiEndpoint.post("import", "/import", {
      payload: CardsDocument,
      success: Schema.Array(Card),
      error: DuplicateCardName
    }),
    HttpApiEndpoint.post("reset", "/reset", {
      success: Schema.Array(Card)
    })
  )
  .prefix("/cards")
  .annotateMerge(OpenApi.annotations({ title: "Cards", description: "The card database" }))
{}

export class BattlefieldApi extends HttpApiGroup.make("battlefield")
  .add(
    HttpApiEndpoint.get("list", "/", {
      success: Schema.Array(BattlefieldEntry)
    }),
    HttpApiEndpoint.put("update", "/:cardId", {
      params: { cardId: CardId },
      payload: BattlefieldUpdate,
      success: BattlefieldEntry,
      error: [CardNotFound, InvalidChoice]
    }),
    HttpApiEndpoint.delete("reset", "/", {
      success: HttpApiSchema.NoContent
    })
  )
  .prefix("/battlefield")
  .annotateMerge(OpenApi.annotations({ title: "Battlefield", description: "Cards in play and chosen modes" }))
{}

export class CalculatorApi extends HttpApiGroup.make("calculator")
  .add(
    HttpApiEndpoint.post("calculate", "/calculate", {
      payload: SpellCounts,
      success: CalculationResult
    })
  )
  .annotateMerge(OpenApi.annotations({ title: "Calculator", description: "Trigger and token calculations" }))
{}

export class Api extends HttpApi.make("trigger-tracker")
  .add(CardsApi)
  .add(BattlefieldApi)
  .add(CalculatorApi)
  .prefix("/api")
  .annotateMerge(OpenApi.annotations({ title: "MTG Trigger Tracker API" }))
{}
