import { Context, Effect, Layer, ManagedRuntime, Predicate } from "effect"
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/http"
import { HttpApiClient } from "effect/http-api"
import { Api } from "@triggertracker/domain"

const baseUrl: string = import.meta.env.VITE_API_URL || window.location.origin

export class ApiClient extends Context.Service<ApiClient, HttpApiClient.ForApi<typeof Api>>()(
  "triggertracker/web/ApiClient"
) {
  static readonly layer = Layer.effect(
    ApiClient,
    HttpApiClient.make(Api, {
      transformClient: HttpClient.mapRequest(HttpClientRequest.prependUrl(baseUrl))
    })
  ).pipe(Layer.provide(FetchHttpClient.layer))
}

const runtime = ManagedRuntime.make(ApiClient.layer)

/** A failed API call, with a message suitable for showing to the user. */
export class ApiError extends Error {
  constructor(message: string, readonly tag: string | undefined) {
    super(message)
    this.name = "ApiError"
  }
}

const describe = (error: unknown): ApiError => {
  const tag = Predicate.hasProperty(error, "_tag") && Predicate.isString(error._tag) ? error._tag : undefined
  switch (tag) {
    case "DuplicateCardName":
    case "CardNotFound":
    case "InvalidChoice":
      return new ApiError((error as Error).message, tag)
    case "HttpApiSchemaError":
    case "SchemaError":
    case "BadRequest":
      return new ApiError("The server rejected the data as invalid", tag)
    default:
      return new ApiError("Could not reach the server", tag)
  }
}

/** Run a request against the API, rejecting with an `ApiError` on failure. */
export const callApi = <A, E>(
  request: (client: ApiClient["Service"]) => Effect.Effect<A, E>
): Promise<A> =>
  runtime.runPromise(
    ApiClient.use(request).pipe(Effect.mapError(describe))
  )

export const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)
