import { Context, Effect, Layer, Schema } from "effect"
import { SqlClient, SqlSchema } from "effect/sql"
import type { BattlefieldEntry, BattlefieldUpdate } from "@triggertracker/domain"
import { CardId, CardNotFound, InvalidChoice } from "@triggertracker/domain"
import { CardRepo } from "./CardRepo.ts"

const BattlefieldRow = Schema.Struct({
  card_id: CardId,
  in_play: Schema.Number,
  choice: Schema.NullOr(Schema.String)
})

const fromRow = (row: typeof BattlefieldRow.Type): BattlefieldEntry => ({
  cardId: row.card_id,
  inPlay: row.in_play !== 0,
  choice: row.choice
})

export class BattlefieldRepo extends Context.Service<BattlefieldRepo, {
  readonly list: Effect.Effect<Array<BattlefieldEntry>>
  update(cardId: CardId, update: BattlefieldUpdate): Effect.Effect<BattlefieldEntry, CardNotFound | InvalidChoice>
  readonly reset: Effect.Effect<void>
}>()("triggertracker/api/BattlefieldRepo") {
  static readonly layer = Layer.effect(
    BattlefieldRepo,
    Effect.gen(function*() {
      const sql = yield* SqlClient.SqlClient
      const cards = yield* CardRepo

      const listRows = SqlSchema.findAll({
        Request: Schema.Void,
        Result: BattlefieldRow,
        execute: () =>
          sql`
            SELECT b.card_id, b.in_play, b.choice
            FROM battlefield b JOIN cards c ON c.id = b.card_id
            ORDER BY c.rowid
          `
      })

      const findRows = SqlSchema.findAll({
        Request: CardId,
        Result: BattlefieldRow,
        execute: (id) => sql`SELECT card_id, in_play, choice FROM battlefield WHERE card_id = ${id}`
      })

      const list = listRows(undefined).pipe(
        Effect.map((rows) => rows.map(fromRow)),
        Effect.orDie,
        Effect.withSpan("BattlefieldRepo.list")
      )

      const update = Effect.fn("BattlefieldRepo.update")(
        function*(cardId: CardId, change: BattlefieldUpdate) {
          const card = yield* cards.get(cardId)
          const [existing] = yield* Effect.orDie(findRows(cardId))
          const next: BattlefieldEntry = {
            cardId,
            inPlay: change.inPlay ?? (existing ? existing.in_play !== 0 : false),
            choice: change.choice !== undefined ? change.choice : (existing?.choice ?? null)
          }
          if (next.choice !== null && !card.choices?.some((choice) => choice.name === next.choice)) {
            return yield* new InvalidChoice({ cardId, choice: next.choice })
          }
          yield* sql`
            INSERT INTO battlefield (card_id, in_play, choice)
            VALUES (${cardId}, ${next.inPlay ? 1 : 0}, ${next.choice})
            ON CONFLICT (card_id) DO UPDATE SET in_play = excluded.in_play, choice = excluded.choice
          `
          return next
        },
        sql.withTransaction,
        Effect.catchTag("SqlError", Effect.die)
      )

      const reset = sql`DELETE FROM battlefield`.pipe(
        Effect.asVoid,
        Effect.orDie,
        Effect.withSpan("BattlefieldRepo.reset")
      )

      return BattlefieldRepo.of({ list, update, reset })
    })
  )
}
