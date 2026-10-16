import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Config, Effect, Layer } from "effect"
import { HttpRouter } from "effect/http"
import { HttpApiBuilder, HttpApiScalar } from "effect/http-api"
import { Api } from "@triggertracker/domain"
import { createServer } from "node:http"
import * as Database from "./db/Database.ts"
import { ApiHandlers, ServicesLayer } from "./http/handlers.ts"

const ApiRoutes = HttpApiBuilder.layer(Api, { openapiPath: "/api/openapi.json" }).pipe(
  Layer.provide(ApiHandlers),
  Layer.provide(ServicesLayer),
  Layer.provide(Database.layer)
)

const DocsRoute = HttpApiScalar.layer(Api, { path: "/api/docs" })

const ServerLayer = Layer.unwrap(Effect.gen(function*() {
  const port = yield* Config.Port("PORT").pipe(Config.withDefault(3000))
  const corsOrigins = yield* Config.String("CORS_ORIGINS").pipe(Config.withDefault(""))
  const allowedOrigins = corsOrigins.split(",").map((origin) => origin.trim()).filter((origin) => origin.length > 0)
  const Cors = allowedOrigins.length > 0 ? HttpRouter.cors({ allowedOrigins }) : Layer.empty
  return HttpRouter.serve(Layer.mergeAll(ApiRoutes, DocsRoute, Cors)).pipe(
    Layer.provide(NodeHttpServer.layer(createServer, { port }))
  )
}))

Layer.launch(ServerLayer).pipe(NodeRuntime.runMain)
