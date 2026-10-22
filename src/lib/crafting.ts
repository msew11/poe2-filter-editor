import { localizedModLines, modDisplayName, statStoredValue } from './crafting-localization'
import localizedNames from '../config/crafting-names.json'

export type Rarity = 'normal' | 'magic' | 'rare' | 'unique'
export interface CraftMod {
  id: string; name: string; kind: 'prefix' | 'suffix'; level: number; groups: string[]; type: string
  stats: { id: string; min: number; max: number }[]; text: string; addsTags: string[]
  weights: { tag: string; weight: number }[]; generationWeights: { tag: string; weight: number }[]
}
export interface Essence { id: string; name: string; english: string; grade: string }
export interface CraftBase { id: string; name: string; itemClass: string; tags: string[]; modIds: string[]; desecratedModIds?: string[]; essenceMods?: Record<string, string[]>; corruptedModIds?: string[] }
export interface CraftData { gameVersion: string; bases: CraftBase[]; mods: Record<string, CraftMod>; essences?: Essence[] }
export interface PackedCraftData extends Omit<CraftData, 'bases'> {
  bases: (Omit<CraftBase, 'modIds'> & { pool: number; specialPool?: number })[]; modPools: string[][]
  specialPools?: Pick<CraftBase, 'desecratedModIds' | 'essenceMods' | 'corruptedModIds'>[]
}
export function unpackCraftData(packed: PackedCraftData): CraftData {
  return { gameVersion: packed.gameVersion, mods: packed.mods, essences: packed.essences, bases: packed.bases.map(base => ({ ...base, ...packed.specialPools?.[base.specialPool!], modIds: packed.modPools[base.pool] })) }
}
export interface ItemAffix { modId: string | null; kind: 'prefix' | 'suffix' | 'unknown'; name: string; tier: number | null; text: string; values: number[]; fractured: boolean }
export interface CraftItem {
  name: string; baseId: string | null; itemClass: string; rarity: Rarity; itemLevel: number
  properties: string[]; affixes: ItemAffix[]; protected: boolean; source: string
  pendingDesecration?: { kind: 'prefix' | 'suffix'; choices?: ItemAffix[] }
  desecratedModId?: string
  corrupted?: boolean
  corruptionImplicit?: ItemAffix
  corruptionOutcome?: string
  extraSocket?: boolean
}
export const rarityLabels: Record<Rarity, string> = { normal: '普通', magic: '魔法', rare: '稀有', unique: '传奇' }
export const currencies = [
  { id: 'transmute', name: '蜕变石', help: '普通 → 魔法，添加 1 条词缀' },
  { id: 'augment', name: '增幅石', help: '为魔法物品添加 1 条词缀' },
  { id: 'regal', name: '富豪石', help: '魔法 → 稀有，保留词缀并添加 1 条' },
  { id: 'alchemy', name: '点金石', help: '普通或魔法 → 稀有，重新生成 4 条词缀' },
  { id: 'exalt', name: '崇高石', help: '为稀有物品添加 1 条词缀' },
  { id: 'chaos', name: '混沌石', help: '移除稀有物品的随机词缀，再添加 1 条' },
  { id: 'annul', name: '剥离石', help: '移除 1 条随机词缀' },
  { id: 'divine', name: '神圣石', help: '在原有阶级内重骰词缀数值' },
  { id: 'fracture', name: '破裂石', help: '稀有物品至少 4 条词缀，随机锁定 1 条词缀' },
  { id: 'essence', name: '精华', help: '低阶至高阶：魔法升稀有并添加指定词缀；完美：稀有移除一条，再添加指定词缀' },
  { id: 'desecrate', name: '亵渎', help: '为稀有物品添加一条未揭示词缀，占用一个词缀位置' },
  { id: 'reveal', name: '揭示', help: '生成三个不重复词缀系列供选择；选项随进度保存' },
  { id: 'select-reveal', name: '选择揭示词缀', help: '确认已揭示的一个选项，不消耗通货' },
  { id: 'vaal', name: '瓦尔宝珠', help: '按所选腐化结果推演，并锁定物品；各结果概率未核实，不随机抽取结果' },
] as const
export type Currency = typeof currencies[number]['id']

export const omens = [
  { id: 'exalt-prefix', name: '左旋崇高征兆', english: 'Omen of Sinistral Exaltation', currency: 'exalt', effect: 'add-prefix', help: '崇高石只添加前缀' },
  { id: 'exalt-suffix', name: '右旋崇高征兆', english: 'Omen of Dextral Exaltation', currency: 'exalt', effect: 'add-suffix', help: '崇高石只添加后缀' },
  { id: 'exalt-double', name: '强效崇高征兆', english: 'Omen of Greater Exaltation', currency: 'exalt', effect: 'add-double', help: '崇高石添加两条词缀' },
  { id: 'regal-prefix', name: '左旋加冕征兆', english: 'Omen of Sinistral Coronation', currency: 'regal', effect: 'add-prefix', help: '富豪石只添加前缀' },
  { id: 'regal-suffix', name: '右旋加冕征兆', english: 'Omen of Dextral Coronation', currency: 'regal', effect: 'add-suffix', help: '富豪石只添加后缀' },
  { id: 'annul-prefix', name: '左旋剥离征兆', english: 'Omen of Sinistral Annulment', currency: 'annul', effect: 'remove-prefix', help: '剥离石只移除前缀' },
  { id: 'annul-suffix', name: '右旋剥离征兆', english: 'Omen of Dextral Annulment', currency: 'annul', effect: 'remove-suffix', help: '剥离石只移除后缀' },
  { id: 'annul-double', name: '强效剥离征兆', english: 'Omen of Greater Annulment', currency: 'annul', effect: 'remove-double', help: '剥离石移除两条词缀' },
  { id: 'chaos-prefix', name: '左旋抹除征兆', english: 'Omen of Sinistral Erasure', currency: 'chaos', effect: 'remove-prefix', help: '混沌石只移除前缀；新词缀类型随机' },
  { id: 'chaos-suffix', name: '右旋抹除征兆', english: 'Omen of Dextral Erasure', currency: 'chaos', effect: 'remove-suffix', help: '混沌石只移除后缀；新词缀类型随机' },
  { id: 'chaos-lowest', name: '削磨征兆', english: 'Omen of Whittling', currency: 'chaos', effect: 'remove-lowest', help: '混沌石移除需求物等最低的可移除词缀' },
  { id: 'essence-prefix', name: '左旋结晶征兆', english: 'Omen of Sinistral Crystallisation', currency: 'essence', effect: 'remove-prefix', help: '完美精华只移除前缀' },
  { id: 'essence-suffix', name: '右旋结晶征兆', english: 'Omen of Dextral Crystallisation', currency: 'essence', effect: 'remove-suffix', help: '完美精华只移除后缀' },
  { id: 'desecrate-prefix', name: '左旋死灵征兆', english: 'Omen of Sinistral Necromancy', currency: 'desecrate', effect: 'add-prefix', help: '亵渎只添加前缀' },
  { id: 'desecrate-suffix', name: '右旋死灵征兆', english: 'Omen of Dextral Necromancy', currency: 'desecrate', effect: 'add-suffix', help: '亵渎只添加后缀' },
] as const
export type OmenId = typeof omens[number]['id']
export interface CraftOptions { omens?: OmenId[]; tier?: 'greater' | 'perfect'; essenceId?: string; revealIndex?: number; corruption?: 'unchanged' | 'implicit' | 'reroll' | 'socket' }
export const tieredCurrencies: Currency[] = ['transmute', 'augment', 'regal', 'exalt', 'chaos']
export function minimumModLevel(currency: Currency, options: CraftOptions) {
  return options.tier ? (['transmute', 'augment'].includes(currency) ? options.tier === 'greater' ? 55 : 70 : options.tier === 'greater' ? 35 : 50) : 1
}
export function craftActionLabel(currency: Currency, options: CraftOptions = {}) {
  return [(options.tier === 'greater' ? '高阶' : options.tier === 'perfect' ? '完美' : '') + currencies.find(entry => entry.id === currency)!.name, ...(options.omens ?? []).map(id => omens.find(entry => entry.id === id)!.name)].join(' + ')
}
function effects(options: CraftOptions) { return (options.omens ?? []).map(id => omens.find(entry => entry.id === id)?.effect) }
export function optionsError(currency: Currency, options: CraftOptions): string | null {
  const selected = options.omens ?? []
  if (options.tier && (!['greater', 'perfect'].includes(options.tier) || !tieredCurrencies.includes(currency))) return '此通货不支持所选阶级。'
  if (new Set(selected).size !== selected.length || selected.some(id => !omens.some(omen => omen.id === id && omen.currency === currency))) return '征兆不适用于当前通货。'
  const active = effects(options)
  if (active.includes('add-prefix') && active.includes('add-suffix')) return '前缀与后缀定向征兆不能同时启用。'
  if (active.filter(effect => ['remove-prefix', 'remove-suffix', 'remove-lowest'].includes(effect ?? '')).length > 1) return '本次只能选择一种移除词缀的定向方式。'
  return null
}

export const sampleItem = `物品種類: 胸甲
稀有度: 魔法
攻不可破的惡毒長袍
--------
能量護盾: 340 (augmented)
--------
需求: 等級 65, 121 (unmet) 智慧
--------
插槽: S
--------
物品等級: 79
--------
{ 前綴 "攻不可破的"(階層：2) — 能量護盾 }
增加99(92-100)%能量護盾`

const baseAliases: Record<string, string[]> = { 'Vile Robe': ['惡毒長袍', '恶毒长袍'] }
const modAliases: Record<string, string[]> = { LocalIncreasedEnergyShieldPercent7_: ['攻不可破的'] }
function cleanLinks(text: string) { return text.replace(/\[([^\]|]+)\|([^\]]+)\]/g, '$2').replace(/\[([^\]]+)\]/g, '$1') }
function normalized(text: string) {
  const pairs = '護护盾盾閃闪電电焰焰綴缀層层階阶靈灵體体護护甲甲術术惡恶長长袍袍'.match(/../g) ?? []
  let result = cleanLinks(text).replace(/\([-+]?\d+(?:\.\d+)?\s*[-–]\s*[-+]?\d+(?:\.\d+)?\)/g, '')
  for (const pair of pairs) result = result.replaceAll(pair[0], pair[1])
  return result.toLowerCase().replace(/[-+]?\d+(?:\.\d+)?/g, '#').replace(/[\s+%.,:：]/g, '')
}
export function modLines(mod: CraftMod, values: number[]) {
  return localizedModLines(mod, values)
}
export function modTier(base: CraftBase, mod: CraftMod, data: CraftData) {
  const series = base.modIds.map(id => data.mods[id]).filter(other => other.type === mod.type && other.stats.map(s => s.id).sort().join() === mod.stats.map(s => s.id).sort().join())
    .sort((a, b) => b.level - a.level || a.id.localeCompare(b.id))
  return series.findIndex(other => other.id === mod.id) + 1 || 1
}
function parseValues(text: string) {
  return [...text.replace(/\([-+]?\d+(?:\.\d+)?\s*[-–]\s*[-+]?\d+(?:\.\d+)?\)/g, '').matchAll(/[-+]?\d+(?:\.\d+)?/g)].map(match => Number(match[0]))
}
export function resolveAffix(affix: ItemAffix, base: CraftBase, data: CraftData, valuesAreStored = false): ItemAffix {
  const candidates = base.modIds.map(id => {
    const mod = data.mods[id]
    return { mod, values: affix.values.map((value, i) => valuesAreStored ? value : statStoredValue(mod.stats[i]?.id ?? '', value)) }
  }).filter(({ mod, values }) => (affix.kind === 'unknown' || mod.kind === affix.kind)
    && mod.stats.length === values.length && mod.stats.every((stat, i) => values[i] >= stat.min && values[i] <= stat.max)
    && (mod.name.toLowerCase() === affix.name.toLowerCase() || modDisplayName(mod) === affix.name || modAliases[mod.id]?.includes(affix.name)
      || normalized(modLines(mod, values).join('\n')) === normalized(affix.text)
      || normalized(cleanLinks(mod.text).replace(/\([-+]?\d+(?:\.\d+)?\s*[-–]\s*[-+]?\d+(?:\.\d+)?\)/g, '0')) === normalized(affix.text)))
  if (candidates.length !== 1) return { ...affix, modId: null }
  const { mod, values } = candidates[0]
  return { ...affix, modId: mod.id, kind: mod.kind, values }
}
export function parseItem(source: string, data: CraftData): CraftItem {
  if (source.length > 50000) throw new Error('物品文本过长，请只粘贴一件物品。')
  const lines = source.replace(/^\uFEFF/, '').replace(/\r/g, '').split('\n').map(line => line.trim())
  const rarityIndex = lines.findIndex(line => /^(?:稀有度|Rarity)\s*[:：]/i.test(line))
  const rarityText = lines[rarityIndex]?.split(/[:：]/).slice(1).join(':').trim()
  const rarityMap: Record<string, Rarity> = { '普通': 'normal', '一般': 'normal', Normal: 'normal', '魔法': 'magic', Magic: 'magic', '稀有': 'rare', Rare: 'rare', '獨特': 'unique', '独特': 'unique', '傳奇': 'unique', '传奇': 'unique', Unique: 'unique' }
  const rarity = rarityMap[rarityText]
  const levelLine = lines.find(line => /^(?:物品等[級级]|Item Level)\s*[:：]/i.test(line))
  const itemLevel = Number(levelLine?.split(/[:：]/)[1])
  if (!rarity || !levelLine || !Number.isInteger(itemLevel) || itemLevel < 1 || itemLevel > 100) throw new Error('未识别到有效稀有度和物品等级（1–100）。请复制游戏中的完整物品文本。')
  const nameEnd = lines.indexOf('--------', rarityIndex)
  if (nameEnd < 0) throw new Error('物品文本缺少名称或分隔线。')
  const nameLines = lines.slice(rarityIndex + 1, nameEnd).filter(Boolean)
  if (!nameLines.length) throw new Error('物品文本缺少名称或分隔线。')
  const name = nameLines.join(' · ')
  const translatedBases: Record<string, { cn: string; tw: string }> = localizedNames.bases
  const matches = data.bases.filter(base => [base.name, ...(baseAliases[base.name] ?? []), ...Object.values(translatedBases[base.name] ?? {})].some(alias => name.toLowerCase().includes(alias.toLowerCase())))
    .sort((a, b) => b.name.length - a.name.length)
  const base = matches[0]
  const affixes: ItemAffix[] = []
  let pending: ItemAffix | null = null
  let inMods = false
  const properties: string[] = []
  const flush = () => { if (pending?.text) { pending.values = parseValues(pending.text); affixes.push(base ? resolveAffix(pending, base, data) : pending) }; pending = null }
  for (const line of lines.slice(lines.indexOf('--------', rarityIndex) + 1)) {
    if (!line || /^-+$/.test(line)) { if (!line) continue; flush(); continue }
    if (/^\{/.test(line)) {
      flush(); inMods = true
      // Implicits, rune effects and enchantments are preserved in the source only.
      if (!/前[綴缀]|後綴|后缀|Prefix|Suffix/i.test(line)) continue
      pending = { modId: null, kind: /前[綴缀]|Prefix/i.test(line) ? 'prefix' : 'suffix', name: line.match(/["“]([^"”]+)["”]/)?.[1] ?? '', tier: Number(line.match(/(?:階層|阶层|階級|阶级|Tier)\s*[:：]?\s*(\d+)/i)?.[1]) || null,
        text: '', values: [], fractured: /fractured|破裂/i.test(line) }
      continue
    }
    if (pending) { pending.text += (pending.text ? '\n' : '') + line; continue }
    if (/^(?:物品等[級级]|Item Level)\s*[:：]/i.test(line)) { inMods = true; continue }
    if (/^(?:腐化|已腐化|已腐化的|Corrupted|Mirrored|已镜像|已鏡像|未鑑定|未鉴定|Unidentified)$/.test(line)) continue
    if (!inMods) properties.push(line)
    else if (!/^(?:需求|需求等級|Requirements|Sockets|插槽|插孔|品質|品质|Quality)\s*[:：]/i.test(line) && !/^\(/.test(line)) {
      const affix: ItemAffix = { modId: null, kind: 'unknown', name: '', tier: null, text: line, values: parseValues(line), fractured: /fractured|破裂/i.test(line) }
      affixes.push(base ? resolveAffix(affix, base, data) : affix)
    }
  }
  flush()
  return { name, baseId: base?.id ?? null, itemClass: lines.find(line => /^(?:物品種類|物品种类|物品类别|Item Class)\s*[:：]/i.test(line))?.split(/[:：]/)[1]?.trim() ?? '', rarity, itemLevel, properties, affixes,
    protected: lines.some(line => /^(?:腐化|已腐化|Corrupted|Mirrored|已镜像|已鏡像|未鑑定|未鉴定|Unidentified)$/.test(line)) || /\(implicit\)|\(enchant\)|\(rune\)|固定|附魔|符文/.test(source)
      || lines.some(line => /^\{/.test(line) && !/前[綴缀]|後綴|后缀|Prefix|Suffix/i.test(line)), source }
}

function weight(mod: CraftMod, tags: string[]) {
  const spawn = mod.weights.find(entry => tags.includes(entry.tag))?.weight ?? 0
  const generation = mod.generationWeights.length ? (mod.generationWeights.find(entry => tags.includes(entry.tag))?.weight ?? 0) / 100 : 1
  return spawn * generation
}
export function candidates(item: CraftItem, data: CraftData, options: CraftOptions = {}, minimumLevel = 1, modIds?: string[]) {
  const base = data.bases.find(base => base.id === item.baseId)
  if (!base) return []
  const tags = [...base.tags, ...item.affixes.flatMap(affix => data.mods[affix.modId ?? '']?.addsTags ?? [])]
  const groups = new Set(item.affixes.flatMap(affix => data.mods[affix.modId ?? '']?.groups ?? []))
  const cap = item.rarity === 'magic' ? 1 : 3
  const active = effects(options)
  return (modIds ?? base.modIds).map(id => data.mods[id]).filter(mod => (!active.includes('add-prefix') || mod.kind === 'prefix') && (!active.includes('add-suffix') || mod.kind === 'suffix') && mod.level >= minimumLevel && mod.level <= item.itemLevel && !mod.groups.some(group => groups.has(group))
    && item.affixes.filter(affix => affix.kind === mod.kind).length + (item.pendingDesecration?.kind === mod.kind ? 1 : 0) < cap)
    .map(mod => ({ mod, weight: weight(mod, tags) })).filter(entry => entry.weight > 0)
}
export function validateItem(item: CraftItem, data: CraftData): string | null {
  if (!data.bases.some(base => base.id === item.baseId)) return '请先确认物品底材。'
  if (item.rarity === 'unique') return '传奇物品暂不支持此做装模拟。'
  if (item.protected) return '此物品含腐化、镜像、未鉴定或特殊词缀，目前仅支持查看导入文本。'
  if ((item.corrupted !== undefined && typeof item.corrupted !== 'boolean') || (item.extraSocket !== undefined && typeof item.extraSocket !== 'boolean') || (item.extraSocket && !item.corrupted) || (item.corrupted && item.pendingDesecration)) return '物品特殊状态无效。'
  if (item.affixes.some(affix => !affix.modId || !data.mods[affix.modId])) return '请先确认所有未识别词缀。'
  const base = data.bases.find(base => base.id === item.baseId)!
  const groups = new Set<string>()
  for (const affix of item.affixes) {
    const mod = data.mods[affix.modId!]!
    if (![...base.modIds, ...(base.desecratedModIds ?? []), ...Object.values(base.essenceMods ?? {}).flat()].includes(mod.id) || mod.level > item.itemLevel || mod.kind !== affix.kind || mod.stats.length !== affix.values.length
      || mod.stats.some((stat, i) => !Number.isFinite(affix.values[i]) || affix.values[i] < stat.min || affix.values[i] > stat.max)) return '词缀不适用于此底材、物等或数值范围。'
    if (mod.groups.some(group => groups.has(group))) return '物品中存在互斥词缀，请重新确认导入。'
    mod.groups.forEach(group => groups.add(group))
  }
  const cap = item.rarity === 'magic' ? 1 : item.rarity === 'normal' ? 0 : 3
  if (['prefix', 'suffix'].some(kind => item.affixes.filter(affix => affix.kind === kind).length + (item.pendingDesecration?.kind === kind ? 1 : 0) > cap)) return '词缀数量超过当前稀有度的限制。'
  if (item.pendingDesecration && (item.rarity !== 'rare' || !['prefix', 'suffix'].includes(item.pendingDesecration.kind) || item.desecratedModId)) return '亵渎状态无效。'
  if (item.pendingDesecration?.choices) {
    const choices = item.pendingDesecration.choices
    const available = revealPool(item, data)
    if (!choices.length || choices.length > 3 || new Set(choices.map(affix => data.mods[affix.modId!]?.type)).size !== choices.length || choices.some(affix => !available.some(entry => entry.mod.id === affix.modId) || affix.kind !== item.pendingDesecration!.kind || affix.fractured || !validValues(affix, data))) return '揭示选项无效。'
  }
  if (item.desecratedModId && !item.affixes.some(affix => affix.modId === item.desecratedModId)) return '亵渎词缀状态无效。'
  if (item.affixes.filter(affix => base.desecratedModIds?.includes(affix.modId!)).some(affix => affix.modId !== item.desecratedModId)) return '亵渎词缀来源无效。'
  if (item.corruptionImplicit && (!item.corrupted || !base.corruptedModIds?.includes(item.corruptionImplicit.modId!) || !validValues(item.corruptionImplicit, data))) return '腐化词缀无效。'
  return null
}
function validValues(affix: ItemAffix, data: CraftData) {
  const mod = data.mods[affix.modId!]
  return mod && affix.values.length === mod.stats.length && mod.stats.every((stat, i) => Number.isFinite(affix.values[i]) && affix.values[i] >= stat.min && affix.values[i] <= stat.max)
}
export function revealPool(item: CraftItem, data: CraftData) {
  const base = data.bases.find(base => base.id === item.baseId)
  if (!base || !item.pendingDesecration) return []
  return candidates({ ...item, pendingDesecration: undefined }, data, {}, 1, [...base.modIds, ...(base.desecratedModIds ?? [])]).filter(entry => entry.mod.kind === item.pendingDesecration!.kind)
}
export function currencyError(item: CraftItem, currency: Currency, data: CraftData, options: CraftOptions = {}): string | null {
  const error = validateItem(item, data)
  if (error) return error
  const optionError = optionsError(currency, options)
  if (optionError) return optionError
  if (item.corrupted) return '物品已腐化，不能继续使用做装通货；可撤销腐化。'
  if (item.pendingDesecration?.choices && currency !== 'select-reveal') return '请先选择一个揭示结果。'
  const active = effects(options)
  if (active.includes('remove-lowest') && item.pendingDesecration) return '未揭示词缀与削磨征兆的等级比较规则尚未核实。'
  const base = data.bases.find(base => base.id === item.baseId)!
  if (currency === 'essence') {
    const essence = data.essences?.find(entry => entry.id === options.essenceId)
    if (!essence || !base.essenceMods?.[essence.id]?.length) return '请选择适用于当前底材的精华。'
    if (essence.grade !== 'perfect' && options.omens?.length) return '结晶征兆只适用于完美精华。'
    if (item.rarity !== (essence.grade === 'perfect' ? 'rare' : 'magic')) return essence.grade === 'perfect' ? '完美精华需要稀有物品。' : '此精华需要魔法物品。'
    const states = essence.grade === 'perfect' ? removableStates(item, options) : [{ ...item, rarity: 'rare' as const }]
    if (!states.length) return '没有符合条件的可移除词缀。'
    if (states.some(state => !essenceCandidates(state, data, essence.id).length)) return '精华词缀互斥、物等不足或位置不足；部分移除结果无法添加保证词缀。'
    return null
  }
  if (currency === 'desecrate') {
    if (item.rarity !== 'rare') return '亵渎需要稀有物品。'
    if (item.pendingDesecration || item.desecratedModId) return '物品已经有亵渎词缀。'
    if (!base.desecratedModIds?.length) return '当前底材没有亵渎词缀数据。'
    if (!candidates(item, data, options).length) return '没有符合条件的空词缀位置。'
    return null
  }
  if (currency === 'reveal') return !item.pendingDesecration ? '需要一条未揭示的亵渎词缀。' : !revealPool(item, data).length ? '没有可揭示的词缀。' : null
  if (currency === 'select-reveal') return !Number.isInteger(options.revealIndex) || !item.pendingDesecration?.choices?.[options.revealIndex!] ? '请选择一个已生成的揭示选项。' : null
  if (currency === 'vaal') {
    if (item.pendingDesecration) return '请先完成亵渎揭示。'
    if (!['unchanged', 'implicit', 'reroll', 'socket'].includes(options.corruption ?? '')) return '请选择要推演的腐化结果。'
    if (options.corruption === 'implicit' && !base.corruptedModIds?.some(id => data.mods[id].level <= item.itemLevel)) return '没有符合物等的腐化词缀。'
    if (options.corruption === 'socket' && !supportsSocket(base)) return '此底材不支持符文插槽。'
    if (options.corruption === 'reroll' && item.affixes.some(affix => affix.fractured)) return '破裂物品的腐化重铸规则尚未核实，请选择其他结果。'
    return null
  }
  if (currency === 'transmute' && item.rarity !== 'normal') return '需要普通物品。'
  if ((currency === 'augment' || currency === 'regal') && item.rarity !== 'magic') return '需要魔法物品。'
  if (currency === 'alchemy' && !['normal', 'magic'].includes(item.rarity)) return '需要普通或魔法物品。'
  if (['exalt', 'chaos'].includes(currency) && item.rarity !== 'rare') return '需要稀有物品。'
  if (['annul', 'chaos'].includes(currency) && !item.affixes.some(affix => !affix.fractured) && !item.pendingDesecration) return '没有可移除的词缀。'
  if (['annul', 'chaos'].includes(currency)) {
    if (removableStates(item, options).length < (active.includes('remove-double') ? 2 : 1)) return '符合征兆条件的可移除词缀不足。'
  }
  if (currency === 'fracture') {
    if (item.rarity !== 'rare' || item.affixes.length < 4) return '破裂石需要至少 4 条词缀的稀有物品。'
    if (item.affixes.some(affix => affix.fractured)) return '此物品已有破裂词缀。'
  }
  if (currency === 'divine' && !item.affixes.some(affix => !affix.fractured && data.mods[affix.modId!].stats.some(stat => stat.min !== stat.max))) return '没有可重骰的词缀数值。'
  if (currency === 'alchemy' && item.affixes.some(affix => affix.fractured)) return '暂不支持对破裂物品使用点金石。'
  if (['augment', 'exalt', 'regal'].includes(currency)) {
    const upgraded = currency === 'regal' ? { ...item, rarity: 'rare' as const } : item
    if (!candidates(upgraded, data, options, minimumModLevel(currency, options)).length) return '词缀已满或没有符合通货最低词缀等级的词缀。'
    if (active.includes('add-double')) {
      const kinds = active.includes('add-prefix') ? ['prefix'] : active.includes('add-suffix') ? ['suffix'] : ['prefix', 'suffix']
      const space = kinds.reduce((sum, kind) => sum + Math.max(0, 3 - item.affixes.filter(affix => affix.kind === kind).length), 0)
      if (space < 2) return '此征兆需要至少两个对应的空词缀位置。'
    }
  }
  if (currency === 'transmute' && !candidates({ ...item, rarity: 'magic' }, data, options, minimumModLevel(currency, options)).length) return '没有符合通货最低词缀等级的词缀。'
  if (currency === 'chaos' && removableStates(item, options).some(state => !candidates(state, data, options, minimumModLevel(currency, options)).length)) return '部分移除结果没有符合最低词缀等级的可添加词缀。'
  return null
}
function supportsSocket(base: CraftBase) { return base.tags.some(tag => ['body_armour', 'helmet', 'gloves', 'boots', 'weapon', 'shield'].includes(tag)) && !base.tags.includes('quiver') }
function removableStates(item: CraftItem, options: CraftOptions) {
  const active = effects(options)
  const states: CraftItem[] = item.affixes.flatMap((affix, i) => affix.fractured || (active.includes('remove-prefix') && affix.kind !== 'prefix') || (active.includes('remove-suffix') && affix.kind !== 'suffix') ? [] : [{ ...item, affixes: item.affixes.filter((_, index) => index !== i), desecratedModId: item.desecratedModId === affix.modId ? undefined : item.desecratedModId }])
  if (item.pendingDesecration && (!active.includes('remove-prefix') || item.pendingDesecration.kind === 'prefix') && (!active.includes('remove-suffix') || item.pendingDesecration.kind === 'suffix')) states.push({ ...item, pendingDesecration: undefined })
  return states
}
export function essenceCandidates(item: CraftItem, data: CraftData, essenceId: string) {
  const base = data.bases.find(base => base.id === item.baseId)
  const ids = base?.essenceMods?.[essenceId] ?? []
  // Essence-only mods have zero ordinary spawn weight, but the essence guarantees them.
  const forcedData = { ...data, mods: { ...data.mods, ...Object.fromEntries(ids.map(id => [id, { ...data.mods[id], weights: [{ tag: 'default', weight: 1 }], generationWeights: [] }])) } }
  return candidates(item, forcedData, {}, 1, ids)
}
function rollValues(mod: CraftMod, rng: () => number) { return mod.stats.map(stat => stat.min + Math.floor(rng() * (stat.max - stat.min + 1))) }
export function applyCurrency(original: CraftItem, currency: Currency, data: CraftData, rng = Math.random, options: CraftOptions = {}): CraftItem {
  const error = currencyError(original, currency, data, options)
  if (error) throw new Error(error)
  const item = structuredClone(original)
  const active = effects(options)
  const add = () => {
    const pool = candidates(item, data, options, minimumModLevel(currency, options))
    const total = pool.reduce((sum, entry) => sum + entry.weight, 0)
    if (!total) throw new Error('没有符合条件的词缀，本次操作未生效。')
    let choice = rng() * total
    const mod = (pool.find(entry => { choice -= entry.weight; return choice < 0 }) ?? pool[pool.length - 1]).mod
    item.affixes.push({ modId: mod.id, kind: mod.kind, name: mod.name, tier: null, text: '', values: rollValues(mod, rng), fractured: false })
  }
  const remove = () => {
    let indices = item.affixes.flatMap((affix, index) => affix.fractured || (active.includes('remove-prefix') && affix.kind !== 'prefix') || (active.includes('remove-suffix') && affix.kind !== 'suffix') ? [] : [index])
    if (item.pendingDesecration && (!active.includes('remove-prefix') || item.pendingDesecration.kind === 'prefix') && (!active.includes('remove-suffix') || item.pendingDesecration.kind === 'suffix')) indices.push(item.affixes.length)
    if (active.includes('remove-lowest')) {
      const lowest = Math.min(...indices.map(index => data.mods[item.affixes[index].modId!].level))
      indices = indices.filter(index => data.mods[item.affixes[index].modId!].level === lowest)
    }
    const index = indices[Math.floor(rng() * indices.length)]
    if (index === item.affixes.length) { delete item.pendingDesecration; return }
    const removed = item.affixes.splice(index, 1)[0]
    if (removed?.modId === item.desecratedModId) delete item.desecratedModId
  }
  if (currency === 'transmute') { item.rarity = 'magic'; add() }
  if (currency === 'augment' || currency === 'exalt') { add(); if (active.includes('add-double')) add() }
  if (currency === 'regal') { item.rarity = 'rare'; add() }
  if (currency === 'alchemy') { item.rarity = 'rare'; item.affixes = []; delete item.pendingDesecration; delete item.desecratedModId; for (let i = 0; i < 4; i++) add() }
  if (currency === 'annul') { remove(); if (active.includes('remove-double')) remove() }
  if (currency === 'chaos') { remove(); add() }
  if (currency === 'divine') item.affixes = item.affixes.map(affix => affix.fractured ? affix : { ...affix, values: rollValues(data.mods[affix.modId!], rng) })
  if (currency === 'fracture') item.affixes[Math.floor(rng() * item.affixes.length)].fractured = true
  if (currency === 'essence') {
    if (data.essences!.find(entry => entry.id === options.essenceId)!.grade === 'perfect') remove()
    item.rarity = 'rare'
    const pool = essenceCandidates(item, data, options.essenceId!)
    item.affixes.push(rolledAffix(pool[Math.floor(rng() * pool.length)].mod, rng))
  }
  if (currency === 'desecrate') {
    const pool = candidates(item, data, options)
    const kinds = [...new Set(pool.map(entry => entry.mod.kind))]
    item.pendingDesecration = { kind: kinds[Math.floor(rng() * kinds.length)] }
  }
  if (currency === 'reveal') {
    let pool = revealPool(item, data)
    const choices: ItemAffix[] = []
    for (let i = 0; i < 3 && pool.length; i++) {
      // Special reveal weights are not published: this is an explicitly labelled equal-series model.
      const types = [...new Set(pool.map(entry => entry.mod.type))]
      const type = types[Math.floor(rng() * types.length)]
      const series = pool.filter(entry => entry.mod.type === type)
      choices.push(rolledAffix(series[Math.floor(rng() * series.length)].mod, rng))
      pool = pool.filter(entry => entry.mod.type !== type)
    }
    item.pendingDesecration!.choices = choices
  }
  if (currency === 'select-reveal') {
    const affix = item.pendingDesecration!.choices![options.revealIndex!]
    item.affixes.push(affix); item.desecratedModId = affix.modId!; delete item.pendingDesecration
  }
  if (currency === 'vaal') {
    const base = data.bases.find(base => base.id === item.baseId)!
    if (options.corruption === 'implicit') {
      const ids = base.corruptedModIds!.filter(id => data.mods[id].level <= item.itemLevel)
      item.corruptionImplicit = rolledAffix(data.mods[ids[Math.floor(rng() * ids.length)]], rng)
    }
    if (options.corruption === 'socket') item.extraSocket = true
    if (options.corruption === 'reroll') {
      item.rarity = 'rare'; item.affixes = []; delete item.desecratedModId
      const count = 4 + Math.floor(rng() * 3)
      for (let i = 0; i < count; i++) add()
    }
    item.corrupted = true; item.corruptionOutcome = options.corruption
  }
  return item
}
function rolledAffix(mod: CraftMod, rng: () => number): ItemAffix { return { modId: mod.id, kind: mod.kind, name: mod.name, tier: null, text: '', values: rollValues(mod, rng), fractured: false } }

export interface CraftStep extends CraftOptions { currency: Currency; item: CraftItem }
export interface CraftSession { original: CraftItem; steps: CraftStep[]; targets?: string[] }
export const currentItem = (session: CraftSession) => session.steps.at(-1)?.item ?? session.original
export function restoreSession(text: string | null, data: CraftData): CraftSession | null {
  try {
    const value: unknown = JSON.parse(text ?? 'null')
    if (!value || typeof value !== 'object') return null
    const session = value as CraftSession
    const valid = (item: CraftItem) => item && Object.hasOwn(rarityLabels, item.rarity) && typeof item.name === 'string' && typeof item.source === 'string' && item.source.length <= 50000
      && typeof item.protected === 'boolean' && Array.isArray(item.properties) && item.properties.every(line => typeof line === 'string')
      && Array.isArray(item.affixes) && item.affixes.every(affix => affix && typeof affix.text === 'string' && typeof affix.name === 'string' && typeof affix.fractured === 'boolean' && Array.isArray(affix.values) && affix.values.every(Number.isFinite))
      && Number.isInteger(item.itemLevel) && item.itemLevel >= 1 && item.itemLevel <= 100 && !validateItem(item, data)
    const validOptions = (step: CraftStep) => !optionsError(step.currency, step)
      && (!step.omens || Array.isArray(step.omens))
      && (step.currency !== 'essence' || !!data.essences?.some(entry => entry.id === step.essenceId))
      && (step.currency !== 'select-reveal' || (Number.isInteger(step.revealIndex) && step.revealIndex! >= 0 && step.revealIndex! < 3))
      && (step.currency !== 'vaal' || ['unchanged', 'implicit', 'reroll', 'socket'].includes(step.corruption ?? ''))
    if (!valid(session.original) || !Array.isArray(session.steps) || session.steps.length > 200 || !session.steps.every(step => currencies.some(currency => currency.id === step.currency) && validOptions(step) && valid(step.item))) return null
    if (session.targets && (!Array.isArray(session.targets) || !session.targets.every(id => typeof id === 'string' && data.bases.find(base => base.id === session.original.baseId)!.modIds.includes(id)))) return null
    return session
  } catch { return null }
}
