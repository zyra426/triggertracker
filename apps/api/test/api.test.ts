import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { HttpServer } from "effect/http"
import { HttpApiTest } from "effect/http-api"
import type { CardInput } from "@triggertracker/domain"
import { Api, CardId } from "@triggertracker/domain"
import * as Database from "../src/db/Database.ts"
import { seedCards } from "../src/db/seed.ts"
import { ApiHandlers, ServicesLayer } from "../src/http/handlers.ts"

// A fresh in-memory database per test.
const TestLayer = Layer.mergeAll(
  ApiHandlers.pipe(
    Layer.provide(ServicesLayer),
    Layer.provide(Database.layerMemory)
  ),
  HttpServer.layerServices
)

const makeClient = HttpApiTest.groups(Api, ["cards", "battlefield", "calculator"])

const newCard: CardInput = {
  name: "Test Monk",
  types: ["Creature"],
  subtypes: ["Monk"],
  power: 1,
  toughness: 2,
  effects: [{ type: "prowess", targets: "self" }]
}

describe("Api", () => {
  it.effect("seeds the default cards", () =>
    Effect.gen(function*() {
      const client = yield* makeClient
      const cards = yield* client.cards.list()
      assert.deepStrictEqual(cards.map((c) => c.name), seedCards.map((c) => c.name))
    }).pipe(Effect.provide(TestLayer)))

  it.effect("creates, updates and removes cards", () =>
    Effect.gen(function*() {
      const client = yield* makeClient

      const created = yield* client.cards.create({ payload: newCard })
      assert.strictEqual(created.name, "Test Monk")
      assert.strictEqual(created.power, 1)

      const updated = yield* client.cards.update({
        params: { id: created.id },
        payload: { ...newCard, name: "Renamed Monk", power: 5 }
      })
      assert.strictEqual(updated.id, created.id)
      assert.strictEqual(updated.name, "Renamed Monk")
      assert.strictEqual(updated.power, 5)

      yield* client.cards.remove({ params: { id: created.id } })
      const cards = yield* client.cards.list()
      assert.isFalse(cards.some((c) => c.id === created.id))
    }).pipe(Effect.provide(TestLayer)))

  it.effect("rejects duplicate names, case-insensitively", () =>
    Effect.gen(function*() {
      const client = yield* makeClient
      const error = yield* client.cards.create({
        payload: { ...newCard, name: "narset, enlightened exile" }
      }).pipe(Effect.flip)
      assert.strictEqual(error._tag, "DuplicateCardName")
    }).pipe(Effect.provide(TestLayer)))

  it.effect("allows keeping a card's own name on update", () =>
    Effect.gen(function*() {
      const client = yield* makeClient
      const [first] = yield* client.cards.list()
      const updated = yield* client.cards.update({
        params: { id: first!.id },
        payload: { ...first!, power: 10 }
      })
      assert.strictEqual(updated.power, 10)
    }).pipe(Effect.provide(TestLayer)))

  it.effect("returns CardNotFound for unknown ids", () =>
    Effect.gen(function*() {
      const client = yield* makeClient
      const id = CardId.make("missing")
      const removeError = yield* client.cards.remove({ params: { id } }).pipe(Effect.flip)
      assert.strictEqual(removeError._tag, "CardNotFound")
      const battlefieldError = yield* client.battlefield.update({
        params: { cardId: id },
        payload: { inPlay: true }
      }).pipe(Effect.flip)
      assert.strictEqual(battlefieldError._tag, "CardNotFound")
    }).pipe(Effect.provide(TestLayer)))

  it.effect("tracks the battlefield and validates modes", () =>
    Effect.gen(function*() {
      const client = yield* makeClient
      const cards = yield* client.cards.list()
      const siege = cards.find((c) => c.name === "Frostcliff Siege")!

      const entry = yield* client.battlefield.update({ params: { cardId: siege.id }, payload: { inPlay: true } })
      assert.deepStrictEqual(entry, { cardId: siege.id, inPlay: true, choice: null })

      const chosen = yield* client.battlefield.update({ params: { cardId: siege.id }, payload: { choice: "Temur" } })
      assert.deepStrictEqual(chosen, { cardId: siege.id, inPlay: true, choice: "Temur" })

      const error = yield* client.battlefield.update({
        params: { cardId: siege.id },
        payload: { choice: "Abzan" }
      }).pipe(Effect.flip)
      assert.strictEqual(error._tag, "InvalidChoice")

      assert.deepStrictEqual(yield* client.battlefield.list(), [chosen])
      yield* client.battlefield.reset()
      assert.deepStrictEqual(yield* client.battlefield.list(), [])
    }).pipe(Effect.provide(TestLayer)))

  it.effect("removes battlefield entries when a card is deleted", () =>
    Effect.gen(function*() {
      const client = yield* makeClient
      const [first] = yield* client.cards.list()
      yield* client.battlefield.update({ params: { cardId: first!.id }, payload: { inPlay: true } })
      yield* client.cards.remove({ params: { id: first!.id } })
      assert.deepStrictEqual(yield* client.battlefield.list(), [])
    }).pipe(Effect.provide(TestLayer)))

  it.effect("calculates from the stored battlefield", () =>
    Effect.gen(function*() {
      const client = yield* makeClient
      const cards = yield* client.cards.list()
      const sokka = cards.find((c) => c.name === "Sokka, Tenacious Tactician")!
      yield* client.battlefield.update({ params: { cardId: sokka.id }, payload: { inPlay: true } })

      const result = yield* client.calculator.calculate({
        payload: { instantSorcery: 1, otherNonCreature: 1, combatInstantSorcery: 1 }
      })
      assert.strictEqual(result.preCombat.creatures[0]!.finalPower, 5)
      assert.strictEqual(result.preCombat.tokens[0]!.count, 2)
      assert.strictEqual(result.combat!.creatures[0]!.finalPower, 6)
    }).pipe(Effect.provide(TestLayer)))

  it.effect("exports, imports and resets the card database", () =>
    Effect.gen(function*() {
      const client = yield* makeClient
      const exported = yield* client.cards.export()
      const [first, second] = exported.cards
      yield* client.battlefield.update({ params: { cardId: first!.id! }, payload: { inPlay: true } })
      yield* client.battlefield.update({ params: { cardId: second!.id! }, payload: { inPlay: true } })

      // Keep the first card (with its id), drop the rest, add a new one.
      const imported = yield* client.cards.import({ payload: { cards: [first!, newCard] } })
      assert.deepStrictEqual(imported.map((c) => c.name), [first!.name, newCard.name])
      assert.strictEqual(imported[0]!.id, first!.id)
      // Battlefield state survives for retained cards only.
      assert.deepStrictEqual(
        (yield* client.battlefield.list()).map((e) => e.cardId),
        [first!.id]
      )

      const duplicate = yield* client.cards.import({
        payload: { cards: [newCard, { ...newCard, name: "TEST MONK" }] }
      }).pipe(Effect.flip)
      assert.strictEqual(duplicate._tag, "DuplicateCardName")

      const reset = yield* client.cards.reset()
      assert.strictEqual(reset.length, seedCards.length)
      assert.deepStrictEqual(yield* client.battlefield.list(), [])
    }).pipe(Effect.provide(TestLayer)))

  it.effect("rejects invalid payloads", () =>
    Effect.gen(function*() {
      const client = yield* makeClient
      const error = yield* client.calculator.calculate({
        payload: { instantSorcery: -1, otherNonCreature: 0, combatInstantSorcery: 0 }
      }).pipe(Effect.flip)
      assert.isDefined(error)
    }).pipe(Effect.provide(TestLayer)))
})
