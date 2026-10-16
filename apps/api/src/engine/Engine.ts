/**
 * The rules engine. A pure function from the card database, the battlefield
 * and the spells cast this turn to the resulting creature stats and tokens.
 * It has no Effect dependencies so it is trivial to test; the `Calculator`
 * service wraps it.
 */
import type {
  BattlefieldEntry,
  CalculationResult,
  Card,
  CardEffect,
  CardEffectType,
  CardId,
  CreatureResult,
  Modifiers,
  PhaseResult,
  SpellCounts,
  SpellTrigger,
  TokenResult,
  TokenSpec,
  TokenStats
} from "@triggertracker/domain"
import { isAlly, isCreature } from "@triggertracker/domain"

export interface EngineInput {
  readonly cards: ReadonlyArray<Card>
  readonly battlefield: ReadonlyArray<BattlefieldEntry>
  readonly spells: SpellCounts
}

type EffectOf<T extends CardEffectType> = Extract<CardEffect, { readonly type: T }>

interface SourcedEffect<T extends CardEffectType> {
  readonly source: Card
  readonly effect: EffectOf<T>
}

/** A creature (card or token) that static and triggered abilities may apply to. */
interface Target {
  /** The card id, or undefined for tokens. */
  readonly id: CardId | undefined
  readonly isAlly: boolean
  readonly isToken: boolean
}

interface Spells {
  readonly instantSorcery: number
  readonly other: number
}

const uniq = (values: ReadonlyArray<string>): Array<string> => Array.from(new Set(values))

export const calculate = (input: EngineInput): CalculationResult => {
  const warnings: Array<string> = []
  const entries = new Map(input.battlefield.map((entry) => [entry.cardId, entry]))

  // Resolve every in-play card to its active effects, including the effects of
  // the chosen mode for modal cards.
  const active: Array<{ readonly card: Card; readonly effects: ReadonlyArray<CardEffect> }> = []
  for (const card of input.cards) {
    const entry = entries.get(card.id)
    if (!entry?.inPlay) continue
    const effects: Array<CardEffect> = [...card.effects]
    if (card.choices && card.choices.length > 0) {
      const choice = entry.choice === null ? undefined : card.choices.find((c) => c.name === entry.choice)
      if (choice) {
        effects.push(...choice.effects)
      } else {
        warnings.push(`${card.name} is in play but no mode is selected`)
      }
    }
    active.push({ card, effects })
  }

  const effectsOf = <T extends CardEffectType>(type: T): Array<SourcedEffect<T>> =>
    active.flatMap(({ card, effects }) =>
      effects
        .filter((effect): effect is EffectOf<T> => effect.type === type)
        .map((effect) => ({ source: card, effect }))
    )

  const prowess = effectsOf("prowess")
  const tokenOnCast = effectsOf("tokenOnCast")
  const triggerDoublers = effectsOf("triggerDoubler")
  const tokenDoublers = effectsOf("tokenDoubler")
  const anthems = effectsOf("anthem")
  const magecraft = effectsOf("magecraft")
  const allyEnters = effectsOf("allyEnters")

  // Each trigger doubler makes abilities triggered by casting a matching spell
  // trigger one additional time.
  const instantSorceryMultiplier = 1 + triggerDoublers.length
  const otherMultiplier = 1 + triggerDoublers.filter(({ effect }) => effect.triggers === "any").length
  const tokenMultiplier = 2 ** tokenDoublers.length

  /** How many times an ability that triggers on `trigger` spells triggers. */
  const castTriggers = (trigger: SpellTrigger, spells: Spells): number =>
    trigger === "instantSorcery"
      ? spells.instantSorcery * instantSorceryMultiplier
      : spells.instantSorcery * instantSorceryMultiplier + spells.other * otherMultiplier

  /**
   * Prowess triggers seen by the earliest token created by a `trigger` ability:
   * it only sees spells cast after the spell that created it. To get the
   * maximum, assume that spell was the one contributing the fewest triggers.
   */
  const laterSpellTriggers = (trigger: SpellTrigger, spells: Spells): number => {
    const all = castTriggers("any", spells)
    if (trigger === "any" && spells.other > 0) return all - otherMultiplier
    if (spells.instantSorcery > 0) return all - instantSorceryMultiplier
    return 0
  }

  const prowessInstances = (target: Target): number =>
    prowess.filter(({ source, effect }) => {
      switch (effect.targets) {
        case "self":
          return source.id === target.id
        case "allies":
          return target.isAlly && !(effect.excludeSelf && source.id === target.id)
        case "all":
          return true
      }
    }).length

  const applicableAnthems = (target: Target) =>
    anthems.filter(({ effect }) => {
      switch (effect.targets) {
        case "all":
          return true
        case "tokens":
          return target.isToken
        case "allies":
          return target.isAlly
      }
    })

  const anthemBonus = (target: Target) => {
    const applicable = applicableAnthems(target)
    return {
      power: applicable.reduce((sum, { effect }) => sum + effect.power, 0),
      toughness: applicable.reduce((sum, { effect }) => sum + effect.toughness, 0),
      keywords: applicable.flatMap(({ effect }) => effect.keywords ?? [])
    }
  }

  const creatureCards = active.filter(({ card }) => isCreature(card)).map(({ card }) => card)
  for (const card of creatureCards) {
    if (card.power === undefined || card.toughness === undefined) {
      warnings.push(`${card.name} has no power/toughness set; treating it as 0/0`)
    }
  }

  const creatureResult = (card: Card, spells: Spells): CreatureResult => {
    const target: Target = { id: card.id, isAlly: isAlly(card), isToken: false }
    const instances = prowessInstances(target)
    const prowessBonus = instances * castTriggers("any", spells)
    const magecraftBonus = magecraft
      .filter(({ source }) => source.id === card.id)
      .reduce((sum, { effect }) => sum + effect.bonus * castTriggers("instantSorcery", spells), 0)
    const anthem = anthemBonus(target)
    const basePower = card.power ?? 0
    const baseToughness = card.toughness ?? 0
    return {
      cardId: card.id,
      name: card.name,
      basePower,
      baseToughness,
      prowessInstances: instances,
      prowessBonus,
      magecraftBonus,
      anthemPower: anthem.power,
      anthemToughness: anthem.toughness,
      finalPower: basePower + prowessBonus + magecraftBonus + anthem.power,
      finalToughness: baseToughness + prowessBonus + magecraftBonus + anthem.toughness,
      keywords: uniq(anthem.keywords)
    }
  }

  const tokenStats = (token: TokenSpec, trigger: SpellTrigger, spells: Spells): TokenStats | null => {
    if (!isCreature(token)) return null
    const target: Target = { id: undefined, isAlly: isAlly(token), isToken: true }
    const anthem = anthemBonus(target)
    const enters = target.isAlly ? allyEnters : []
    const counters = enters.reduce((sum, { effect }) => sum + effect.counterAmount, 0)
    const instances = prowessInstances(target)
    const basePower = token.power ?? 0
    const baseToughness = token.toughness ?? 0
    return {
      basePower,
      baseToughness,
      anthemPower: anthem.power,
      anthemToughness: anthem.toughness,
      counters,
      power: basePower + anthem.power + counters,
      toughness: baseToughness + anthem.toughness + counters,
      keywords: uniq([
        ...(token.keywords ?? []),
        ...anthem.keywords,
        ...(enters.some(({ effect }) => effect.gainsHaste) ? ["haste"] : [])
      ]),
      prowessInstances: instances,
      maxProwessBonus: instances * laterSpellTriggers(trigger, spells)
    }
  }

  const tokenResults = (spells: Spells): Array<TokenResult> =>
    tokenOnCast.flatMap(({ source, effect }) => {
      const triggers = castTriggers(effect.trigger, spells)
      if (triggers === 0) return []
      return [{
        sourceId: source.id,
        source: source.name,
        token: effect.token,
        trigger: effect.trigger,
        triggers,
        multiplier: tokenMultiplier,
        count: triggers * tokenMultiplier,
        stats: tokenStats(effect.token, effect.trigger, spells)
      }]
    })

  const phase = (spells: Spells): PhaseResult => ({
    spells: {
      instantSorcery: spells.instantSorcery,
      otherNonCreature: spells.other,
      total: spells.instantSorcery + spells.other
    },
    creatures: creatureCards.map((card) => creatureResult(card, spells)),
    tokens: tokenResults(spells)
  })

  const modifiers: Modifiers = {
    tokenMultiplier,
    tokenDoublers: tokenDoublers.map(({ source }) => source.name),
    triggerDoublers: triggerDoublers.map(({ source, effect }) => ({ source: source.name, triggers: effect.triggers })),
    anthems: anthems.map(({ source, effect }) => ({
      source: source.name,
      targets: effect.targets,
      power: effect.power,
      toughness: effect.toughness,
      keywords: effect.keywords ?? []
    }))
  }

  const { instantSorcery, otherNonCreature, combatInstantSorcery } = input.spells
  return {
    preCombat: phase({ instantSorcery, other: otherNonCreature }),
    combat: combatInstantSorcery > 0
      ? phase({ instantSorcery: instantSorcery + combatInstantSorcery, other: otherNonCreature })
      : null,
    modifiers,
    warnings
  }
}
