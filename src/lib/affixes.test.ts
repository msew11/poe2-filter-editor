import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { affixTiers, allTierLevel, allT1Level, desecratedMods, tagWeight, type AffixTable } from './affixes'

function config(name: string) {
  return JSON.parse(readFileSync(new URL(`../config/${name}.json`, import.meta.url), 'utf8'))
}
const mods: AffixTable = config('poe2/mods')
const pools = config('item-affix-pools').pools as {
  itemClass: string; tags: string[]; bases: string[]
  prefixes: Record<string, Record<string, number>>
  suffixes: Record<string, Record<string, number>>
  desecratedPrefixes: Record<string, Record<string, number>>
  desecratedSuffixes: Record<string, Record<string, number>>
  ordinaryT1Level: number | null; desecratedT1Level: number | null; allT1Level: number | null
}[]

test('ring tiers use the applicable base pool rather than the highest global Strength tier', () => {
  const ring = pools.find(pool => pool.itemClass === 'Rings' && pool.tags.join(',') === 'ring,default')!
  const strength = Object.entries(ring.suffixes).find(([key]) => key.startsWith('Strength:'))![1]
  assert.equal(mods.Strength9.required_level, 81)
  assert.equal(strength.Strength9, undefined)
  assert.equal(allT1Level({ strength }), 74)
  assert.equal(ring.ordinaryT1Level, 82)
  assert.equal(ring.desecratedT1Level, 65)
})

test('an earlier zero spawn weight excludes a mod even when a later default weight is positive', () => {
  assert.equal(tagWeight([{ tag: 'wand', weight: 0 }, { tag: 'default', weight: 100 }], ['wand', 'default']), 0)
  assert.equal(tagWeight([{ tag: 'wand', weight: 0 }, { tag: 'default', weight: 100 }], ['ring', 'default']), 100)
})

test('selected tiers rank each applicable series independently and retain short series', () => {
  const ring = pools.find(pool => pool.itemClass === 'Rings' && pool.tags.join(',') === 'ring,default')!
  const strength = Object.entries(ring.suffixes).find(([key]) => key.startsWith('Strength:'))![1]
  assert.equal(allTierLevel({ strength }, 2), 66)
  assert.equal(allTierLevel({ strength }, 3), 55)
  assert.equal(allTierLevel({ strength }, 13), 1)
  assert.equal(allTierLevel({ strength, singleRank: { only: 65 } }, 3), 65)
  assert.equal(allTierLevel({}, 2), null)
  assert.throws(() => allTierLevel({ strength }, 0), RangeError)
  assert.throws(() => allTierLevel({ strength }, 1.5), RangeError)
})

test('class tier summaries agree with T1 and thresholds never rise for lower target ranks', () => {
  const summary = config('item-affix-levels')
  assert.equal(summary.maxTier, 13)
  for (const levels of Object.values(summary.classes) as {
    allT1Level: number | null; ordinaryT1Level: number | null; desecratedT1Level: number | null
    byTier: { allLevel: number; ordinaryLevel: number | null; desecratedLevel: number | null }[]
  }[]) {
    if (levels.allT1Level === null) {
      assert.deepEqual(levels.byTier, [])
      continue
    }
    assert.equal(levels.byTier.length, summary.maxTier)
    assert.equal(levels.byTier[0].allLevel, levels.allT1Level)
    assert.equal(levels.byTier[0].ordinaryLevel, levels.ordinaryT1Level)
    assert.equal(levels.byTier[0].desecratedLevel, levels.desecratedT1Level)
    for (let index = 1; index < levels.byTier.length; index++) {
      assert.ok(levels.byTier[index].allLevel <= levels.byTier[index - 1].allLevel)
    }
  }
  assert.equal(summary.classes.Rings.byTier[1].allLevel, 71)
  assert.equal(summary.classes.Rings.byTier[2].allLevel, 65)
})

test('desecrated ring mods exclude ordinary, unique, and inapplicable mods', () => {
  const ids = desecratedMods(mods, ['ring', 'default'])
  assert.ok(ids.length > 0)
  assert.ok(ids.every(id => mods[id].domain === 'desecrated' && ['prefix', 'suffix'].includes(mods[id].generation_type)))
  assert.equal(ids.includes('MapAbyssalOverrun'), false)
  assert.equal(ids.includes('Strength8'), false)
  assert.equal(allT1Level(affixTiers(ids, mods)), 65)
  assert.equal(allT1Level({}), null)
})

test('derived affix lists preserve source IDs and levels, with separate domains and sides', () => {
  const bases = config('poe2/base_items')
  for (const pool of pools) {
    assert.ok(pool.bases.every(id => bases[id]), pool.itemClass)
    for (const [field, kind, special] of [
      ['prefixes', 'prefix', false], ['suffixes', 'suffix', false],
      ['desecratedPrefixes', 'prefix', true], ['desecratedSuffixes', 'suffix', true],
    ] as const) {
      for (const tiers of Object.values(pool[field])) {
        for (const [id, level] of Object.entries(tiers)) {
          assert.equal(mods[id].required_level, level, id)
          assert.equal(mods[id].generation_type, kind, id)
          assert.equal(mods[id].domain === 'desecrated', special, id)
          assert.equal(mods[id].is_essence_only, false, id)
        }
      }
    }
  }
})

test('all class options have metadata; classes without affixes have no numeric threshold', () => {
  const summary = config('item-affix-levels')
  const classes = config('item-classes')
  assert.equal(summary.source.commit, classes.source.commit)
  assert.equal(summary.gameVersion, classes.gameVersion)
  for (const item of classes.classes) assert.ok(summary.classes[item.value])
  assert.equal(summary.classes.Currency.allT1Level, null)
  assert.equal(summary.classes.Rings.allT1Level, 82)
  assert.equal(summary.classes.Waystones.allT1Level, 78)
  assert.equal(summary.classes.Waystones.ordinaryT1Level, 1)
})
