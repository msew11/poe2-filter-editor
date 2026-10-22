import { parseRule, ruleFileName, serializeRule, type Rule } from './rules'

export type FilterRule = { id: string; mode: 'reference'; ruleId: string } | { id: string; mode: 'copy'; rule: Rule }
export interface Filter { id: string; name: string; rules: FilterRule[] }

export function createFilter(): Filter { return { id: crypto.randomUUID(), name: '', rules: [] } }

export function addFilterRule(rule: Rule, mode: FilterRule['mode']): FilterRule {
  return mode === 'reference'
    ? { id: crypto.randomUUID(), mode, ruleId: rule.id }
    : { id: crypto.randomUUID(), mode, rule: { ...structuredClone(rule), id: crypto.randomUUID(), fields: rule.fields.map(field => ({ ...structuredClone(field), id: crypto.randomUUID() })) } }
}

export function resolveFilterRule(entry: FilterRule, rules: Rule[]): Rule | undefined {
  return entry.mode === 'copy' ? entry.rule : rules.find(rule => rule.id === entry.ruleId)
}

export function filterError(filter: Filter, rules: Rule[]): string | undefined {
  if (!filter.name.trim()) return '请为过滤器命名。'
  if (!filter.rules.length) return '请至少添加一条规则。'
  if (filter.rules.some(entry => !resolveFilterRule(entry, rules))) return '引用的规则已删除，请编辑过滤器，移除失效引用或选择其他规则。'
}

export function serializeFilter(filter: Filter, rules: Rule[]): string {
  const name = filter.name.replace(/[\r\n\u2028\u2029]/g, ' ').trim() || '未命名过滤器'
  return `# ${name}\n\n` + filter.rules.map(entry => {
    const rule = resolveFilterRule(entry, rules)
    if (!rule) throw new Error('引用的规则已删除。')
    return serializeRule(rule)
  }).join('\n')
}

export const filterFileName = (filter: Filter) => ruleFileName(filter)

export function downloadFilter(filter: Filter, rules: Rule[]) {
  const error = filterError(filter, rules)
  if (error) throw new Error(error)
  const url = URL.createObjectURL(new Blob([serializeFilter(filter, rules)], { type: 'text/plain;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url; anchor.download = filterFileName(filter)
  document.body.append(anchor); anchor.click(); anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function parseFilter(value: unknown): Filter | null {
  if (!value || typeof value !== 'object') return null
  const f = value as Record<string, unknown>
  if (typeof f.id !== 'string' || !f.id || typeof f.name !== 'string' || !f.name.trim() || !Array.isArray(f.rules)) return null
  const rules: FilterRule[] = []
  const ids = new Set<string>()
  for (const value of f.rules) {
    if (!value || typeof value !== 'object') return null
    const entry = value as Record<string, unknown>
    if (typeof entry.id !== 'string' || !entry.id || ids.has(entry.id)) return null
    if (entry.mode === 'reference' && typeof entry.ruleId === 'string' && entry.ruleId) rules.push({ id: entry.id, mode: 'reference', ruleId: entry.ruleId })
    else if (entry.mode === 'copy') {
      const rule = parseRule(entry.rule)
      if (!rule) return null
      rules.push({ id: entry.id, mode: 'copy', rule })
    } else return null
    ids.add(entry.id)
  }
  return { id: f.id, name: f.name.trim().slice(0, 100), rules }
}
