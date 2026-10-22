import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { parseItem, sampleItem, unpackCraftData } from './crafting'
import { affixDisplayLines, affixDisplayName, sortEssences } from './crafting-presentation'
import { englishItemPreview } from './crafting-english'

const data = unpackCraftData(JSON.parse(readFileSync(new URL('../config/crafting-data.json', import.meta.url), 'utf8')))
test('affix language changes names and text while preserving actual values and units', () => {
  const mod = data.mods.LocalIncreasedEnergyShieldPercent7_
  assert.equal(affixDisplayName(mod, 'zh-CN'), '攻不可破的')
  assert.equal(affixDisplayName(mod, 'en'), 'Unassailable')
  assert.deepEqual(affixDisplayLines(mod, [99], 'zh-CN'), ['增加 99% 能量护盾'])
  assert.deepEqual(affixDisplayLines(mod, [99], 'zh-TW'), ['增加 99% 能量護盾'])
  assert.deepEqual(affixDisplayLines(mod, [99], 'en'), ['99% increased Energy Shield'])
  assert.deepEqual(affixDisplayLines(data.mods.LifeRegeneration1, [90], 'en'), ['1.5 Life Regeneration per second'])
  const item = parseItem(sampleItem, data)
  const before = englishItemPreview(item, data).text
  for (const language of ['zh-CN', 'zh-TW', 'en'] as const) affixDisplayLines(mod, [99], language)
  assert.equal(englishItemPreview(item, data).text, before)
})

test('essences keep each family together and sort grades from lesser to perfect', () => {
  const essences = data.essences!
  const sorted = sortEssences(essences)
  const family = (id: string) => id.replace(/Currency(?:Lesser|Greater|Perfect)?Essence/, 'CurrencyEssence')
  const rank: Record<string, number> = { lesser: 0, normal: 1, greater: 2, perfect: 3 }
  const finished = new Set<string>()
  for (let i = 1; i < sorted.length; i++) {
    const previous = sorted[i - 1], current = sorted[i]
    if (family(previous.id) === family(current.id)) assert.ok(rank[previous.grade] < rank[current.grade])
    else { finished.add(family(previous.id)); assert.ok(!finished.has(family(current.id))) }
  }
  assert.equal(sorted.length, essences.length)
  assert.notEqual(sorted, essences)
})

test('English clipboard preserves simulated special states without Chinese summaries', () => {
  const original = parseItem(sampleItem, data)
  const result = englishItemPreview({ ...original, corrupted: true, extraSocket: true }, data)
  assert.ok(result.complete)
  assert.match(result.text, /Item Class: Body Armour/)
  assert.match(result.text, /99% increased Energy Shield/)
  assert.match(result.text, /Additional Rune Sockets: 1/)
  assert.match(result.text, /Corrupted$/)
  assert.doesNotMatch(result.text, /[\u3400-\u9fff]/)
})
