import { SqliteClient, SqliteMigrator } from "@effect/sql-sqlite-node"
import { Config, Effect, Layer, Schema } from "effect"
import { SqlClient } from "effect/sql"
import type { CardInput } from "@triggertracker/domain"
import { CardId, CardInput as CardInputSchema } from "@triggertracker/domain"
import { mkdirSync } from "node:fs"
import { dirname } from "node:path"
import { seedCards } from "./seed.ts"

/** Card fields stored in the JSON `data` column (everything but id and name). */
export const CardData = Schema.fromJsonString(CardInputSchema.mapFields(({ name: _, ...rest }) => rest))

const encodeCardData = Schema.encodeEffect(CardData)

/** Insert cards in order. Ids are generated unless given. */
export const insertCards = Effect.fnUntraced(function*(
  cards: ReadonlyArray<CardInput & { readonly id?: CardId | undefined }>
) {
  const sql = yield* SqlClient.SqlClient
  const inserted: Array<CardId> = []
  for (const { id, name, ...rest } of cards) {
    const cardId = id ?? CardId.make(crypto.randomUUID())
    const data = yield* encodeCardData(rest)
    yield* sql`INSERT INTO cards ${sql.insert({ id: cardId, name, data })}`
    inserted.push(cardId)
  }
  return inserted
})

export const seed = insertCards(seedCards)

const migrations = SqliteMigrator.fromRecord({
  "0001_create_tables": Effect.gen(function*() {
    const sql = yield* SqlClient.SqlClient
    yield* sql`
      CREATE TABLE cards (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE COLLATE NOCASE,
        data TEXT NOT NULL
      )
    `
    yield* sql`
      CREATE TABLE battlefield (
        card_id TEXT PRIMARY KEY REFERENCES cards(id) ON DELETE CASCADE,
        in_play INTEGER NOT NULL DEFAULT 0,
        choice TEXT
      )
    `
  }),
  "0002_seed_cards": seed
})

const MigratorLayer = SqliteMigrator.layer({ loader: migrations })

/** A migrated, seeded SQLite database at the given path. */
export const layerFile = (filename: string) =>
  MigratorLayer.pipe(
    Layer.provideMerge(SqliteClient.layer({ filename }))
  )

/** An in-memory database, for tests. */
export const layerMemory = layerFile(":memory:")

/** The database configured with `DATABASE_PATH` (default `./data/tracker.db`). */
export const layer = Layer.unwrap(
  Effect.gen(function*() {
    const filename = yield* Config.String("DATABASE_PATH").pipe(Config.withDefault("./data/tracker.db"))
    if (filename !== ":memory:") {
      mkdirSync(dirname(filename), { recursive: true })
    }
    yield* Effect.logInfo(`Using SQLite database at ${filename}`)
    return layerFile(filename)
  })
)
