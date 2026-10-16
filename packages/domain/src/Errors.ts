import { Schema } from "effect"
import { CardId } from "./Card.ts"

export class CardNotFound extends Schema.TaggedError<CardNotFound>()(
  "CardNotFound",
  { id: CardId },
  { httpApiStatus: 404 }
) {
  override get message() {
    return `Card ${this.id} not found`
  }
}

export class DuplicateCardName extends Schema.TaggedError<DuplicateCardName>()(
  "DuplicateCardName",
  { name: Schema.String },
  { httpApiStatus: 409 }
) {
  override get message() {
    return `A card named "${this.name}" already exists`
  }
}

export class InvalidChoice extends Schema.TaggedError<InvalidChoice>()(
  "InvalidChoice",
  { cardId: CardId, choice: Schema.String },
  { httpApiStatus: 422 }
) {
  override get message() {
    return `"${this.choice}" is not a mode of this card`
  }
}
