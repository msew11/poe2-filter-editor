import names from '../config/crafting-names.json'
import { craftingIconKey, craftingIcons, omenIconKey } from './crafting-icons'
import type { CraftBase, CraftOptions, Currency, OmenId } from './crafting'
import type { AffixLanguage } from './crafting-presentation'

const bases: Record<string, { cn: string; tw: string }> = names.bases
const items: Record<string, { cn: string; tw: string }> = names.items
export function equipmentDisplayName(base: CraftBase, language: AffixLanguage) {
  return language === 'en' ? base.name : bases[base.name]?.[language === 'zh-TW' ? 'tw' : 'cn'] ?? base.name
}
export function consumableDisplayName(iconKey: string, language: AffixLanguage) {
  return language === 'en' ? craftingIcons[iconKey].name : items[iconKey][language === 'zh-TW' ? 'tw' : 'cn']
}
export function currencyTypeName(currency: Currency | 'omens', language: AffixLanguage) {
  const categories = {
    essence: { 'zh-CN': '精华', 'zh-TW': '精髓', en: 'Essences' },
    desecrate: { 'zh-CN': '亵渎', 'zh-TW': '褻瀆', en: 'Desecration' },
    omens: { 'zh-CN': '预兆', 'zh-TW': '預兆', en: 'Omens' },
  }
  return currency in categories ? categories[currency as keyof typeof categories][language] : consumableDisplayName(currency, language)
}
export function localizedCraftAction(currency: Currency, options: CraftOptions, language: AffixLanguage, itemClass: string) {
  const action = currency === 'reveal' ? '揭示' : currency === 'select-reveal' ? '选择揭示词缀' : consumableDisplayName(craftingIconKey(currency, options, itemClass), language)
  return [action, ...(options.omens ?? []).map(id => omenDisplayName(id, language))].join(' + ')
}
export const omenDisplayName = (id: OmenId, language: AffixLanguage) => consumableDisplayName(omenIconKey(id), language)
