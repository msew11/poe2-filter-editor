import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { basesInGroup, craftBaseGroups, craftBaseTypes } from './crafting-base-groups'
import { baseSocketLimit, createBaseItem, itemBaseSettings } from './crafting-base-item'
import { applyCurrency, parseItem, restoreSession, unpackCraftData, validateItem } from './crafting'
import { craftingClipboardText } from './crafting-clipboard'

const data = unpackCraftData(JSON.parse(readFileSync(new URL('../config/crafting-data.json', import.meta.url), 'utf8')))

test('base groups isolate armour attributes, jewellery, offhands and weapon classes', () => {
  const body = craftBaseGroups.find(group => group.id === 'body')!
  const types = craftBaseTypes(data.bases, body, value => value)
  assert.equal(types.filter(type => !type.id.endsWith(':other')).length, 7)
  assert.ok(types.find(type => type.id.endsWith(':other'))!.bases.some(base => base.name === 'Golden Plate'))
  assert.ok(types.find(type => type.label === 'Grasping Mail')!.bases.every(base => base.tags.includes('str_dex_int_armour')))
  const dex = types.find(type => type.id === 'Body Armours:dex_armour')!
  assert.ok(dex.bases.some(base => base.name === 'Leather Vest'))
  assert.ok(!dex.bases.some(base => base.name === 'Vile Robe'))
  for (const group of craftBaseGroups) {
    const members = basesInGroup(data.bases, group)
    const nested = craftBaseTypes(data.bases, group, value => value).flatMap(type => type.bases)
    assert.deepEqual(new Set(nested.map(base => base.id)), new Set(members.map(base => base.id)))
    assert.equal(nested.length, members.length, 'each base belongs to exactly one type')
    assert.ok(!members.some(base => base.itemClass === 'Hidden Items'))
  }
  assert.deepEqual(basesInGroup(data.bases, craftBaseGroups.find(group => group.id === 'flasks')!), [])
})

test('selected base ID, level, quality and sockets survive crafting, clipboard and saved progress', () => {
  const base = data.bases.filter(base => base.name === 'Runeforged Leather Vest').at(-1)!
  assert.ok(base)
  const item = createBaseItem(base, { level: 100, quality: 30, sockets: 2 }, data)
  assert.equal(item.baseId, base.id)
  assert.equal(item.itemLevel, 100)
  assert.deepEqual(itemBaseSettings(item), { quality: 30, sockets: 2 })
  assert.equal(validateItem(item, data), null)
  const crafted = applyCurrency(item, 'transmute', data, () => 0.5)
  assert.deepEqual(itemBaseSettings(crafted), { quality: 30, sockets: 2 })
  for (const language of ['zh-CN', 'zh-TW', 'en'] as const) {
    const copy = craftingClipboardText(crafted, data, language)
    assert.ok(copy.complete)
    assert.deepEqual(itemBaseSettings(parseItem(copy.text, data)), { quality: 30, sockets: 2 })
  }
  const session = { original: item, steps: [{ currency: 'transmute', item: crafted }] }
  assert.deepEqual(restoreSession(JSON.stringify(session), data), session)
})

test('new base settings enforce integer ranges and per-base socket limits', () => {
  const robe = data.bases.find(base => base.name === 'Vile Robe')!
  const boots = data.bases.find(base => base.itemClass === 'Boots')!
  const ring = data.bases.find(base => base.itemClass === 'Rings')!
  assert.equal(baseSocketLimit(robe), 2)
  assert.equal(baseSocketLimit(boots), 1)
  assert.equal(baseSocketLimit(ring), 0)
  for (const settings of [{ level: 0, quality: 20, sockets: 0 }, { level: 101, quality: 20, sockets: 0 }, { level: 79, quality: 31, sockets: 0 }, { level: 79, quality: -1, sockets: 0 }, { level: 79, quality: 20, sockets: 3 }, { level: 79.5, quality: 20, sockets: 0 }]) {
    assert.throws(() => createBaseItem(robe, settings, data))
  }
  assert.throws(() => createBaseItem(ring, { level: 79, quality: 20, sockets: 1 }, data))
  assert.deepEqual(itemBaseSettings(createBaseItem(ring, { level: 1, quality: 0, sockets: 0 }, data)), { quality: 0, sockets: 0 })
})
