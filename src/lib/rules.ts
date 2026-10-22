export const comparisonOperators = ['=', '!=', '>', '>=', '<', '<='] as const
export const rarities = ['Normal', 'Magic', 'Rare', 'Unique'] as const
export const effectColors = ['Red', 'Green', 'Blue', 'Brown', 'White', 'Yellow', 'Cyan', 'Grey', 'Orange', 'Pink', 'Purple'] as const
export const iconShapes = ['Circle', 'Diamond', 'Hexagon', 'Square', 'Star', 'Triangle', 'Cross', 'Moon', 'Raindrop', 'Kite', 'Pentagon', 'UpsideDownHouse'] as const

type FieldDefinition = { label: string; group: '条件' | '外观' | '提示'; kind: 'number' | 'rarity' | 'text' | 'boolean' | 'color' | 'font' | 'sound' | 'effect' | 'icon'; defaults: Record<string, string> }
const numeric = (label: string): FieldDefinition => ({ label, group: '条件', kind: 'number', defaults: { operator: '>=', value: '1' } })
const boolean = (label: string): FieldDefinition => ({ label, group: '条件', kind: 'boolean', defaults: { value: 'True' } })
const color = (label: string, value: string): FieldDefinition => ({ label, group: '外观', kind: 'color', defaults: { value, alpha: '255' } })

export const fieldDefinitions = {
  Quality: numeric('品质'), ItemLevel: numeric('物品等级'), DropLevel: numeric('掉落等级'), AreaLevel: numeric('区域等级'),
  StackSize: numeric('堆叠数量'), Sockets: numeric('孔数'), WaystoneTier: numeric('途石阶级'), UnidentifiedItemTier: numeric('未鉴定阶级'),
  BaseArmour: numeric('基础护甲'), BaseEvasion: numeric('基础闪避'), BaseEnergyShield: numeric('基础能量护盾'),
  Rarity: { label: '稀有度', group: '条件', kind: 'rarity', defaults: { operator: '=', value: 'Normal' } },
  Class: { label: '物品类别', group: '条件', kind: 'text', defaults: { match: '==', value: '' } },
  BaseType: { label: '物品底材', group: '条件', kind: 'text', defaults: { match: '==', value: '' } },
  Identified: boolean('已鉴定'), Corrupted: boolean('已腐化'), Mirrored: boolean('已镜像'), TwiceCorrupted: boolean('双重腐化'),
  SetTextColor: color('文字颜色', '#f4ddb0'), SetBackgroundColor: color('背景颜色', '#342018'), SetBorderColor: color('边框颜色', '#a88146'),
  SetFontSize: { label: '标签字号', group: '外观', kind: 'font', defaults: { value: '40' } },
  PlayAlertSound: { label: '提示音效', group: '提示', kind: 'sound', defaults: { sound: '1', volume: '200' } },
  PlayEffect: { label: '掉落光柱', group: '提示', kind: 'effect', defaults: { color: 'Purple', temporary: 'False' } },
  MinimapIcon: { label: '小地图图标', group: '提示', kind: 'icon', defaults: { size: '0', color: 'Purple', shape: 'Star' } },
} satisfies Record<string, FieldDefinition>

export type FieldType = keyof typeof fieldDefinitions
export interface RuleField { id: string; type: FieldType; params: Record<string, string> }
export interface Rule { id: string; name: string; action: 'Show' | 'Hide'; fields: RuleField[] }
export const fieldTypes = Object.keys(fieldDefinitions) as FieldType[]
export const rarityLabels: Record<typeof rarities[number], string> = { Normal: '普通 / Normal', Magic: '魔法 / Magic', Rare: '稀有 / Rare', Unique: '传奇 / Unique' }

export function createField(type: FieldType): RuleField { return { id: crypto.randomUUID(), type, params: { ...fieldDefinitions[type].defaults } } }
export function createRule(): Rule { return { id: crypto.randomUUID(), name: '', action: 'Show', fields: [] } }
export function copyRule(rule: Rule, existingNames: string[] = []): Rule {
  let suffix = '（副本）'
  let number = 2
  while (existingNames.includes(rule.name.slice(0, 100 - suffix.length) + suffix)) suffix = `（副本 ${number++}）`
  return {
    ...structuredClone(rule), id: crypto.randomUUID(), name: rule.name.slice(0, 100 - suffix.length) + suffix,
    fields: rule.fields.map(field => ({ ...structuredClone(field), id: crypto.randomUUID() })),
  }
}
const inRange = (value: string, min: number, max = Number.MAX_SAFE_INTEGER) => value.trim() !== '' && Number.isSafeInteger(Number(value)) && Number(value) >= min && Number(value) <= max
export function textValues(value: string) { return value.split(/\r?\n/).map(s => s.trim()).filter(Boolean) }

export function fieldError(field: RuleField): string | undefined {
  const { params: p } = field
  switch (fieldDefinitions[field.type].kind) {
    case 'number': return !comparisonOperators.includes(p.operator as typeof comparisonOperators[number]) || !inRange(p.value, 0) ? '请输入大于等于 0 的整数。' : undefined
    case 'rarity': return !comparisonOperators.includes(p.operator as typeof comparisonOperators[number]) || !rarities.includes(p.value as typeof rarities[number]) ? '请选择有效的稀有度。' : undefined
    case 'text': return !['==', 'partial'].includes(p.match) || !textValues(p.value).length ? '请至少填写一个值，每行一个。' : /["\u0000-\u0008\u000b\u000c\u000e-\u001f\u2028\u2029]/.test(p.value) ? '值中不能包含双引号或控制字符。' : undefined
    case 'boolean': return !['True', 'False'].includes(p.value) ? '请选择是或否。' : undefined
    case 'color': return !/^#[0-9a-f]{6}$/i.test(p.value) || !inRange(p.alpha, 0, 255) ? '请选择颜色，透明度必须为 0–255 的整数。' : undefined
    case 'font': return !inRange(p.value, 1, 45) ? '字号必须为 1–45 的整数。' : undefined
    case 'sound': return p.sound === 'None' ? undefined : !inRange(p.sound, 1, 16) || !inRange(p.volume, 0, 300) ? '音效编号为 1–16，音量为 0–300。' : undefined
    case 'effect': return ![...effectColors, 'None'].includes(p.color as typeof effectColors[number]) || !['True', 'False'].includes(p.temporary) ? '请选择有效的光柱选项。' : undefined
    case 'icon': return p.size === '-1' ? undefined : !inRange(p.size, 0, 2) || !effectColors.includes(p.color as typeof effectColors[number]) || !iconShapes.includes(p.shape as typeof iconShapes[number]) ? '请选择有效的图标选项。' : undefined
  }
}

export function serializeField(field: RuleField): string {
  if (fieldError(field)) return `# ${field.type}：待完成`
  const { type, params: p } = field
  switch (fieldDefinitions[type].kind) {
    case 'number': return `${type} ${p.operator} ${Number(p.value)}`
    case 'rarity': return `${type}${p.operator === '=' ? '' : ` ${p.operator}`} ${p.value}`
    case 'text': return `${type}${p.match === '==' ? ' ==' : ''} ${textValues(p.value).map(value => `"${value}"`).join(' ')}`
    case 'boolean': return `${type} ${p.value}`
    case 'color': return `${type} ${[1, 3, 5].map(i => parseInt(p.value.slice(i, i + 2), 16)).join(' ')} ${Number(p.alpha)}`
    case 'font': return `${type} ${Number(p.value)}`
    case 'sound': return `${type} ${p.sound === 'None' ? 'None' : `${Number(p.sound)} ${Number(p.volume)}`}`
    case 'effect': return `${type} ${p.color}${p.color !== 'None' && p.temporary === 'True' ? ' Temp' : ''}`
    case 'icon': return `${type} ${p.size === '-1' ? '-1' : `${p.size} ${p.color} ${p.shape}`}`
  }
}

export function serializeRule(rule: Rule) {
  const name = rule.name.replace(/[\r\n\u2028\u2029]/g, ' ').trim() || '未命名规则'
  return [`# ${name}`, rule.action, ...rule.fields.map(field => `    ${serializeField(field)}`)].join('\n') + '\n'
}

// Decode only known fields and parameters; incomplete drafts never become stored rules.
export function parseRule(value: unknown): Rule | null {
  if (!value || typeof value !== 'object') return null
  const r = value as Record<string, unknown>
  if (typeof r.id !== 'string' || !r.id || typeof r.name !== 'string' || !r.name.trim() || !['Show', 'Hide'].includes(String(r.action)) || !Array.isArray(r.fields)) return null
  const fields: RuleField[] = []
  const ids = new Set<string>()
  for (const value of r.fields) {
    if (!value || typeof value !== 'object') return null
    const f = value as Record<string, unknown>
    if (typeof f.id !== 'string' || !f.id || ids.has(f.id) || typeof f.type !== 'string' || !fieldTypes.includes(f.type as FieldType) || !f.params || typeof f.params !== 'object') return null
    const type = f.type as FieldType
    const input = f.params as Record<string, unknown>
    const params: Record<string, string> = {}
    for (const key of Object.keys(fieldDefinitions[type].defaults)) {
      if (typeof input[key] !== 'string') return null
      params[key] = input[key]
    }
    const field = { id: f.id, type, params }
    if (fieldError(field)) return null
    ids.add(f.id); fields.push(field)
  }
  return { id: r.id, name: r.name.trim().slice(0, 100), action: r.action as Rule['action'], fields }
}

export interface ExampleItem { name: string; properties: Partial<Record<FieldType, string | number | boolean>> }
function compare(left: number, operator: string, right: number) {
  switch (operator) { case '=': return left === right; case '!=': return left !== right; case '>': return left > right; case '>=': return left >= right; case '<': return left < right; case '<=': return left <= right; default: return false }
}
export function matchesRule(rule: Rule, item: ExampleItem) {
  return rule.fields.every(field => {
    if (fieldDefinitions[field.type].group !== '条件') return true
    const value = item.properties[field.type]
    if (value === undefined || fieldError(field)) return false
    const p = field.params
    switch (fieldDefinitions[field.type].kind) {
      case 'number': return typeof value === 'number' && compare(value, p.operator, Number(p.value))
      case 'rarity': return compare(rarities.indexOf(value as typeof rarities[number]), p.operator, rarities.indexOf(p.value as typeof rarities[number]))
      case 'text': return textValues(p.value).some(text => p.match === '==' ? text === String(value) : String(value).includes(text))
      case 'boolean': return value === (p.value === 'True')
      default: return true
    }
  })
}

export function ruleFileName(rule: Pick<Rule, 'name'>) {
  const name = rule.name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').replace(/[. ]+$/g, '').trim() || 'exile-rule'
  return `${/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name) ? `_${name}` : name}.filter`
}

export function downloadRule(rule: Rule) {
  const url = URL.createObjectURL(new Blob([serializeRule(rule)], { type: 'text/plain;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = ruleFileName(rule)
  document.body.append(anchor); anchor.click(); anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
