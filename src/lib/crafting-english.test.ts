import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { englishItemPreview, englishModText } from './crafting-english'
import { parseItem, sampleItem, unpackCraftData } from './crafting'

const data = unpackCraftData(JSON.parse(readFileSync(new URL('../config/crafting-data.json', import.meta.url), 'utf8')))

test('Chinese robe exports English clipboard text with original values and round trips', () => {
  const original = parseItem(sampleItem, data)
  const result = englishItemPreview(original, data)
  assert.equal(result.complete, true)
  assert.deepEqual(result.warnings, [])
  assert.match(result.text, /Rarity: Magic\nUnassailable Vile Robe/)
  assert.match(result.text, /Energy Shield: 340 \(augmented\)/)
  assert.match(result.text, /Requirements: Level 65, 121 \(unmet\) Int/)
  assert.match(result.text, /Sockets: S/)
  assert.match(result.text, /Prefix Modifier "Unassailable" \(Tier: 2\)/)
  assert.match(result.text, /99% increased Energy Shield/)
  assert.doesNotMatch(result.text, /[\u3400-\u9fff]|92-100/)
  const imported = parseItem(result.text, data)
  assert.equal(imported.baseId, original.baseId)
  assert.equal(imported.itemLevel, original.itemLevel)
  assert.deepEqual(imported.affixes[0].values, [99])
  assert.equal(imported.affixes[0].modId, original.affixes[0].modId)
})

test('English formatting converts units and damage bounds without replacing fixed constants', () => {
  assert.deepEqual(englishModText(data.mods.LifeRegeneration1, [90]), { text: '1.5 Life Regeneration per second', complete: true })
  assert.equal(englishModText(data.mods.LocalAddedPhysicalDamage1, [2, 4]).text, 'Adds 2 to 4 Physical Damage')
  const mod = Object.values(data.mods).find(mod => mod.text.includes('further than 6m') && mod.stats.length === 1)!
  const result = englishModText(mod, [mod.stats[0].min])
  assert.ok(result.complete)
  assert.match(result.text, /further than 6m/)
  assert.doesNotMatch(result.text, /\[|\]/)
})

test('unresolved bases, modifiers and untranslated properties produce explicit preview warnings', () => {
  const item = parseItem(sampleItem, data)
  assert.equal(englishItemPreview({ ...item, baseId: null }, data).complete, false)
  const unresolved = englishItemPreview({ ...item, affixes: [{ ...item.affixes[0], modId: null }] }, data)
  assert.equal(unresolved.complete, false)
  assert.match(unresolved.warnings.join(), /未识别词缀/)
  const properties = englishItemPreview({ ...item, properties: [...item.properties, '特殊属性：未知'] }, data)
  assert.match(properties.warnings.join(), /附加属性尚未翻译/)
  assert.doesNotMatch(properties.text, /特殊属性/)
  assert.equal(englishModText({ ...data.mods.LocalIncreasedEnergyShieldPercent7_, text: '(900-999)% increased Energy Shield' }, [99]).complete, false)
})
