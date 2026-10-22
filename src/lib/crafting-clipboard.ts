import { modTier, rarityLabels, type CraftData, type CraftItem } from './crafting'
import { englishItemPreview } from './crafting-english'
import { equipmentDisplayName } from './crafting-names'
import { affixDisplayLines, affixDisplayName, traditionalText, type AffixLanguage } from './crafting-presentation'
import itemClasses from '../config/item-classes.json'

const propertyTerms = [
  ['Energy Shield', '能量护盾', '能量護盾'], ['Evasion Rating', '闪避值', '閃避值'], ['Armour', '护甲', '護甲'],
  ['Requirements', '需求', '需求'], ['Level', '等级', '等級'], ['Int', '智慧', '智慧'], ['Str', '力量', '力量'], ['Dex', '敏捷', '敏捷'],
  ['Sockets', '插槽', '插槽'], ['Quality', '品质', '品質'], ['Physical Damage', '物理伤害', '物理傷害'],
  ['Elemental Damage', '元素伤害', '元素傷害'], ['Chaos Damage', '混沌伤害', '混沌傷害'],
  ['Critical Hit Chance', '暴击率', '暴擊率'], ['Attacks per Second', '每秒攻击次数', '每秒攻擊次數'],
  ['Block chance', '格挡率', '格擋率'], ['Spirit', '精魂', '精魂'], ['unmet', '未达到', '未達到'], ['augmented', '已增强', '已增強'],
] as const
const aliases: Record<string, string> = { 智力: '智慧', 未達到: '未达到', 插孔: '插槽', 暴擊機率: '暴击率' }
function propertyText(text: string, traditional: boolean) {
  const terms = new Map<string, string>()
  for (const [english, simplified, tw] of propertyTerms) for (const key of [english, simplified, tw]) terms.set(key, traditional ? tw : simplified)
  for (const [key, value] of Object.entries(aliases)) terms.set(key, terms.get(value) ?? value)
  const pattern = [...terms.keys()].sort((a, b) => b.length - a.length).join('|')
  return text.replace(new RegExp(pattern, 'g'), term => terms.get(term)!).replaceAll(':', '：')
}

export function craftingClipboardText(item: CraftItem, data: CraftData, language: AffixLanguage) {
  if (language === 'en') return englishItemPreview(item, data)
  const base = data.bases.find(base => base.id === item.baseId)
  if (!base || item.affixes.some(affix => !affix.modId || !data.mods[affix.modId])) return { text: '', complete: false }
  const tw = language === 'zh-TW'
  const kind = (value: string) => value === 'prefix' ? tw ? '前綴' : '前缀' : tw ? '後綴' : '后缀'
  const className = itemClasses.classes.find(entry => entry.value === base.itemClass)?.labelZh ?? base.itemClass
  const rarity = tw ? { normal: '普通', magic: '魔法', rare: '稀有', unique: '傳奇' }[item.rarity] : rarityLabels[item.rarity]
  const name = equipmentDisplayName(base, language)
  const lines = [`${tw ? '物品種類' : '物品种类'}：${tw ? traditionalText(className) : className}`, `稀有度：${rarity}`, name, '--------', ...item.properties.map(text => propertyText(text, tw))]
  if (item.properties.length) lines.push('--------')
  lines.push(`${tw ? '物品等級' : '物品等级'}：${item.itemLevel}`, '--------')
  for (const affix of item.affixes) {
    const mod = data.mods[affix.modId!]
    lines.push(`{ ${kind(affix.kind)} "${affixDisplayName(mod, language)}" (${tw ? '階層' : '阶层'}：${affix.tier ?? modTier(base, mod, data)})${affix.fractured ? ' — 破裂' : ''} }`, ...affixDisplayLines(mod, affix.values, language))
  }
  if (item.pendingDesecration) lines.push('--------', `${tw ? '未揭示的褻瀆' : '未揭示的亵渎'}${kind(item.pendingDesecration.kind)}`)
  if (item.corruptionImplicit) lines.push('--------', '{ 腐化附魔 }', ...affixDisplayLines(data.mods[item.corruptionImplicit.modId!], item.corruptionImplicit.values, language))
  if (item.extraSocket) lines.push('--------', `${tw ? '額外符文插槽' : '额外符文插槽'}：1`)
  if (item.corrupted) lines.push('--------', '已腐化')
  return { text: lines.join('\n'), complete: !item.protected }
}
