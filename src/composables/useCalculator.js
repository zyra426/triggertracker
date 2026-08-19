import { computed } from 'vue'

export function useCalculator(cards, inPlay, choiceSelections, instantSorceryCount, otherNonCreatureCount, combatSpellCount) {

  function getActiveEffects(cardName) {
    const card = cards.value.find(c => c.name === cardName)
    if (!card) return []
    if (card.choices) {
      const selected = choiceSelections[cardName]
      if (!selected) return []
      const choice = card.choices.find(c => c.name === selected)
      return choice ? choice.effects : []
    }
    return card.effects || []
  }

  function getCardsWithEffect(effectType) {
    return cards.value
      .filter(c => inPlay[c.name])
      .filter(c => {
        const effects = getActiveEffects(c.name)
        return effects.some(e => e.type === effectType)
      })
  }

  const totalSpells = computed(() => {
    return instantSorceryCount.value + otherNonCreatureCount.value
  })

  const hasTriggerDoubler = computed(() => {
    return getCardsWithEffect('triggerDoubler').some(c => {
      const effects = getActiveEffects(c.name)
      return effects.some(e => e.type === 'triggerDoubler' && e.triggers === 'instantSorcery')
    })
  })

  const tokenDoublerCount = computed(() => {
    return getCardsWithEffect('tokenDoubler').length
  })

  const tokenMultiplier = computed(() => {
    return Math.pow(2, tokenDoublerCount.value)
  })

  function isAlly(creatureName) {
    return creatureName.toLowerCase().includes('ally') ||
           creatureName === 'Sokka, Tenacious Tactician' ||
           creatureName === 'Wartime Protestors'
  }

  function getProwessInstances(creatureName) {
    let instances = 0

    for (const card of cards.value) {
      if (!inPlay[card.name]) continue
      const effects = getActiveEffects(card.name)

      for (const effect of effects) {
        if (effect.type !== 'prowess') continue

        if (effect.targets === 'self' && card.name === creatureName) {
          instances++
        } else if (effect.targets === 'allies' && isAlly(creatureName)) {
          if (!(effect.excludeSelf && card.name === creatureName)) {
            instances++
          }
        } else if (effect.targets === 'all') {
          instances++
        }
      }
    }
    return instances
  }

  function getMagecraftBonus(creatureName, isInstantSorcery) {
    let bonus = 0
    if (!isInstantSorcery) return bonus

    for (const card of cards.value) {
      if (!inPlay[card.name]) continue
      const effects = getActiveEffects(card.name)

      for (const effect of effects) {
        if (effect.type !== 'magecraft') continue

        if (card.name === creatureName) {
          const baseBonus = effect.bonus || 1
          const doubled = hasTriggerDoubler.value ? 2 : 1
          bonus += baseBonus * doubled
        }
      }
    }
    return bonus
  }

  function calculateProwess(instantCount, otherCount) {
    const results = []
    const activeCreatures = ['Sokka, Tenacious Tactician', 'Narset, Enlightened Exile', 'Veyran, Voice of Duality']

    for (const creature of activeCreatures) {
      if (!inPlay[creature]) continue
      const instances = getProwessInstances(creature)
      if (instances === 0) continue

      const instantSorceryTriggers = instantCount * instances * (hasTriggerDoubler.value ? 2 : 1)
      const otherTriggers = otherCount * instances
      const totalTriggers = instantSorceryTriggers + otherTriggers

      const magecraftBonus = getMagecraftBonus(creature, true) * instantCount

      let basePower, baseToughness
      if (creature === 'Sokka, Tenacious Tactician') { basePower = 3; baseToughness = 3 }
      else if (creature === 'Narset, Enlightened Exile') { basePower = 3; baseToughness = 4 }
      else if (creature === 'Veyran, Voice of Duality') { basePower = 2; baseToughness = 2 }

      results.push({
        creature,
        instances,
        instantSorceryTriggers,
        otherTriggers,
        totalTriggers,
        magecraftBonus,
        basePower,
        baseToughness,
        finalPower: basePower + totalTriggers + magecraftBonus,
        finalToughness: baseToughness + totalTriggers + magecraftBonus
      })
    }
    return results
  }

  const prowessResults = computed(() => {
    return calculateProwess(instantSorceryCount.value, otherNonCreatureCount.value)
  })

  const combatProwessResults = computed(() => {
    const totalInstant = instantSorceryCount.value + combatSpellCount.value
    return calculateProwess(totalInstant, otherNonCreatureCount.value)
  })

  const tokenResults = computed(() => {
    const results = []
    const doublers = tokenMultiplier.value

    for (const card of cards.value) {
      if (!inPlay[card.name]) continue
      const effects = getActiveEffects(card.name)

      for (const effect of effects) {
        if (effect.type !== 'tokenOnCast') continue

        let count = 0
        if (effect.trigger === 'any') {
          count = totalSpells.value
        } else if (effect.trigger === 'instantSorcery') {
          count = instantSorceryCount.value
        }

        if (count > 0) {
          results.push({
            source: card.name,
            tokenType: effect.token,
            baseCount: count,
            multiplier: doublers,
            finalCount: count * doublers
          })
        }
      }
    }
    return results
  })

  const allyProwessBonus = computed(() => {
    if (!inPlay['Sokka, Tenacious Tactician']) return 0
    const instances = getProwessInstances('Ally Token')
    if (instances === 0) return 0

    const instantSorceryTriggers = instantSorceryCount.value * instances * (hasTriggerDoubler.value ? 2 : 1)
    const otherTriggers = otherNonCreatureCount.value * instances
    return instantSorceryTriggers + otherTriggers
  })

  const anthemBonus = computed(() => {
    let powerBonus = 0
    let toughnessBonus = 0

    for (const card of cards.value) {
      if (!inPlay[card.name]) continue
      const effects = getActiveEffects(card.name)

      for (const effect of effects) {
        if (effect.type === 'anthem') {
          powerBonus += effect.power || 0
          toughnessBonus += effect.toughness || 0
        }
      }
    }
    return { power: powerBonus, toughness: toughnessBonus }
  })

  const allyTokenFinalStats = computed(() => {
    const prowess = allyProwessBonus.value
    const anthem = anthemBonus.value
    return {
      power: 1 + prowess + anthem.power,
      toughness: 1 + prowess + anthem.toughness
    }
  })

  return {
    totalSpells,
    hasTriggerDoubler,
    tokenDoublerCount,
    tokenMultiplier,
    prowessResults,
    combatProwessResults,
    tokenResults,
    allyProwessBonus,
    anthemBonus,
    allyTokenFinalStats,
    getProwessInstances
  }
}
