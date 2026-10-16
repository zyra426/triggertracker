import { Context, Effect, Layer, Schema } from "effect"
import { SqlClient, SqlSchema } from "effect/sql"
import type { Card, CardInput, CardsDocument } from "@triggertracker/domain"
import { CardId, CardNotFound, DuplicateCardName } from "@triggertracker/domain"
import { CardData, insertCards, seed } from "../db/Database.ts"

const CardRow = Schema.Struct({
  id: CardId,
  name: Schema.String,
  data: CardData
})

const fromRow = ({ id, name, data }: typeof CardRow.Type): Card => ({ id, name, ...data })

export class CardRepo extends Context.Service<CardRepo, {
  readonly list: Effect.Effect<Array<Card>>
  get(id: CardId): Effect.Effect<Card, CardNotFound>
  create(input: CardInput): Effect.Effect<Card, DuplicateCardName>
  update(id: CardId, input: CardInput): Effect.Effect<Card, CardNotFound | DuplicateCardName>
  remove(id: CardId): Effect.Effect<void, CardNotFound>
  /** Replace the whole card database, keeping battlefield state for retained ids. */
  replaceAll(document: CardsDocument): Effect.Effect<Array<Card>, DuplicateCardName>
  /** Restore the default cards and clear the battlefield. */
  readonly reset: Effect.Effect<Array<Card>>
}>()("triggertracker/api/CardRepo") {
  static readonly layer = Layer.effect(
    CardRepo,
    Effect.gen(function*() {
      const sql = yield* SqlClient.SqlClient
      const insert = (cards: Parameters<typeof insertCards>[0]) =>
        insertCards(cards).pipe(Effect.provideService(SqlClient.SqlClient, sql), Effect.orDie)

      const listRows = SqlSchema.findAll({
        Request: Schema.Void,
        Result: CardRow,
        execute: () => sql`SELECT id, name, data FROM cards ORDER BY rowid`
      })

      const findRows = SqlSchema.findAll({
        Request: CardId,
        Result: CardRow,
        execute: (id) => sql`SELECT id, name, data FROM cards WHERE id = ${id}`
      })

      const list = listRows(undefined).pipe(
        Effect.map((rows) => rows.map(fromRow)),
        Effect.orDie,
        Effect.withSpan("CardRepo.list")
      )

      const get = Effect.fn("CardRepo.get")(function*(id: CardId) {
        const [row] = yield* Effect.orDie(findRows(id))
        if (row === undefined) return yield* new CardNotFound({ id })
        return fromRow(row)
      })

      const assertNameAvailable = Effect.fnUntraced(function*(name: string, exceptId?: CardId) {
        const rows = yield* sql<{ id: string }>`SELECT id FROM cards WHERE name = ${name} COLLATE NOCASE`.pipe(
          Effect.orDie
        )
        if (rows.some((row) => row.id !== exceptId)) {
          return yield* new DuplicateCardName({ name })
        }
      })

      const create = Effect.fn("CardRepo.create")(
        function*(input: CardInput) {
          yield* assertNameAvailable(input.name)
          const [id] = yield* insert([input])
          return yield* Effect.orDie(get(id!))
        },
        sql.withTransaction,
        Effect.catchTag("SqlError", Effect.die)
      )

      const update = Effect.fn("CardRepo.update")(
        function*(id: CardId, input: CardInput) {
          yield* get(id)
          yield* assertNameAvailable(input.name, id)
          const { name, ...rest } = input
          const data = yield* Effect.orDie(Schema.encodeEffect(CardData)(rest))
          yield* Effect.orDie(sql`UPDATE cards SET name = ${name}, data = ${data} WHERE id = ${id}`)
          return yield* Effect.orDie(get(id))
        },
        sql.withTransaction,
        Effect.catchTag("SqlError", Effect.die)
      )

      const remove = Effect.fn("CardRepo.remove")(
        function*(id: CardId) {
          yield* get(id)
          yield* Effect.orDie(sql`DELETE FROM cards WHERE id = ${id}`)
        },
        sql.withTransaction,
        Effect.catchTag("SqlError", Effect.die)
      )

      const replaceAll = Effect.fn("CardRepo.replaceAll")(
        function*(document: CardsDocument) {
          const names = new Set<string>()
          for (const card of document.cards) {
            const key = card.name.toLowerCase()
            if (names.has(key)) return yield* new DuplicateCardName({ name: card.name })
            names.add(key)
          }
          // Drop repeated ids so each imported card gets its own row.
          const ids = new Set<string>()
          const cards = document.cards.map((card) => {
            if (card.id === undefined || ids.has(card.id)) return { ...card, id: undefined }
            ids.add(card.id)
            return card
          })

          const battlefield = yield* sql<{ card_id: string; in_play: number; choice: string | null }>`
            SELECT card_id, in_play, choice FROM battlefield
          `
          yield* sql`DELETE FROM cards`
          const inserted = new Set<string>(yield* insert(cards))
          for (const row of battlefield) {
            if (inserted.has(row.card_id)) {
              yield* sql`INSERT INTO battlefield ${sql.insert(row)}`
            }
          }
          return yield* list
        },
        sql.withTransaction,
        Effect.catchTag("SqlError", Effect.die)
      )

      const reset = Effect.gen(function*() {
        yield* sql`DELETE FROM cards`
        yield* Effect.provideService(seed, SqlClient.SqlClient, sql)
        return yield* list
      }).pipe(
        sql.withTransaction,
        Effect.orDie,
        Effect.withSpan("CardRepo.reset")
      )

      return CardRepo.of({ list, get, create, update, remove, replaceAll, reset })
    })
  )
}
