import { modTier, type CraftData, type CraftItem, type CraftMod } from './crafting'

const numberPattern = String.raw`-?\d+(?:\.\d+)?`
const rangePattern = new RegExp(`\\((${numberPattern})-(${numberPattern})\\)`, 'g')
const cleanLinks = (text: string) => text.replace(/\[([^\]|]+)\|([^\]]+)\]/g, '$2').replace(/\[([^\]]+)\]/g, '$1')

// Match the source's displayed ranges to stored stats rather than replacing all
// numbers: distances, durations and other fixed constants must remain intact.
export function englishModText(mod: CraftMod, values: number[]) {
  const used = new Set<number>()
  let complete = !!mod.text
  const text = cleanLinks(mod.text).replace(rangePattern, (range, low: string, high: string) => {
    const matches = mod.stats.flatMap((stat, index) => {
      for (const divisor of [1, 60, 100, 10]) {
        for (const sign of [1, -1]) {
          if (Math.abs(stat.min / divisor * sign - Number(low)) < 0.011 && Math.abs(stat.max / divisor * sign - Number(high)) < 0.011) return [{ index, divisor, sign }]
        }
      }
      return []
    })
    const match = matches.find(entry => !used.has(entry.index)) ?? matches[0]
    if (!match || !Number.isFinite(values[match.index])) { complete = false; return range }
    used.add(match.index)
    return String(Number((values[match.index] / match.divisor * match.sign).toFixed(2)))
  })
  return { text, complete }
}

const propertyTerms: Record<string, string> = {
  '能量護盾': 'Energy Shield', '能量护盾': 'Energy Shield', '閃避值': 'Evasion Rating', '闪避值': 'Evasion Rating', '護甲': 'Armour', '护甲': 'Armour',
  '需求': 'Requirements', '等級': 'Level', '等级': 'Level', '智慧': 'Int', '智力': 'Int', '力量': 'Str', '敏捷': 'Dex',
  '插槽': 'Sockets', '插孔': 'Sockets', '品質': 'Quality', '品质': 'Quality', '物理傷害': 'Physical Damage', '物理伤害': 'Physical Damage',
  '元素傷害': 'Elemental Damage', '元素伤害': 'Elemental Damage', '混沌傷害': 'Chaos Damage', '混沌伤害': 'Chaos Damage',
  '暴擊率': 'Critical Hit Chance', '暴击率': 'Critical Hit Chance', '每秒攻擊次數': 'Attacks per Second', '每秒攻击次数': 'Attacks per Second',
  '格擋率': 'Block chance', '格挡率': 'Block chance', '精魂': 'Spirit', '未達到': 'unmet', '未达到': 'unmet',
}
const propertyPattern = new RegExp(Object.keys(propertyTerms).sort((a, b) => b.length - a.length).join('|'), 'g')

export function englishItemPreview(item: CraftItem, data: CraftData) {
  const warnings: string[] = []
  const base = data.bases.find(base => base.id === item.baseId)
  if (!base) return { text: '', warnings: ['请先确认底材，才能生成英文物品。'], complete: false }
  const known = item.affixes.filter(affix => affix.modId && data.mods[affix.modId])
  const unresolved = item.affixes.length - known.length
  if (unresolved) warnings.push(`${unresolved} 条未识别词缀尚未生成英文，请在左侧确认。`)
  const name = item.rarity === 'magic' ? [
    ...known.filter(affix => affix.kind === 'prefix').map(affix => data.mods[affix.modId!].name), base.name,
    ...known.filter(affix => affix.kind === 'suffix').map(affix => data.mods[affix.modId!].name),
  ].filter(Boolean).join(' ') : base.name
  const lines = [`Item Class: ${base.itemClass}`, `Rarity: ${{ normal: 'Normal', magic: 'Magic', rare: 'Rare', unique: 'Unique' }[item.rarity]}`, name, '--------']
  let omitted = 0
  for (const property of item.properties) {
    const translated = property.replace(propertyPattern, term => propertyTerms[term]).replaceAll('：', ':')
    if (/[\u3400-\u9fff]/.test(translated)) omitted++
    else lines.push(translated)
  }
  if (omitted) warnings.push(`${omitted} 行附加属性尚未翻译，已保留在左侧原文。`)
  if (item.properties.length > omitted) lines.push('--------')
  lines.push(`Item Level: ${item.itemLevel}`, '--------')
  let complete = !unresolved
  for (const affix of known) {
    const mod = data.mods[affix.modId!]
    const rendered = englishModText(mod, affix.values)
    if (!rendered.complete) { complete = false; warnings.push(`词缀「${mod.name || mod.id}」的英文数值需要核对。`) }
    lines.push(`{ ${mod.kind === 'prefix' ? 'Prefix' : 'Suffix'} Modifier "${mod.name}" (Tier: ${affix.tier ?? modTier(base, mod, data)})${affix.fractured ? ' — Fractured' : ''} }`, rendered.text || 'Unresolved modifier')
  }
  if (item.protected) { complete = false; warnings.push('物品含特殊状态，英文预览未覆盖全部特殊属性。') }
  if (item.rarity === 'rare' || item.rarity === 'unique') warnings.push('物品名称使用英文底材名；未翻译随机名称或传奇名称。')
  return { text: lines.join('\n'), warnings, complete }
}
