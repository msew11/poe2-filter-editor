import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { currencies, omens, tieredCurrencies } from './crafting'
import { craftingIconKey, craftingIcons, omenIconKey } from './crafting-icons'

test('every supported consumable and tier has a PoE 2 item image', () => {
  const data = JSON.parse(readFileSync(new URL('../config/crafting-data.json', import.meta.url), 'utf8'))
  const keys = currencies.filter(currency => !['reveal', 'select-reveal'].includes(currency.id)).map(currency => craftingIconKey(currency.id))
  for (const currency of tieredCurrencies) for (const tier of ['greater', 'perfect'] as const) keys.push(craftingIconKey(currency, { tier }))
  for (const omen of omens) keys.push(omenIconKey(omen.id))
  for (const essence of data.essences) keys.push(craftingIconKey('essence', { essenceId: essence.id }))
  for (const itemClass of ['Body Armour', 'Bow', 'Ring', 'Jewel', 'Waystone']) keys.push(craftingIconKey('desecrate', {}, itemClass))
  for (const key of keys) assert.ok(craftingIcons[key]?.src, `Missing image: ${key}`)
})

test('local images match PoE 2 visual identities and recorded source checksums', () => {
  const bases = JSON.parse(readFileSync(new URL('../config/poe2/base_items.json', import.meta.url), 'utf8'))
  for (const [key, icon] of Object.entries(craftingIcons)) {
    const item = bases[icon.itemId]
    assert.equal(icon.name, item.name, key)
    assert.equal(icon.source, `https://cdn.poe2db.tw/image/${item.visual_identity.dds_file.replace(/\.dds$/, '.webp')}`, key)
    const bytes = readFileSync(new URL(`../../public${icon.src}`, import.meta.url))
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF', key)
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP', key)
    assert.equal(createHash('sha256').update(bytes).digest('hex'), icon.sha256, key)
  }
})

test('essences, omens and bones resolve to the specific consumed item', () => {
  assert.notEqual(craftingIcons[omenIconKey('exalt-prefix')].src, craftingIcons[omenIconKey('exalt-suffix')].src)
  assert.notEqual(craftingIcons[craftingIconKey('essence', { essenceId: 'Metadata/Items/Currency/CurrencyLesserEssenceLife' })].src, craftingIcons[craftingIconKey('essence', { essenceId: 'Metadata/Items/Currency/CurrencyLesserEssenceMana' })].src)
  assert.equal(craftingIcons[craftingIconKey('desecrate', {}, 'Crossbow')].name, 'Preserved Jawbone')
  assert.equal(craftingIcons[craftingIconKey('desecrate', {}, 'Focus')].name, 'Preserved Rib')
  assert.equal(craftingIcons[craftingIconKey('desecrate', {}, 'Ring')].name, 'Preserved Collarbone')
})
