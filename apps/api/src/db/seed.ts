import type { CardInput } from "@triggertracker/domain"

const allyToken = {
  name: "Ally",
  types: ["Creature"],
  subtypes: ["Ally"],
  power: 1,
  toughness: 1
} as const

/** The default card database, loaded on first start and on reset. */
export const seedCards: ReadonlyArray<CardInput> = [
  {
    name: "Sokka, Tenacious Tactician",
    types: ["Legendary", "Creature"],
    subtypes: ["Human", "Warrior", "Ally"],
    power: 3,
    toughness: 3,
    effects: [
      { type: "prowess", targets: "self" },
      { type: "prowess", targets: "allies", excludeSelf: true },
      { type: "tokenOnCast", token: allyToken, trigger: "any" }
    ]
  },
  {
    name: "Narset, Enlightened Exile",
    types: ["Legendary", "Creature"],
    subtypes: ["Human", "Monk"],
    power: 3,
    toughness: 4,
    effects: [
      { type: "prowess", targets: "all" }
    ]
  },
  {
    name: "Veyran, Voice of Duality",
    types: ["Legendary", "Creature"],
    subtypes: ["Efreet", "Wizard"],
    power: 2,
    toughness: 2,
    effects: [
      { type: "triggerDoubler", triggers: "instantSorcery" },
      { type: "magecraft", bonus: 1 }
    ]
  },
  {
    name: "Kykar, Wind's Fury",
    types: ["Legendary", "Creature"],
    subtypes: ["Bird", "Wizard"],
    power: 3,
    toughness: 3,
    effects: [
      {
        type: "tokenOnCast",
        token: { name: "Spirit", types: ["Creature"], subtypes: ["Spirit"], power: 1, toughness: 1, keywords: ["flying"] },
        trigger: "any"
      }
    ]
  },
  {
    name: "Storm-Kiln Artist",
    types: ["Creature"],
    subtypes: ["Dwarf", "Shaman"],
    power: 2,
    toughness: 2,
    effects: [
      {
        type: "tokenOnCast",
        token: { name: "Treasure", types: ["Artifact"], subtypes: ["Treasure"] },
        trigger: "instantSorcery"
      }
    ]
  },
  {
    name: "Mondrak, Glory Dominus",
    types: ["Legendary", "Creature"],
    subtypes: ["Phyrexian", "Horror"],
    power: 4,
    toughness: 4,
    effects: [
      { type: "tokenDoubler" }
    ]
  },
  {
    name: "Anointed Procession",
    types: ["Enchantment"],
    subtypes: [],
    effects: [
      { type: "tokenDoubler" }
    ]
  },
  {
    name: "Intangible Virtue",
    types: ["Enchantment"],
    subtypes: [],
    effects: [
      { type: "anthem", targets: "tokens", power: 1, toughness: 1, keywords: ["vigilance"] }
    ]
  },
  {
    name: "Wartime Protestors",
    types: ["Creature"],
    subtypes: ["Human", "Rebel", "Ally"],
    power: 4,
    toughness: 4,
    effects: [
      { type: "allyEnters", counterAmount: 1, gainsHaste: true }
    ]
  },
  {
    name: "Frostcliff Siege",
    types: ["Enchantment"],
    subtypes: [],
    effects: [],
    choices: [
      { name: "Jeskai", effects: [] },
      {
        name: "Temur",
        effects: [
          { type: "anthem", targets: "all", power: 1, toughness: 0, keywords: ["trample", "haste"] }
        ]
      }
    ]
  }
]
