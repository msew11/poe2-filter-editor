export interface AffixMod {
  domain: string
  generation_type: string
  type: string
  required_level: number
  is_essence_only: boolean
  stats: { id: string; min: number; max: number }[]
  spawn_weights: { tag: string; weight: number }[]
  generation_weights: { tag: string; weight: number }[]
}

export type AffixTable = Record<string, AffixMod>
export type AffixList = Record<string, Record<string, number>>

// Spawn weights are ordered: the first matching tag wins, including zero weights.
export function tagWeight(weights: AffixMod['spawn_weights'], tags: string[]) {
  return weights.find(entry => tags.includes(entry.tag))?.weight ?? 0
}

export function desecratedMods(mods: AffixTable, tags: string[]) {
  return Object.entries(mods).filter(([, mod]) => mod.domain === 'desecrated'
    && ['prefix', 'suffix'].includes(mod.generation_type)
    && !mod.is_essence_only && tagWeight(mod.spawn_weights, tags) > 0
    && (!mod.generation_weights.length || tagWeight(mod.generation_weights, tags) > 0))
    .map(([id]) => id)
}

export function affixTiers(ids: string[], mods: AffixTable): AffixList {
  const series: AffixList = {}
  for (const id of ids) {
    const mod = mods[id]
    // A conflict group alone is insufficient: different effects can share a group.
    const key = `${mod.type}:${mod.stats.map(stat => stat.id).sort().join(',')}`
    ;(series[key] ??= {})[id] = mod.required_level
  }
  return series
}

export function allT1Level(series: AffixList): number | null {
  return allTierLevel(series, 1)
}

// A series with fewer ranks already meets a Tn-or-better target at its lowest rank.
export function allTierLevel(series: AffixList, tier: number): number | null {
  if (!Number.isInteger(tier) || tier < 1) throw new RangeError('Tier must be a positive integer')
  return maxLevel(Object.values(series).map(tiers => {
    const levels = Object.values(tiers).sort((a, b) => b - a)
    return levels[Math.min(tier, levels.length) - 1] ?? null
  }))
}

export function maxLevel(levels: (number | null)[]): number | null {
  const present = levels.filter(level => level !== null)
  return present.length ? Math.max(...present) : null
}
