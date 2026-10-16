# MTG Trigger Tracker

Tracks prowess, magecraft and token triggers for a spellslinger turn. Toggle the cards you have in play and count the spells you cast. The app works out creature stats and how many tokens to make.

## Layout

An npm-workspaces monorepo:

| Path | What |
| --- | --- |
| `packages/domain` | Shared [Effect](https://effect.website) `Schema`s (cards, battlefield, calculation results) and the `HttpApi` contract. Both the server and the client import it, so request and response types are checked end to end. |
| `apps/api` | Effect HTTP server: SQLite persistence (`@effect/sql-sqlite-node`), repositories, and the rules engine. |
| `apps/web` | Vue 3 + Vite frontend. It calls the API through a client generated from the shared contract (`HttpApiClient`). |

The rules engine (`apps/api/src/engine/Engine.ts`) is a pure function. It takes the card list, the battlefield and the spell counts, and returns a `CalculationResult`. The `Calculator` service loads that data from the database and runs the engine.

## Running

```sh
npm install
npm run dev        # API on :3000, Vite on :5173 (proxies /api to the API)
```

Other scripts:

```sh
npm test           # vitest: engine unit tests + API tests against in-memory SQLite
npm run typecheck  # tsc for domain + api, vue-tsc for web
npm run build      # production build of the web app + API typecheck
npm start          # run the API without watch mode
```

The API needs Node 22.13+ because it uses the built-in `node:sqlite`.

### Configuration (API)

| Variable | Default | |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port |
| `DATABASE_PATH` | `./data/tracker.db` | SQLite file. Created, migrated and seeded on first start. |
| `CORS_ORIGINS` | *(none)* | Comma-separated origins, only needed if the web app is served from another origin |

Set `VITE_API_URL` for the web build when the API is not on the same origin. `API_URL` changes the Vite dev proxy target.

While the API is running, interactive API docs are at `/api/docs` and the OpenAPI spec at `/api/openapi.json`.

## API

| Method | Path | |
| --- | --- | --- |
| `GET` | `/api/cards` | List cards |
| `POST` | `/api/cards` | Create a card (409 on a duplicate name) |
| `PUT` | `/api/cards/:id` | Replace a card |
| `DELETE` | `/api/cards/:id` | Delete a card (and its battlefield entry) |
| `GET` | `/api/cards/export` | `{ cards: [...] }` document |
| `POST` | `/api/cards/import` | Replace all cards from a document. Battlefield state is kept for ids that are still present. |
| `POST` | `/api/cards/reset` | Restore the default cards and clear the battlefield |
| `GET` | `/api/battlefield` | Cards in play and chosen modes |
| `PUT` | `/api/battlefield/:cardId` | `{ inPlay?, choice? }` (422 for an unknown mode) |
| `DELETE` | `/api/battlefield` | Clear the battlefield |
| `POST` | `/api/calculate` | `{ instantSorcery, otherNonCreature, combatInstantSorcery }` → results |

## Card model

Cards carry `types`, `subtypes`, `power` / `toughness` and a list of `effects`. Each effect has a `type` field:

- `prowess`: `targets` is `self`, `allies` or `all`. Use `excludeSelf` for "other Allies".
- `tokenOnCast`: creates a `token` (name, types, subtypes, P/T, keywords) on `any` noncreature spell, or on `instantSorcery` only.
- `triggerDoubler`: cast triggers fire an additional time, for `instantSorcery` or `any` spells (Veyran).
- `tokenDoubler`: twice as many tokens are created.
- `anthem`: `+power/+toughness` and `keywords` for `all` creatures, `tokens` or `allies`.
- `magecraft`: this creature gets `+bonus/+bonus` per instant/sorcery.
- `allyEnters`: other Allies enter with `counterAmount` +1/+1 counters, optionally gaining haste (Wartime Protestors).

Modal cards list their modes under `choices`. Each choice has its own effects.

### Known limitation

The app only counts spells and doesn't know the order they were cast in. A token sees prowess only from spells cast after it was created, so its prowess bonus is shown as "up to". That maximum belongs to the earliest batch of tokens.
