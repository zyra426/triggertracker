import { describe, expect, it } from "vitest"
import type { BattlefieldEntry, Card, CardInput, SpellCounts } from "@triggertracker/domain"
import { CardId } from "@triggertracker/domain"
import { seedCards } from "../src/db/seed.ts"
import { calculate } from "../src/engine/Engine.ts"

const toCard = (input: CardInput): Card => ({ ...input, id: CardId.make(input.name) })
const seed = seedCards.map(toCard)

const SOKKA = "Sokka, Tenacious Tactician"
const NARSET = "Narset, Enlightened Exile"
const VEYRAN = "Veyran, Voice of Duality"
const KYKAR = "Kykar, Wind's Fury"
const STORM_KILN = "Storm-Kiln Artist"
const MONDRAK = "Mondrak, Glory Dominus"
const PROCESSION = "Anointed Procession"
const VIRTUE = "Intangible Virtue"
const PROTESTORS = "Wartime Protestors"
const SIEGE = "Frostcliff Siege"

const run = (
  inPlay: ReadonlyArray<string | readonly [name: string, choice: string]>,
  spells: Partial<SpellCounts>,
  cards: ReadonlyArray<Card> = seed
) => {
  const battlefield: Array<BattlefieldEntry> = inPlay.map((entry) => {
    const [name, choice] = typeof entry === "string" ? [entry, null] : entry
    return { cardId: CardId.make(name), inPlay: true, choice }
  })
  return calculate({
    cards,
    battlefield,
    spells: { instantSorcery: 0, otherNonCreature: 0, combatInstantSorcery: 0, ...spells }
  })
}

const creature = (result: ReturnType<typeof run>, name: string) => {
  const found = result.preCombat.creatures.find((c) => c.name === name)
  if (!found) throw new Error(`${name} not in results`)
  return found
}

describe("Engine", () => {
  it("ignores cards that are not in play", () => {
    const result = run([], { instantSorcery: 3 })
    expect(result.preCombat.creatures).toEqual([])
    expect(result.preCombat.tokens).toEqual([])
    expect(result.warnings).toEqual([])
  })

  it("matches the PoC for Sokka + Narset with 2 I/S and 1 other spell", () => {
    const result = run([SOKKA, NARSET], { instantSorcery: 2, otherNonCreature: 1 })

    const sokka = creature(result, SOKKA)
    expect(sokka.prowessInstances).toBe(2)
    expect([sokka.finalPower, sokka.finalToughness]).toEqual([9, 9])

    const narset = creature(result, NARSET)
    expect(narset.prowessInstances).toBe(1)
    expect([narset.finalPower, narset.finalToughness]).toEqual([6, 7])

    expect(result.preCombat.tokens).toHaveLength(1)
    const [allies] = result.preCombat.tokens
    expect(allies!.count).toBe(3)
    expect(allies!.stats?.prowessInstances).toBe(2)
    // The earliest Ally token only sees the two spells cast after it.
    expect(allies!.stats?.maxProwessBonus).toBe(4)
  })

  it("lists creatures without prowess too, from card data", () => {
    const result = run([MONDRAK], { instantSorcery: 1 })
    const mondrak = creature(result, MONDRAK)
    expect([mondrak.finalPower, mondrak.finalToughness]).toEqual([4, 4])
  })

  it("Veyran doubles prowess, magecraft and token triggers from instants and sorceries", () => {
    const result = run([SOKKA, VEYRAN], { instantSorcery: 2, otherNonCreature: 1 })

    // 2 I/S x 2 triggers + 1 other x 1 trigger
    const sokka = creature(result, SOKKA)
    expect(sokka.prowessBonus).toBe(5)
    expect([sokka.finalPower, sokka.finalToughness]).toEqual([8, 8])

    const veyran = creature(result, VEYRAN)
    expect(veyran.prowessInstances).toBe(0)
    expect(veyran.magecraftBonus).toBe(4)
    expect([veyran.finalPower, veyran.finalToughness]).toEqual([6, 6])

    expect(result.preCombat.tokens[0]!.triggers).toBe(5)
    expect(result.preCombat.tokens[0]!.count).toBe(5)
    expect(result.modifiers.triggerDoublers).toEqual([{ source: VEYRAN, triggers: "instantSorcery" }])
  })

  it("a trigger doubler for any spell also doubles other noncreature spells", () => {
    const doubler: Card = toCard({
      name: "Any Doubler",
      types: ["Enchantment"],
      subtypes: [],
      effects: [{ type: "triggerDoubler", triggers: "any" }]
    })
    const result = run([SOKKA, "Any Doubler"], { instantSorcery: 1, otherNonCreature: 2 }, [...seed, doubler])
    expect(creature(result, SOKKA).prowessBonus).toBe(6)
    expect(result.preCombat.tokens[0]!.count).toBe(6)
  })

  it("token doublers stack multiplicatively", () => {
    const result = run([KYKAR, MONDRAK, PROCESSION], { otherNonCreature: 2 })
    const [spirits] = result.preCombat.tokens
    expect(spirits!.multiplier).toBe(4)
    expect(spirits!.count).toBe(8)
    expect(spirits!.stats?.keywords).toEqual(["flying"])
    expect(result.modifiers.tokenDoublers).toEqual([MONDRAK, PROCESSION])
  })

  it("Storm-Kiln Artist only triggers on instants and sorceries and makes non-creature tokens", () => {
    expect(run([STORM_KILN], { otherNonCreature: 3 }).preCombat.tokens).toEqual([])

    const [treasure] = run([STORM_KILN, VEYRAN], { instantSorcery: 2, otherNonCreature: 3 }).preCombat.tokens
    expect(treasure!.count).toBe(4)
    expect(treasure!.stats).toBeNull()
  })

  it("applies the chosen mode of a modal card to creatures", () => {
    const temur = run([NARSET, [SIEGE, "Temur"]], { otherNonCreature: 1 })
    const narset = creature(temur, NARSET)
    expect(narset.anthemPower).toBe(1)
    expect([narset.finalPower, narset.finalToughness]).toEqual([5, 5])
    expect(narset.keywords).toEqual(["trample", "haste"])

    const jeskai = run([NARSET, [SIEGE, "Jeskai"]], { otherNonCreature: 1 })
    expect(creature(jeskai, NARSET).finalPower).toBe(4)
  })

  it("warns when a modal card has no mode selected", () => {
    const result = run([NARSET, SIEGE], {})
    expect(result.warnings).toEqual([`${SIEGE} is in play but no mode is selected`])
    expect(creature(result, NARSET).anthemPower).toBe(0)
  })

  it("applies token anthems and Wartime Protestors to Ally tokens", () => {
    const result = run([SOKKA, VIRTUE, PROTESTORS, [SIEGE, "Temur"]], { otherNonCreature: 1 })
    const stats = result.preCombat.tokens[0]!.stats!
    expect(stats.counters).toBe(1)
    expect(stats.anthemPower).toBe(2)
    expect(stats.anthemToughness).toBe(1)
    expect([stats.power, stats.toughness]).toEqual([4, 3])
    expect(stats.keywords).toEqual(["vigilance", "trample", "haste"])

    // Token anthems do not apply to nontoken creatures; "all" anthems do.
    expect(creature(result, SOKKA).anthemPower).toBe(1)
    // Wartime Protestors is itself an Ally, so Sokka gives it prowess.
    expect(creature(result, PROTESTORS).prowessInstances).toBe(1)
  })

  it("does not count Wartime Protestors counters for non-Ally tokens", () => {
    const result = run([KYKAR, PROTESTORS], { otherNonCreature: 1 })
    expect(result.preCombat.tokens[0]!.stats!.counters).toBe(0)
  })

  it("computes cumulative combat results when spells are cast in combat", () => {
    const result = run([SOKKA], { instantSorcery: 1, combatInstantSorcery: 2 })
    expect(creature(result, SOKKA).finalPower).toBe(4)
    expect(result.combat).not.toBeNull()
    expect(result.combat!.spells.total).toBe(3)
    expect(result.combat!.creatures[0]!.finalPower).toBe(6)
    expect(result.combat!.tokens[0]!.count).toBe(3)
    expect(run([SOKKA], { instantSorcery: 1 }).combat).toBeNull()
  })

  it("warns about creatures without power and toughness", () => {
    const blank = toCard({ name: "Blank", types: ["Creature"], subtypes: [], effects: [] })
    const result = run(["Blank"], {}, [blank])
    expect(result.warnings).toEqual(["Blank has no power/toughness set; treating it as 0/0"])
  })
})
