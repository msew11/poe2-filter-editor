import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { parseItem, sampleItem, unpackCraftData } from './crafting'
import { craftingClipboardText } from './crafting-clipboard'
import { equipmentDisplayName, consumableDisplayName, localizedCraftAction } from './crafting-names'
import { englishItemPreview } from './crafting-english'

const data = unpackCraftData(JSON.parse(readFileSync(new URL('../config/crafting-data.json', import.meta.url), 'utf8')))
test('clipboard follows the selected language including equipment, properties, names, tiers and rolled stats', () => {
  const item = parseItem(sampleItem, data)
  const expected = {
    'zh-CN': ['邪恶束衣', '物品等级：79', '能量护盾', '增加 99% 能量护盾'],
    'zh-TW': ['惡毒長袍', '物品等級：79', '能量護盾', '增加 99% 能量護盾'],
    en: ['Unassailable Vile Robe', 'Item Level: 79', 'Energy Shield', '99% increased Energy Shield'],
  }
  for (const language of ['zh-CN', 'zh-TW', 'en'] as const) {
    const copy = craftingClipboardText(item, data, language)
    assert.ok(copy.complete)
    for (const text of expected[language]) assert.ok(copy.text.includes(text), `${language}: ${text}`)
    const reparsed = parseItem(copy.text, data)
    assert.equal(reparsed.baseId, item.baseId)
    assert.equal(reparsed.affixes[0].modId, item.affixes[0].modId)
    assert.deepEqual(reparsed.affixes[0].values, [99])
    assert.equal(reparsed.affixes[0].tier, 2)
  }
  assert.equal(craftingClipboardText(item, data, 'en').text, englishItemPreview(item, data).text)
})

test('workbench item and currency names use the game locale including grades and omen combinations', () => {
  const base = data.bases.find(base => base.name === 'Vile Robe')!
  assert.equal(equipmentDisplayName(base, 'zh-CN'), '邪恶束衣')
  assert.equal(equipmentDisplayName(base, 'zh-TW'), '惡毒長袍')
  assert.equal(equipmentDisplayName(base, 'en'), 'Vile Robe')
  assert.equal(consumableDisplayName('transmute', 'zh-CN'), '蜕变石')
  assert.equal(consumableDisplayName('transmute', 'zh-TW'), '蛻變石')
  assert.equal(consumableDisplayName('transmute:perfect', 'en'), 'Perfect Orb of Transmutation')
  assert.equal(localizedCraftAction('exalt', { omens: ['exalt-prefix'] }, 'en', 'Body Armours'), 'Exalted Orb + Omen of Sinistral Exaltation')
})
