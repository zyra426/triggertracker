import { Context, Effect, Layer } from "effect"
import type { CalculationResult, SpellCounts } from "@triggertracker/domain"
import { calculate as runEngine } from "../engine/Engine.ts"
import { BattlefieldRepo } from "./BattlefieldRepo.ts"
import { CardRepo } from "./CardRepo.ts"

export class Calculator extends Context.Service<Calculator, {
  calculate(spells: SpellCounts): Effect.Effect<CalculationResult>
}>()("triggertracker/api/Calculator") {
  static readonly layer = Layer.effect(
    Calculator,
    Effect.gen(function*() {
      const cardRepo = yield* CardRepo
      const battlefieldRepo = yield* BattlefieldRepo

      const calculate = Effect.fn("Calculator.calculate")(function*(spells: SpellCounts) {
        const [cards, battlefield] = yield* Effect.all([cardRepo.list, battlefieldRepo.list])
        return runEngine({ cards, battlefield, spells })
      })

      return Calculator.of({ calculate })
    })
  )
}
