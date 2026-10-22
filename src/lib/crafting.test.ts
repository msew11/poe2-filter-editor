import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { applyCurrency, candidates, currencies, currencyError, modLines, modTier, omens, optionsError, parseItem, resolveAffix, restoreSession, sampleItem, unpackCraftData, validateItem, type CraftItem, type CraftSession } from './crafting'
import { baseDisplayName, modDisplayName, modDisplayRanges, statStoredValue } from './crafting-localization'

const data = unpackCraftData(JSON.parse(readFileSync(new URL('../config/crafting-data.json', import.meta.url), 'utf8')))
const robe = () => parseItem(sampleItem, data)
const random = (seed = 12345) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }

test('screenshot affixes display Chinese names and actual thorn damage instead of source fields', () => {
  const base = data.bases.find(base => base.name === 'Vile Robe')!
  const thorns = base.modIds.map(id => data.mods[id]).find(mod => mod.name === 'Barbed')!
  const chaos = base.modIds.map(id => data.mods[id]).find(mod => mod.name === 'of Banishment')!
  assert.equal(baseDisplayName(base), '恶毒长袍')
  assert.equal(modDisplayName(data.mods.LocalIncreasedEnergyShieldPercent7_), '攻不可破的')
  assert.equal(modDisplayName(thorns), '带刺的')
  assert.equal(modDisplayName(chaos), '放逐之')
  assert.deepEqual(modLines(thorns, [15, 22]), ['15–22 物理荆棘伤害'])
  assert.deepEqual(modLines(chaos, [9]), ['+9% 混沌抗性'])
})

test('every supported ordinary and special crafting mod has Chinese stat descriptions without internal IDs or English', () => {
  for (const mod of Object.values(data.mods)) {
    const lines = modLines(mod, mod.stats.map(stat => stat.max))
    assert.ok(lines.length, mod.id)
    assert.ok(lines.every(line => /[\u4e00-\u9fff]/.test(line) && !/[a-zA-Z_]|暂无|NaN|undefined/.test(line)), `${mod.id}: ${lines}`)
    assert.match(modDisplayName(mod), /[\u4e00-\u9fff]/)
  }
})

test('display units and range labels convert regeneration, leech, crit and negative stored stats', () => {
  const byStat = (id: string) => Object.values(data.mods).find(mod => data.bases.some(base => base.modIds.includes(mod.id)) && mod.stats.length === 1 && mod.stats[0].id === id)!
  const regen = byStat('base_life_regeneration_rate_per_minute')
  assert.deepEqual(modLines(regen, [90]), ['每秒回复 1.5 生命'])
  assert.equal(modDisplayRanges(regen), '1–2')
  assert.deepEqual(modLines(byStat('local_critical_strike_chance'), [123]), ['+1.23% 暴击率'])
  assert.deepEqual(modLines(byStat('local_life_leech_from_physical_damage_permyriad'), [650]), ['物理伤害的 6.5% 偷取为生命'])
  const requirements = byStat('local_attribute_requirements_+%')
  assert.deepEqual(modLines(requirements, [-15]), ['降低 15% 属性需求'])
  assert.equal(modDisplayRanges(requirements), '15–15')
  assert.equal(statStoredValue('base_life_regeneration_rate_per_minute', 1.5), 90)
})

test('localized imports convert display units once, including when changing a resolved base', () => {
  const source = sampleItem.replace('{ 前綴 "攻不可破的"(階層：2) — 能量護盾 }\n增加99(92-100)%能量護盾', '{ Suffix Modifier "of the Newt" (Tier: 11) }\n1.5 Life Regeneration per second')
  const item = parseItem(source, data)
  assert.deepEqual(item.affixes[0].values, [90])
  assert.equal(validateItem(item, data), null)
  const base = data.bases.find(base => base.id === item.baseId)!
  const resolvedAgain = resolveAffix(item.affixes[0], base, data, true)
  assert.deepEqual(resolvedAgain.values, [90])
  assert.equal(resolvedAgain.modId, item.affixes[0].modId)
})

test('imports the supplied traditional Chinese robe, preserving rolled value, tier and metadata', () => {
  const item = robe()
  assert.equal(item.baseId, 'Metadata/Items/Armours/BodyArmours/FourBodyInt3Endgame')
  assert.equal(item.itemLevel, 79)
  assert.equal(item.rarity, 'magic')
  assert.equal(item.affixes.length, 1)
  assert.equal(item.affixes[0].modId, 'LocalIncreasedEnergyShieldPercent7_')
  assert.deepEqual(item.affixes[0].values, [99])
  assert.equal(item.affixes[0].tier, 2)
  assert.equal(modTier(data.bases.find(base => base.id === item.baseId)!, data.mods[item.affixes[0].modId!], data), 2)
  assert.ok(item.properties.includes('能量護盾: 340 (augmented)'))
  assert.equal(validateItem(item, data), null)
})

test('imports English basic and advanced clipboard text and simplified Chinese', () => {
  for (const details of ['99% increased Energy Shield', '{ Prefix Modifier "Unassailable" (Tier: 2) — Defences }\n99(92-100)% increased Energy Shield']) {
    const item = parseItem(`Item Class: Body Armours\nRarity: Magic\nUnassailable Vile Robe\n--------\nEnergy Shield: 340 (augmented)\n--------\nItem Level: 79\n--------\n${details}`, data)
    assert.equal(item.affixes[0].modId, 'LocalIncreasedEnergyShieldPercent7_')
    assert.equal(validateItem(item, data), null)
  }
  const simplified = sampleItem.replaceAll('物品種類', '物品种类').replaceAll('等級', '等级').replaceAll('惡毒長袍', '恶毒长袍').replaceAll('前綴', '前缀').replaceAll('能量護盾', '能量护盾')
  assert.equal(validateItem(parseItem(simplified, data), data), null)
})

test('rejects invalid input and keeps unresolved text available for manual confirmation', () => {
  assert.throws(() => parseItem('', data), /未识别/)
  assert.throws(() => parseItem(sampleItem.replace('79', '999'), data), /未识别/)
  const item = parseItem(sampleItem.replace('攻不可破的惡毒長袍', '未知底材'), data)
  assert.equal(item.baseId, null)
  assert.match(validateItem(item, data)!, /底材/)
  const unknown = parseItem(sampleItem.replace('增加99(92-100)%能量護盾', '未知属性 99'), data)
  // Advanced affix names can identify a mod even without its translated stat text.
  assert.equal(unknown.affixes[0].modId, 'LocalIncreasedEnergyShieldPercent7_')
  const unresolved = parseItem(sampleItem.replaceAll('攻不可破的', '未知的').replace('增加99(92-100)%能量護盾', '未知属性 99'), data)
  assert.match(validateItem(unresolved, data)!, /未识别/)
  assert.throws(() => applyCurrency(unresolved, 'regal', data), /未识别/)
})

test('augmentation adds a suffix only; regal preserves existing affixes and exalt stops at six', () => {
  const original = robe()
  const augmented = applyCurrency(original, 'augment', data, random())
  assert.deepEqual(original, robe())
  assert.equal(augmented.affixes.length, 2)
  assert.equal(augmented.affixes[1].kind, 'suffix')
  assert.match(currencyError(augmented, 'augment', data)!, /已满/)
  let item = applyCurrency(augmented, 'regal', data, random())
  assert.equal(item.rarity, 'rare')
  assert.deepEqual(item.affixes.slice(0, 2), augmented.affixes)
  while (item.affixes.length < 6) item = applyCurrency(item, 'exalt', data, random(item.affixes.length))
  assert.equal(item.affixes.filter(affix => affix.kind === 'prefix').length, 3)
  assert.equal(item.affixes.filter(affix => affix.kind === 'suffix').length, 3)
  assert.match(currencyError(item, 'exalt', data)!, /已满/)
  assert.equal(validateItem(item, data), null)
})

test('PoE 2 chaos removes one and adds one, alchemy replaces magic affixes with four', () => {
  let item = applyCurrency(robe(), 'regal', data, random())
  const before = structuredClone(item)
  item = applyCurrency(item, 'chaos', data, random(42))
  assert.equal(item.affixes.length, before.affixes.length)
  const alchemy = applyCurrency(robe(), 'alchemy', data, random())
  assert.equal(alchemy.rarity, 'rare')
  assert.equal(alchemy.affixes.length, 4)
  assert.equal(validateItem(alchemy, data), null)
})

test('normal items transmute once, annul removes and divine keeps the original mod tier', () => {
  const normal: CraftItem = { ...robe(), rarity: 'normal', affixes: [] }
  const magic = applyCurrency(normal, 'transmute', data, random())
  assert.equal(magic.rarity, 'magic')
  assert.equal(magic.affixes.length, 1)
  assert.throws(() => applyCurrency(magic, 'transmute', data), /普通/)
  const divined = applyCurrency(robe(), 'divine', data, random())
  assert.equal(divined.affixes[0].modId, robe().affixes[0].modId)
  assert.ok(divined.affixes[0].values[0] >= 92 && divined.affixes[0].values[0] <= 100)
  assert.equal(applyCurrency(robe(), 'annul', data, random()).affixes.length, 0)
})

test('candidate selection obeys item level, ordered weights and conflicting groups across seeded runs', () => {
  const item = robe()
  const pool = candidates(item, data)
  assert.ok(pool.length > 0)
  assert.ok(pool.every(({ mod }) => mod.level <= 79 && !mod.groups.includes('DefencesPercent')))
  for (let seed = 1; seed <= 40; seed++) {
    const rng = random(seed)
    let crafted = applyCurrency(item, 'alchemy', data, rng)
    crafted = applyCurrency(crafted, 'exalt', data, rng)
    crafted = applyCurrency(crafted, 'exalt', data, rng)
    for (let i = 0; i < 10; i++) crafted = applyCurrency(crafted, 'chaos', data, rng)
    assert.equal(validateItem(crafted, data), null)
  }
})

test('special item states block currencies and fractured affixes survive annul/divine', () => {
  for (const flag of ['Corrupted', 'Mirrored', '未鑑定']) {
    const item = parseItem(sampleItem + '\n--------\n' + flag, data)
    for (const currency of currencies) assert.ok(currencyError(item, currency.id, data))
  }
  const item = robe()
  item.affixes[0].fractured = true
  assert.match(currencyError(item, 'annul', data)!, /可移除/)
  const augmented = applyCurrency(item, 'augment', data, random())
  assert.deepEqual(applyCurrency(augmented, 'annul', data, random()).affixes, item.affixes)
})

test('restores valid progress and rejects malformed or invalid persisted items', () => {
  const original = robe()
  const session = { original, steps: [{ currency: 'regal', item: applyCurrency(original, 'regal', data, random()) }] }
  assert.deepEqual(restoreSession(JSON.stringify(session), data), session)
  for (const value of ['{', 'null', '{}', '{"original":{}}']) assert.equal(restoreSession(value, data), null)
  session.original.affixes[0].values = [9999]
  assert.equal(restoreSession(JSON.stringify(session), data), null)
})

test('omens are compatible with their intended currency and reject conflicting directions', () => {
  for (const omen of omens) {
    assert.equal(optionsError(omen.currency, { omens: [omen.id] }), null)
    assert.ok(optionsError('divine', { omens: [omen.id] }))
  }
  assert.ok(optionsError('exalt', { omens: ['exalt-prefix', 'exalt-suffix'] }))
  assert.ok(optionsError('chaos', { omens: ['chaos-prefix', 'chaos-lowest'] }))
  assert.ok(optionsError('exalt', { omens: ['exalt-double', 'exalt-double'] }))
  assert.equal(optionsError('exalt', { omens: ['exalt-prefix', 'exalt-double'] }), null)
})

test('directional regal and double exalt omens respect affix slots and preserve originals', () => {
  const regalPrefix = applyCurrency(robe(), 'regal', data, random(), { omens: ['regal-prefix'] })
  assert.equal(regalPrefix.affixes.filter(affix => affix.kind === 'prefix').length, 2)
  assert.equal(regalPrefix.affixes.filter(affix => affix.kind === 'suffix').length, 0)
  const regalSuffix = applyCurrency(robe(), 'regal', data, random(), { omens: ['regal-suffix'] })
  const exalted = applyCurrency(regalSuffix, 'exalt', data, random(10), { omens: ['exalt-prefix', 'exalt-double'] })
  assert.equal(exalted.affixes.filter(affix => affix.kind === 'prefix').length, 3)
  assert.equal(exalted.affixes.filter(affix => affix.kind === 'suffix').length, 1)
  assert.deepEqual(exalted.affixes.slice(0, 2), regalSuffix.affixes)
  assert.ok(currencyError(regalPrefix, 'exalt', data, { omens: ['exalt-prefix', 'exalt-double'] }))
  assert.ok(candidates(regalSuffix, data, { omens: ['exalt-suffix'] }).every(entry => entry.mod.kind === 'suffix'))
  assert.equal(validateItem(exalted, data), null)
})

test('double directional annulment removes only eligible unfractured affixes', () => {
  const rare = applyCurrency(robe(), 'regal', data, random(), { omens: ['regal-suffix'] })
  const fullPrefixes = applyCurrency(rare, 'exalt', data, random(10), { omens: ['exalt-prefix', 'exalt-double'] })
  fullPrefixes.affixes[0].fractured = true
  const result = applyCurrency(fullPrefixes, 'annul', data, random(), { omens: ['annul-prefix', 'annul-double'] })
  assert.equal(result.affixes.length, 2)
  assert.deepEqual(result.affixes.find(affix => affix.fractured), fullPrefixes.affixes[0])
  assert.equal(result.affixes.filter(affix => affix.kind === 'suffix').length, 1)
  assert.ok(currencyError(result, 'annul', data, { omens: ['annul-prefix'] }))
})

test('directional chaos preserves the other side; whittling uses required level', () => {
  const rare = applyCurrency(robe(), 'regal', data, random(), { omens: ['regal-suffix'] })
  for (let seed = 1; seed < 20; seed++) {
    const result = applyCurrency(rare, 'chaos', data, random(seed), { omens: ['chaos-suffix'] })
    assert.deepEqual(result.affixes[0], rare.affixes[0])
    assert.equal(result.affixes.length, rare.affixes.length)
  }
  const fire = data.mods.FireResist1
  const simple: CraftItem = { ...robe(), rarity: 'rare', affixes: [...robe().affixes, { modId: fire.id, kind: fire.kind, name: fire.name, text: '', tier: null, values: fire.stats.map(stat => stat.min), fractured: false }] }
  const result = applyCurrency(simple, 'chaos', data, random(), { omens: ['chaos-lowest'] })
  assert.deepEqual(result.affixes[0], simple.affixes[0])
  assert.equal(result.affixes.length, 2)
})

test('fracturing requires four affixes, locks exactly one, and protects its values', () => {
  assert.ok(currencyError(robe(), 'fracture', data))
  const rare = applyCurrency(robe(), 'alchemy', data, random())
  const result = applyCurrency(rare, 'fracture', data, random())
  assert.equal(rare.affixes.filter(affix => affix.fractured).length, 0)
  assert.equal(result.affixes.filter(affix => affix.fractured).length, 1)
  assert.ok(currencyError(result, 'fracture', data))
  const locked = result.affixes.find(affix => affix.fractured)!
  const annulled = applyCurrency(result, 'annul', data, random())
  assert.deepEqual(annulled.affixes.find(affix => affix.fractured), locked)
  const divined = applyCurrency(result, 'divine', data, random())
  assert.deepEqual(divined.affixes.find(affix => affix.fractured), locked)
})

test('failed two-mod operations do not partially mutate the item', () => {
  const base = data.bases.find(base => base.id === robe().baseId)!
  const only = data.mods.FireResist1
  const limitedData = { ...data, bases: [{ ...base, modIds: [only.id] }] }
  const empty: CraftItem = { ...robe(), rarity: 'rare', affixes: [] }
  const before = structuredClone(empty)
  assert.throws(() => applyCurrency(empty, 'exalt', limitedData, random(), { omens: ['exalt-double'] }), /没有符合/)
  assert.deepEqual(empty, before)
})

test('new session format retains omen consumption and goals and remains compatible with old sessions', () => {
  const original = robe()
  const session: CraftSession = { original, targets: ['LocalIncreasedEnergyShieldPercent7_'], steps: [{ currency: 'regal', omens: ['regal-suffix'], item: applyCurrency(original, 'regal', data, random(), { omens: ['regal-suffix'] }) }] }
  assert.deepEqual(restoreSession(JSON.stringify(session), data), session)
  assert.ok(restoreSession(JSON.stringify({ original, steps: [] }), data))
  assert.equal(restoreSession(JSON.stringify({ ...session, targets: ['not-a-mod'] }), data), null)
  assert.equal(restoreSession(JSON.stringify({ ...session, steps: [{ ...session.steps[0], omens: ['exalt-suffix'] }] }), data), null)
})

test('greater and perfect currencies filter only newly added modifiers by required level', () => {
  for (const tier of ['greater', 'perfect'] as const) {
    const original = robe()
    for (let seed = 1; seed < 25; seed++) {
      const regal = applyCurrency(original, 'regal', data, random(seed), { tier })
      assert.deepEqual(regal.affixes[0], original.affixes[0])
      assert.ok(data.mods[regal.affixes[1].modId!].level >= (tier === 'greater' ? 35 : 50))
      const normal = { ...original, rarity: 'normal' as const, affixes: [] }
      const magic = applyCurrency(normal, 'transmute', data, random(seed), { tier })
      assert.ok(data.mods[magic.affixes[0].modId!].level >= (tier === 'greater' ? 55 : 70))
    }
  }
  assert.ok(currencyError({ ...robe(), rarity: 'normal', itemLevel: 54, affixes: [] }, 'transmute', data, { tier: 'greater' }))
  assert.ok(optionsError('annul', { tier: 'perfect' }))
})

test('essences use base-specific guaranteed mods and preserve magic affixes', () => {
  const id = 'Metadata/Items/Currency/CurrencyGreaterEssenceLife'
  const original = robe()
  const next = applyCurrency(original, 'essence', data, random(), { essenceId: id })
  assert.equal(next.rarity, 'rare')
  assert.deepEqual(next.affixes[0], original.affixes[0])
  assert.equal(next.affixes[1].modId, 'IncreasedLife8')
  assert.equal(validateItem(next, data), null)
  assert.ok(currencyError(next, 'essence', data, { essenceId: id }))
  assert.ok(currencyError(original, 'essence', data, { essenceId: 'missing' }))
  assert.ok(currencyError(original, 'essence', data, { essenceId: 'Metadata/Items/Currency/CurrencyEssenceDefences' }))
})

test('perfect essences remove only eligible affixes and add a real essence-only mod', () => {
  const rare = applyCurrency(robe(), 'regal', data, random(), { omens: ['regal-suffix'] })
  const next = applyCurrency(rare, 'essence', data, random(), { essenceId: 'Metadata/Items/Currency/CurrencyPerfectEssenceLife', omens: ['essence-suffix'] })
  assert.deepEqual(next.affixes[0], rare.affixes[0])
  assert.equal(next.affixes.at(-1)!.modId, 'EssenceIncreasedLifePercent1')
  assert.equal(next.affixes.length, rare.affixes.length)
  assert.equal(validateItem(next, data), null)
  assert.ok(currencyError(rare, 'essence', data, { essenceId: 'Metadata/Items/Currency/CurrencyEssenceLife', omens: ['essence-suffix'] }))
  assert.deepEqual(rare, applyCurrency(robe(), 'regal', data, random(), { omens: ['regal-suffix'] }))
})

test('desecration reserves capacity, reveals distinct series, persists choices, then adds selected values', () => {
  const rare = applyCurrency(robe(), 'regal', data, random(), { omens: ['regal-suffix'] })
  const pending = applyCurrency(rare, 'desecrate', data, random(), { omens: ['desecrate-suffix'] })
  assert.equal(pending.pendingDesecration!.kind, 'suffix')
  assert.equal(pending.affixes.length, rare.affixes.length)
  assert.ok(currencyError(pending, 'desecrate', data))
  const revealed = applyCurrency(pending, 'reveal', data, random())
  const choices = revealed.pendingDesecration!.choices!
  assert.equal(choices.length, 3)
  assert.equal(new Set(choices.map(affix => data.mods[affix.modId!].type)).size, 3)
  assert.ok(currencyError(revealed, 'reveal', data))
  assert.ok(currencyError(revealed, 'chaos', data))
  const session: CraftSession = { original: rare, steps: [{ currency: 'desecrate', omens: ['desecrate-suffix'], item: pending }, { currency: 'reveal', item: revealed }] }
  const restored = restoreSession(JSON.stringify(session), data)!
  assert.ok(restored)
  assert.deepEqual(restored.steps.at(-1)!.item.pendingDesecration!.choices, choices)
  const chosen = applyCurrency(restored.steps.at(-1)!.item, 'select-reveal', data, random(), { revealIndex: 1 })
  assert.deepEqual(chosen.affixes.at(-1), choices[1])
  assert.equal(chosen.pendingDesecration, undefined)
  assert.equal(chosen.desecratedModId, choices[1].modId)
  assert.equal(validateItem(chosen, data), null)
  assert.ok(currencyError(chosen, 'desecrate', data))
  assert.equal(restoreSession(JSON.stringify({ ...session, steps: session.steps.slice(0, -1) }), data)!.steps[0].item.pendingDesecration!.choices, undefined)
})

test('unrevealed modifiers can be annulled or replaced without leaking reserved slots', () => {
  const rare = applyCurrency(robe(), 'regal', data, random())
  const pending = applyCurrency(rare, 'desecrate', data, random(), { omens: ['desecrate-suffix'] })
  const annulled = applyCurrency(pending, 'annul', data, () => 0.999)
  assert.equal(annulled.pendingDesecration, undefined)
  assert.deepEqual(annulled.affixes, rare.affixes)
  const replaced = applyCurrency(pending, 'chaos', data, () => 0.999)
  assert.equal(replaced.pendingDesecration, undefined)
  assert.equal(replaced.affixes.length, rare.affixes.length + 1)
  assert.equal(validateItem(replaced, data), null)
  assert.ok(currencyError(pending, 'chaos', data, { omens: ['chaos-lowest'] }))
})

test('special reveal choices obey actual base pools and never permit forged or duplicate options', () => {
  const rare = applyCurrency(robe(), 'regal', data, random())
  let sawSpecial = false
  for (let seed = 1; seed < 40; seed++) {
    const pending = applyCurrency(rare, 'desecrate', data, random(seed), { omens: ['desecrate-suffix'] })
    const revealed = applyCurrency(pending, 'reveal', data, random(seed))
    assert.equal(validateItem(revealed, data), null)
    const base = data.bases.find(base => base.id === rare.baseId)!
    if (revealed.pendingDesecration!.choices!.some(affix => base.desecratedModIds!.includes(affix.modId!))) sawSpecial = true
    const invalid = structuredClone(revealed)
    invalid.pendingDesecration!.choices![1] = structuredClone(invalid.pendingDesecration!.choices![0])
    assert.ok(validateItem(invalid, data))
    assert.equal(restoreSession(JSON.stringify({ original: invalid, steps: [] }), data), null)
  }
  assert.ok(sawSpecial)
})

test('specified corruption branches produce valid locked items and remain restorable', () => {
  const rare = applyCurrency(robe(), 'regal', data, random())
  for (const corruption of ['unchanged', 'implicit', 'reroll', 'socket'] as const) {
    const next = applyCurrency(rare, 'vaal', data, random(), { corruption })
    assert.equal(next.corrupted, true)
    assert.equal(validateItem(next, data), null)
    assert.ok(currencyError(next, 'divine', data))
    assert.ok(currencyError(next, 'vaal', data, { corruption }))
    if (corruption === 'unchanged') assert.deepEqual(next.affixes, rare.affixes)
    if (corruption === 'implicit') assert.ok(data.bases.find(base => base.id === rare.baseId)!.corruptedModIds!.includes(next.corruptionImplicit!.modId!))
    if (corruption === 'socket') assert.equal(next.extraSocket, true)
    if (corruption === 'reroll') assert.ok(next.affixes.length >= 4 && next.affixes.length <= 6)
    assert.ok(restoreSession(JSON.stringify({ original: rare, steps: [{ currency: 'vaal', corruption, item: next }] }), data))
  }
  assert.equal(rare.corrupted, undefined)
  assert.ok(currencyError(rare, 'vaal', data))
})

test('restored tier and special action options reject unsupported values', () => {
  const original = robe()
  const next = applyCurrency(original, 'regal', data, random(), { tier: 'perfect' })
  const session = { original, steps: [{ currency: 'regal', tier: 'perfect', item: next }] }
  assert.ok(restoreSession(JSON.stringify(session), data))
  assert.equal(restoreSession(JSON.stringify({ ...session, steps: [{ currency: 'regal', tier: 'bogus', item: next }] }), data), null)
  assert.equal(restoreSession(JSON.stringify({ ...session, steps: [{ currency: 'essence', essenceId: 'missing', item: next }] }), data), null)
})
