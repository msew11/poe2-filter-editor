import assert from 'node:assert/strict'
import { test } from 'node:test'
import { copyRule, createField, createRule, fieldError, fieldTypes, matchesRule, parseRule, serializeField, serializeRule } from './rules'
import { readWorkspace, STORAGE_KEY } from './workspace'

test('copied rules retain behavior and field order but have independent identities and parameters', () => {
  const source = createRule(); source.name = '高等级底材'; source.action = 'Hide'
  const lower = createField('ItemLevel'); lower.params.value = '70'
  const upper = createField('ItemLevel'); upper.params = { operator: '<=', value: '82' }
  source.fields = [lower, upper, createField('SetTextColor')]
  const copy = copyRule(source)
  assert.notEqual(copy.id, source.id)
  assert.equal(copy.name, '高等级底材（副本）')
  assert.equal(copy.action, 'Hide')
  assert.deepEqual(copy.fields.map(field => field.type), source.fields.map(field => field.type))
  for (let index = 0; index < source.fields.length; index++) {
    assert.notEqual(copy.fields[index].id, source.fields[index].id)
    assert.deepEqual(copy.fields[index].params, source.fields[index].params)
  }
  copy.fields[0].params.value = '80'
  copy.fields.pop()
  assert.equal(source.fields[0].params.value, '70')
  assert.equal(source.fields.length, 3)
  assert.deepEqual(parseRule(copy), copy)
})

test('copy names avoid existing names and stay within the stored name limit', () => {
  const source = createRule(); source.name = 'x'.repeat(100)
  const first = copyRule(source)
  const second = copyRule(source, [first.name])
  assert.ok(second.name.endsWith('（副本 2）'))
  assert.equal(second.name.length, 100)
  const third = copyRule(source, [first.name, second.name])
  assert.ok(third.name.endsWith('（副本 3）'))
})

test('serializes a compound rule with repeated numeric fields, multiple bases and RGBA in field order', () => {
  const rule = createRule(); rule.name = '高等级底材'; rule.action = 'Hide'
  const lower = createField('ItemLevel'); lower.params = { operator: '>=', value: '70' }
  const upper = createField('ItemLevel'); upper.params = { operator: '<=', value: '85' }
  const base = createField('BaseType'); base.params.value = 'Iron Cuirass\n Crude Bow '
  const color = createField('SetTextColor'); color.params = { value: '#ff8000', alpha: '200' }
  rule.fields = [lower, upper, base, color]
  assert.equal(serializeRule(rule), '# 高等级底材\nHide\n    ItemLevel >= 70\n    ItemLevel <= 85\n    BaseType == "Iron Cuirass" "Crude Bow"\n    SetTextColor 255 128 0 200\n')
  assert.deepEqual(parseRule(rule), rule)
})

test('every registered field has valid options and produces a filter command', () => {
  for (const type of fieldTypes) {
    const field = createField(type)
    if (type === 'Class' || type === 'BaseType') field.params.value = 'Example'
    assert.equal(fieldError(field), undefined, type)
    assert.ok(serializeField(field).startsWith(`${type} `), type)
    assert.ok(!serializeField(field).includes('undefined'), type)
  }
})

test('rejects incomplete values, out-of-range actions and quoted text that could change syntax', () => {
  for (const [type, key, value] of [['Quality', 'value', ''], ['Quality', 'value', '1.5'], ['SetFontSize', 'value', '46'], ['SetTextColor', 'alpha', '256'], ['PlayAlertSound', 'volume', '301'], ['BaseType', 'value', 'a"\nHide']] as const) {
    const field = createField(type); field.params[key] = value
    assert.ok(fieldError(field), `${type}: ${value}`)
    assert.match(serializeField(field), /^# .*待完成$/)
    const rule = createRule(); rule.name = 'invalid'; rule.fields = [field]
    assert.equal(parseRule(rule), null)
  }
})

test('optional actions emit the proper disabled syntax and temporary beam syntax', () => {
  const sound = createField('PlayAlertSound'); sound.params.sound = 'None'
  const effect = createField('PlayEffect'); effect.params.color = 'None'
  const icon = createField('MinimapIcon'); icon.params.size = '-1'
  assert.equal(serializeField(sound), 'PlayAlertSound None')
  assert.equal(serializeField(effect), 'PlayEffect None')
  assert.equal(serializeField(icon), 'MinimapIcon -1')
  effect.params = { color: 'Red', temporary: 'True' }
  assert.equal(serializeField(effect), 'PlayEffect Red Temp')
})

test('single rule matching combines conditions with AND and ignores display actions', () => {
  const rule = createRule(); rule.name = 'quality-normal'
  const quality = createField('Quality'); quality.params = { operator: '>', value: '0' }
  rule.fields = [quality, createField('Rarity'), createField('SetTextColor')]
  assert.equal(matchesRule(rule, { name: 'white', properties: { Quality: 20, Rarity: 'Normal' } }), true)
  assert.equal(matchesRule(rule, { name: 'magic', properties: { Quality: 20, Rarity: 'Magic' } }), false)
  assert.equal(matchesRule(rule, { name: 'unknown', properties: { Rarity: 'Normal' } }), false)
})

test('empty rules are valid catch-all blocks and names remain a single comment', () => {
  const rule = createRule(); rule.name = 'name\nHide\nQuality > 0'
  assert.equal(serializeRule(rule), '# name Hide Quality > 0\nShow\n')
  assert.equal(matchesRule(rule, { name: 'anything', properties: {} }), true)
})

test('stored rules reject unknown fields and duplicate field identities', () => {
  const rule = createRule(); rule.name = 'test'
  const field = createField('Quality'); rule.fields = [field, field]
  assert.equal(parseRule(rule), null)
  assert.equal(parseRule({ ...rule, fields: [{ ...field, type: 'NotAField' }] }), null)
})

test('migrates old workspace rules to independent entries and preserves an intentionally empty library', () => {
  let stored = JSON.stringify({ version: 1, name: 'Existing', openTabs: ['rules'], activeTab: 'rules', rules: [{ id: 'quality', enabled: false }, { id: 'normal', enabled: true }], appearance: { text: '#ff0000', background: '#000000', border: '#ffffff', fontSize: 35 } })
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => key === STORAGE_KEY ? stored : null } })
  const workspace = readWorkspace()
  assert.equal(workspace.version, 3)
  assert.equal(workspace.name, 'Existing')
  assert.equal(workspace.rules.length, 2)
  assert.ok(workspace.rules.every(rule => !('enabled' in rule)))
  assert.match(serializeRule(workspace.rules[0]), /SetTextColor 255 0 0 255/)
  stored = JSON.stringify({ ...workspace, rules: [] })
  assert.deepEqual(readWorkspace().rules, [])
})
