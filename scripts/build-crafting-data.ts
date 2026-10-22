import { readFileSync, writeFileSync } from 'node:fs'

// Derive a shared, lazy-loaded crafting database from the pinned snapshot.
const read = (name: string) => JSON.parse(readFileSync(new URL(`../src/config/${name}.json`, import.meta.url), 'utf8'))
const rawBases = read('poe2/base_items')
const rawMods = read('poe2/mods')
const source = read('item-affix-pools')
const essences = read('poe2/essences').essences
const packMod = (modId: string) => {
  const mod = rawMods[modId]
  if (!mod || !['prefix', 'suffix', 'corrupted'].includes(mod.generation_type)) return
  mods[modId] = { id: modId, name: mod.name, kind: mod.generation_type === 'corrupted' ? 'prefix' : mod.generation_type, level: mod.required_level, groups: mod.groups,
    type: mod.type, stats: mod.stats, text: mod.text ?? '', addsTags: mod.adds_tags, weights: mod.spawn_weights, generationWeights: mod.generation_weights }
}
const bases = []
const modPools: string[][] = []
const mods: Record<string, unknown> = {}
const specialPools: object[] = []
const specialPoolIndices = new Map<string, number>()
for (const pool of source.pools) {
  const ids = [...new Set([...Object.values(pool.prefixes), ...Object.values(pool.suffixes)].flatMap(series => Object.keys(series as object)))]
  if (!ids.length || pool.conditionalMods) continue
  const poolIndex = modPools.length
  modPools.push(ids)
  const desecrated = [...new Set([...Object.values(pool.desecratedPrefixes ?? {}), ...Object.values(pool.desecratedSuffixes ?? {})].flatMap(series => Object.keys(series as object)))]
  for (const id of pool.bases) {
    const base = rawBases[id]
    // Jewels, flasks and special domains have different affix limits/rules.
    if (base.domain !== 'item' || base.release_state !== 'released' || /Jewel|Flask|Charm|Map|Waystone|Relic|Tablet/.test(base.item_class)) continue
    const essenceMods = Object.fromEntries(essences.flatMap((essence: { id: string; mods: Record<string, string> }) => {
      const modId = essence.mods[base.item_class]
      if (!modId) return []
      // Display-only essence entries encode several possible real mods. Resolve by exact stat ranges.
      const display = rawMods[modId]
      const resolved = modId.startsWith('EssenceDisplay') ? ids.filter(id => {
        const mod = rawMods[id]
        const attributes = /Attributes/.test(modId)
        return mod.stats.length === 1 && (attributes ? ['additional_strength', 'additional_dexterity', 'additional_intelligence', 'strength_+%', 'dexterity_+%', 'intelligence_+%'].includes(mod.stats[0].id) : /local_(?:physical_damage_reduction_rating|evasion_rating|energy_shield|armour_and_evasion|armour_and_energy_shield|evasion_and_energy_shield)_\+%/.test(mod.stats[0].id))
          && mod.stats[0].min === display.stats[0].min && mod.stats[0].max === display.stats[0].max
      }) : [modId].filter(id => ['prefix', 'suffix'].includes(rawMods[id]?.generation_type) && id !== 'EssenceGrantedPassive')
      resolved.forEach(packMod)
      return resolved.length ? [[essence.id, resolved]] : []
    }))
    const corrupted = Object.keys(rawMods).filter(id => rawMods[id].domain === 'item' && rawMods[id].generation_type === 'corrupted' && (rawMods[id].spawn_weights.find((entry: { tag: string; weight: number }) => base.tags.includes(entry.tag))?.weight ?? 0) > 0)
    ;[...desecrated, ...corrupted].forEach(packMod)
    const special = { desecratedModIds: desecrated, essenceMods, corruptedModIds: corrupted }
    const key = JSON.stringify(special)
    let specialPool = specialPoolIndices.get(key)
    if (specialPool === undefined) { specialPool = specialPools.length; specialPools.push(special); specialPoolIndices.set(key, specialPool) }
    bases.push({ id, name: base.name, itemClass: pool.itemClass, tags: base.tags, pool: poolIndex, specialPool })
    for (const modId of ids) {
      const mod = rawMods[modId]
      mods[modId] = { id: modId, name: mod.name, kind: mod.generation_type, level: mod.required_level, groups: mod.groups,
        type: mod.type, stats: mod.stats, text: mod.text, addsTags: mod.adds_tags, weights: mod.spawn_weights, generationWeights: mod.generation_weights }
    }
  }
}
writeFileSync(new URL('../src/config/crafting-data.json', import.meta.url), JSON.stringify({ gameVersion: source.gameVersion, source: source.source, bases, mods, modPools, specialPools, essences: essences.map(({ mods: _mods, ...essence }: { mods: unknown }) => essence) }))
console.log(`Crafting data: ${bases.length} bases, ${Object.keys(mods).length} mods`)
