import assert from 'node:assert/strict'
import { test } from 'node:test'
import { addFilterRule, createFilter, filterError, parseFilter, resolveFilterRule, serializeFilter } from './filters'
import { createField, createRule } from './rules'
import { createWorkspace, readWorkspace } from './workspace'
import { exportFilterToDirectory, type FilterDirectory } from './filter-directory'

function sampleRule() {
  const rule = createRule(); rule.name = '品质装备'; rule.fields = [createField('Quality')]
  return rule
}

test('references follow edits while copies and their nested fields remain independent', () => {
  const rule = sampleRule()
  const reference = addFilterRule(rule, 'reference')
  const copy = addFilterRule(rule, 'copy')
  rule.name = '新名称'; rule.action = 'Hide'; rule.fields[0].params.value = '20'
  assert.equal(resolveFilterRule(reference, [rule]), rule)
  const independent = resolveFilterRule(copy, [rule])!
  assert.equal(independent.name, '品质装备')
  assert.equal(independent.action, 'Show')
  assert.equal(independent.fields[0].params.value, '1')
  assert.notEqual(independent.id, rule.id)
  assert.notEqual(independent.fields[0].id, rule.fields[0].id)
  independent.fields[0].params.value = '5'
  assert.equal(rule.fields[0].params.value, '20')
  assert.equal(resolveFilterRule(copy, []), independent)
})

test('serializes repeated references and copies in filter execution order', () => {
  const rule = sampleRule()
  const filter = createFilter(); filter.name = '冒险\nHide'
  const copy = addFilterRule(rule, 'copy')
  if (copy.mode === 'copy') { copy.rule.name = '隐藏普通'; copy.rule.action = 'Hide' }
  const reference = addFilterRule(rule, 'reference')
  filter.rules = [copy, reference, addFilterRule(rule, 'reference')]
  assert.equal(new Set(filter.rules.map(entry => entry.id)).size, 3)
  assert.equal(serializeFilter(filter, [rule]), '# 冒险 Hide\n\n# 隐藏普通\nHide\n    Quality >= 1\n\n# 品质装备\nShow\n    Quality >= 1\n\n# 品质装备\nShow\n    Quality >= 1\n')
  filter.rules = [reference, copy]
  assert.ok(serializeFilter(filter, [rule]).indexOf('# 品质装备') < serializeFilter(filter, [rule]).indexOf('# 隐藏普通'))
})

test('deleted references stay identifiable and prevent incomplete exports before any file access', async () => {
  const filter = createFilter(); filter.name = 'test'; filter.rules = [addFilterRule(sampleRule(), 'reference')]
  assert.match(filterError(filter, [])!, /已删除/)
  assert.throws(() => serializeFilter(filter, []), /已删除/)
  assert.deepEqual(parseFilter(filter), filter)
  const directory = { queryPermission: () => { assert.fail('must not access directory') } } as unknown as FilterDirectory
  await assert.rejects(exportFilterToDirectory(filter, [], directory), /已删除/)
})

test('exports an entire named filter with the latest referenced rules and independent copies', async () => {
  const rule = sampleRule()
  const filter = createFilter(); filter.name = '完整过滤器'; filter.rules = [addFilterRule(rule, 'reference'), addFilterRule(rule, 'copy')]
  rule.fields[0].params.value = '20'
  let written = ''; let closed = false
  const directory = {
    queryPermission: async () => 'granted',
    getFileHandle: async (filename: string) => {
      assert.equal(filename, '完整过滤器.filter')
      return { createWritable: async () => ({ write: async (source: string) => { written = source }, close: async () => { closed = true } }) }
    },
  } as unknown as FilterDirectory
  assert.equal(await exportFilterToDirectory(filter, [rule], directory), '完整过滤器.filter')
  assert.equal(written, serializeFilter(filter, [rule]))
  assert.match(written, /Quality >= 20[\s\S]*Quality >= 1/)
  assert.equal(closed, true)
})

test('migrates v2 without losing rules and round trips filter names, entry order and copies', () => {
  const workspace = createWorkspace()
  let stored = JSON.stringify({ ...workspace, version: 2, filters: undefined, activeTab: 'source', openTabs: ['source', 'rules'] })
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => stored } })
  const migrated = readWorkspace()
  assert.equal(migrated.version, 3)
  assert.deepEqual(migrated.rules, workspace.rules)
  assert.deepEqual(migrated.filters, [])
  assert.equal(migrated.activeTab, 'source')
  const filter = createFilter(); filter.name = '持久化'; filter.rules = [addFilterRule(workspace.rules[0], 'reference'), addFilterRule(workspace.rules[1], 'copy')]
  stored = JSON.stringify({ ...migrated, filters: [filter] })
  assert.deepEqual(readWorkspace().filters, [filter])
  stored = JSON.stringify({ ...migrated, rules: [], filters: [] })
  assert.deepEqual(readWorkspace().filters, [])
  assert.deepEqual(readWorkspace().rules, [])
})

test('invalid stored entries are rejected and duplicate filter identities are discarded', () => {
  const rule = sampleRule()
  const filter = createFilter(); filter.name = 'valid'; const entry = addFilterRule(rule, 'copy'); filter.rules = [entry]
  assert.equal(parseFilter({ ...filter, rules: [entry, entry] }), null)
  assert.equal(parseFilter({ ...filter, rules: [{ id: 'bad', mode: 'copy', rule: {} }] }), null)
  assert.equal(parseFilter({ ...filter, rules: [{ id: 'bad', mode: 'reference', ruleId: '' }] }), null)
  assert.equal(parseFilter({ ...filter, rules: [{ id: 'bad', mode: 'other' }] }), null)
  const stored = JSON.stringify({ ...createWorkspace(), filters: [filter, filter] })
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => stored } })
  assert.deepEqual(readWorkspace().filters, [filter])
  assert.match(filterError(createFilter(), [])!, /命名/)
  assert.match(filterError({ ...createFilter(), name: 'empty' }, [])!, /至少添加/)
})
