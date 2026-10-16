import { Effect, Layer } from "effect"
import { HttpApiBuilder } from "effect/http-api"
import { Api } from "@triggertracker/domain"
import { BattlefieldRepo } from "../services/BattlefieldRepo.ts"
import { Calculator } from "../services/Calculator.ts"
import { CardRepo } from "../services/CardRepo.ts"

export const CardsHandlers = HttpApiBuilder.group(
  Api,
  "cards",
  Effect.fn(function*(handlers) {
    const cards = yield* CardRepo
    return handlers.handleAll({
      list: () => cards.list,
      create: ({ payload }) => cards.create(payload),
      update: ({ params, payload }) => cards.update(params.id, payload),
      remove: ({ params }) => cards.remove(params.id),
      export: () => Effect.map(cards.list, (list) => ({ cards: list })),
      import: ({ payload }) => cards.replaceAll(payload),
      reset: () => cards.reset
    })
  })
)

export const BattlefieldHandlers = HttpApiBuilder.group(
  Api,
  "battlefield",
  Effect.fn(function*(handlers) {
    const battlefield = yield* BattlefieldRepo
    return handlers.handleAll({
      list: () => battlefield.list,
      update: ({ params, payload }) => battlefield.update(params.cardId, payload),
      reset: () => battlefield.reset
    })
  })
)

export const CalculatorHandlers = HttpApiBuilder.group(
  Api,
  "calculator",
  Effect.fn(function*(handlers) {
    const calculator = yield* Calculator
    return handlers.handleAll({
      calculate: ({ payload }) => calculator.calculate(payload)
    })
  })
)

/** All handler groups. Requires the repositories (and so a database). */
export const ApiHandlers = Layer.mergeAll(CardsHandlers, BattlefieldHandlers, CalculatorHandlers)

/** The service layers, given a `SqlClient`. */
export const ServicesLayer = Calculator.layer.pipe(
  Layer.provideMerge(BattlefieldRepo.layer),
  Layer.provideMerge(CardRepo.layer)
)
