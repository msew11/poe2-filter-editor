import traditionalTemplates from '../config/crafting-traditional.json'
import type { CraftMod, Essence } from './crafting'
import { englishModText } from './crafting-english'
import { localizedModLines, modDisplayName } from './crafting-localization'

export type AffixLanguage = 'zh-CN' | 'zh-TW' | 'en'
const dictionary: Record<string, string> = traditionalTemplates
export function traditionalText(text: string) {
  const numbers = text.match(/-?\d+(?:\.\d+)?/g) ?? []
  const template = dictionary[text.replace(/-?\d+(?:\.\d+)?/g, '#')]
  let index = 0
  return template ? template.replace(/#/g, () => numbers[index++]) : text
}
export function affixDisplayName(mod: CraftMod, language: AffixLanguage) {
  if (language === 'en') return mod.name
  const name = modDisplayName(mod)
  return language === 'zh-TW' ? traditionalText(name) : name
}
export function affixDisplayLines(mod: CraftMod, values: number[], language: AffixLanguage) {
  if (language === 'en') return englishModText(mod, values).text.split('\n')
  const lines = localizedModLines(mod, values)
  return language === 'zh-TW' ? lines.map(line => traditionalText(line)) : lines
}

const gradeRank: Record<string, number> = { lesser: 0, normal: 1, greater: 2, perfect: 3 }
const essenceFamily = (essence: Essence) => essence.id.replace(/Currency(?:Lesser|Greater|Perfect)?Essence/, 'CurrencyEssence')
export function sortEssences(essences: Essence[]) {
  const families = new Map<string, number>()
  for (const essence of essences) if (!families.has(essenceFamily(essence))) families.set(essenceFamily(essence), families.size)
  return [...essences].sort((a, b) => families.get(essenceFamily(a))! - families.get(essenceFamily(b))! || gradeRank[a.grade] - gradeRank[b.grade])
}
