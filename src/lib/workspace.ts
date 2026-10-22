import { createField, parseRule, type Rule } from './rules'

export const pageIds = ['rules', 'appearance', 'preview', 'source'] as const
export type PageId = typeof pageIds[number]
export interface Appearance { text: string; background: string; border: string; fontSize: number }
export interface Workspace {
  version: 2
  openTabs: PageId[]
  activeTab: PageId | ''
  name: string
  rules: Rule[]
  appearance: Appearance
}
// Retain the key so existing workspaces can be migrated without losing settings.
export const STORAGE_KEY = 'exile-forge.workspace.v1'
export const pageLabels: Record<PageId, string> = { rules: '规则编辑', appearance: '外观样式', preview: '掉落预览', source: '过滤器源码' }

function sampleRules(): Rule[] {
  const quality = createField('Quality'); quality.params = { operator: '>', value: '0' }
  return [
    { id: 'sample-quality', name: '保留有品质的物品', action: 'Show', fields: [quality] },
    { id: 'sample-normal', name: '隐藏普通物品', action: 'Hide', fields: [createField('Rarity')] },
  ]
}

export function createWorkspace(): Workspace {
  return { version: 2, openTabs: ['rules', 'preview'], activeTab: 'rules', name: '我的冒险过滤器', rules: sampleRules(), appearance: { text: '#f4ddb0', background: '#342018', border: '#a88146', fontSize: 40 } }
}

export function readWorkspace(): Workspace {
  const fallback = createWorkspace()
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (!value || ![1, 2].includes(value.version)) return fallback
    const openTabs = Array.isArray(value.openTabs) ? [...new Set(value.openTabs.filter((id: unknown): id is PageId => pageIds.includes(id as PageId)))] as PageId[] : fallback.openTabs
    const appearance = { ...fallback.appearance }
    for (const key of ['text', 'background', 'border'] as const) if (/^#[0-9a-f]{6}$/i.test(value.appearance?.[key])) appearance[key] = value.appearance[key]
    if (Number.isInteger(value.appearance?.fontSize) && value.appearance.fontSize >= 18 && value.appearance.fontSize <= 45) appearance.fontSize = value.appearance.fontSize
    let rules = fallback.rules
    if (value.version === 2 && Array.isArray(value.rules)) {
      const ids = new Set<string>()
      rules = value.rules.map(parseRule).filter((rule: Rule | null): rule is Rule => { if (!rule || ids.has(rule.id)) return false; ids.add(rule.id); return true })
    } else if (value.version === 1 && Array.isArray(value.rules)) {
      rules = fallback.rules.filter(rule => value.rules.some((old: { id?: string }) => old?.id === (rule.action === 'Show' ? 'quality' : 'normal')))
      const quality = rules.find(rule => rule.action === 'Show')
      if (quality) {
        const font = createField('SetFontSize'); font.params.value = String(appearance.fontSize)
        quality.fields.push(font, ...(['text', 'background', 'border'] as const).map((key, index) => {
          const field = createField((['SetTextColor', 'SetBackgroundColor', 'SetBorderColor'] as const)[index]); field.params.value = appearance[key]; if (key === 'background') field.params.alpha = '230'; return field
        }))
      }
    }
    return { version: 2, openTabs, activeTab: openTabs.includes(value.activeTab) ? value.activeTab : openTabs[0] || '', name: typeof value.name === 'string' ? value.name.slice(0, 100) : fallback.name, rules, appearance }
  } catch { return fallback }
}
