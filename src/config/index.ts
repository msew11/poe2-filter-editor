import itemClassesConfig from './item-classes.json'
import itemAffixLevelsConfig from './item-affix-levels.json'

export { itemClassesConfig, itemAffixLevelsConfig }

interface AffixLevels {
  ordinaryT1Level: number | null
  desecratedT1Level: number | null
  allT1Level: number | null
  poolCount: number
  byTier: { ordinaryLevel: number | null; desecratedLevel: number | null; allLevel: number | null }[]
}
const affixLevels: Record<string, AffixLevels> = itemAffixLevelsConfig.classes

// Several internal classes share a filter value; offer that value only once.
export const itemClassOptions = itemClassesConfig.classes.filter(
  (item, index, items) => items.findIndex(candidate => candidate.value === item.value) === index,
).map(item => ({ ...item, affixLevels: affixLevels[item.value] }))
