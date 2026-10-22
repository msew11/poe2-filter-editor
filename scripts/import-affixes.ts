import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { affixTiers, allTierLevel, allT1Level, desecratedMods, maxLevel, type AffixTable } from '../src/lib/affixes'

const root = fileURLToPath(new URL('../', import.meta.url))
const configDir = resolve(root, 'src/config')
const itemClasses = JSON.parse(await readFile(resolve(configDir, 'item-classes.json'), 'utf8'))
const commit: string = itemClasses.source.commit
const sourceRoot = `https://raw.githubusercontent.com/repoe-fork/poe2/${commit}/data/`
const rawDir = resolve(configDir, 'poe2')
await mkdir(rawDir, { recursive: true })

// --offline regenerates derived data from the checked-in, pinned source tables.
async function table(name: string): Promise<unknown> {
  const path = resolve(rawDir, `${name}.json`)
  if (process.argv.includes('--offline')) return JSON.parse(await readFile(path, 'utf8'))
  const response = await fetch(`${sourceRoot}${name}.json`)
  if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`)
  const text = await response.text()
  const data: unknown = JSON.parse(text)
  await writeFile(path, text)
  return data
}

interface BaseItem { item_class: string; domain: string; tags: string[] }
interface SourcePool {
  bases: string[]
  mods: Record<string, Record<string, Record<string, number>>>
  conditional_mods: unknown
}
const [mods, bases, sourcePools] = await Promise.all([
  table('mods') as Promise<AffixTable>,
  table('base_items') as Promise<Record<string, BaseItem>>,
  table('mods_by_base') as Promise<Record<string, Record<string, SourcePool>>>,
])

const pools = Object.entries(sourcePools).flatMap(([itemClass, classPools]) =>
  Object.entries(classPools).map(([tagString, pool]) => {
    const tags = tagString.split(',')
    const domain = bases[pool.bases[0]]?.domain
    const ordinary = (kind: string) => Object.values(pool.mods[kind] ?? {}).flatMap(group => Object.keys(group))
      .filter(id => mods[id] && mods[id].domain === domain && !mods[id].is_essence_only)
    const desecrated = desecratedMods(mods, tags)
    const prefixes = affixTiers(ordinary('prefix'), mods)
    const suffixes = affixTiers(ordinary('suffix'), mods)
    const desecratedPrefixes = affixTiers(desecrated.filter(id => mods[id].generation_type === 'prefix'), mods)
    const desecratedSuffixes = affixTiers(desecrated.filter(id => mods[id].generation_type === 'suffix'), mods)
    const ordinaryT1Level = maxLevel([allT1Level(prefixes), allT1Level(suffixes)])
    const desecratedT1Level = maxLevel([allT1Level(desecratedPrefixes), allT1Level(desecratedSuffixes)])
    return {
      itemClass, tags, bases: pool.bases, prefixes, suffixes, desecratedPrefixes, desecratedSuffixes,
      conditionalMods: pool.conditional_mods,
      ordinaryT1Level, desecratedT1Level,
      allT1Level: maxLevel([ordinaryT1Level, desecratedT1Level]),
    }
  }))

const affixFields = ['prefixes', 'suffixes', 'desecratedPrefixes', 'desecratedSuffixes'] as const
const maxTier = Math.max(1, ...pools.flatMap(pool => affixFields.flatMap(field => Object.values(pool[field]).map(series => Object.keys(series).length))))
const classes = Object.fromEntries([...new Set(itemClasses.classes.map((item: { value: string }) => item.value) as string[])].map(value => {
  const applicable = pools.filter(pool => pool.itemClass === value)
  const byTier = Array.from({ length: applicable.some(pool => pool.allT1Level !== null) ? maxTier : 0 }, (_, index) => {
    const ordinaryLevel = maxLevel(applicable.flatMap(pool => [allTierLevel(pool.prefixes, index + 1), allTierLevel(pool.suffixes, index + 1)]))
    const desecratedLevel = maxLevel(applicable.flatMap(pool => [allTierLevel(pool.desecratedPrefixes, index + 1), allTierLevel(pool.desecratedSuffixes, index + 1)]))
    return { ordinaryLevel, desecratedLevel, allLevel: maxLevel([ordinaryLevel, desecratedLevel]) }
  })
  return [value, {
    ordinaryT1Level: maxLevel(applicable.map(pool => pool.ordinaryT1Level)),
    desecratedT1Level: maxLevel(applicable.map(pool => pool.desecratedT1Level)),
    allT1Level: maxLevel(applicable.map(pool => pool.allT1Level)),
    poolCount: applicable.filter(pool => pool.allT1Level !== null).length,
    byTier,
  }]
}))
const metadata = {
  schemaVersion: 2, gameVersion: itemClasses.gameVersion,
  source: { commit, repository: itemClasses.source.repository, modsUrl: `${sourceRoot}mods.json`,
    baseItemsUrl: `${sourceRoot}base_items.json`, modsByBaseUrl: `${sourceRoot}mods_by_base.json` },
  notes: [
    'T1 is inferred within each applicable source/type/stat series by highest required_level; IDs are not tier numbers.',
    'Tn uses the nth rank in descending required_level order per series, clamped to the lowest rank when fewer than n exist (Tn or better).',
    'Ordinary prefixes/suffixes use mods_by_base, the base domain and exclude essence-only mods. Desecrated mods use ordered spawn/generation weights.',
    'Class levels are maxima across all source base/tag pools, including historical and unreleased bases; not a claim of current drop availability.',
    'Levels indicate access to each top tier, not simultaneous affix compatibility. Special crafting rules and conditional_mods are not folded into ordinary thresholds.',
  ],
}
await writeFile(resolve(configDir, 'item-affix-pools.json'), JSON.stringify({ ...metadata, pools }, null, 2) + '\n')
await writeFile(resolve(configDir, 'item-affix-levels.json'), JSON.stringify({ ...metadata, maxTier, classes }, null, 2) + '\n')
console.log(`Imported ${Object.keys(mods).length} mods, ${Object.keys(bases).length} bases, ${pools.length} pools; ${Object.values(classes).filter(item => item.allT1Level !== null).length} classes with affixes.`)
