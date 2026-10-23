import { mkdir, readFile, writeFile } from 'node:fs/promises'

// Keep card details and item art tied to the same pinned snapshot as the simulator.
const read = async (path: string) => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'))
const raw = await read('../src/config/poe2/base_items.json')
const data = await read('../src/config/crafting-data.json')
const details: Record<string, { icon: string; level: number; properties: { label: string; value: string }[] }> = {}
const images = new Map<string, string>()
const propertyLabels: Record<string, string> = { armour: '护甲', evasion: '闪避', energy_shield: '能量护盾', ward: '结界', block: '格挡率' }
for (const base of data.bases) {
  if (base.itemClass === 'Hidden Items' || base.itemClass === 'Fishing Rods') continue
  const source = raw[base.id]
  const art = source.visual_identity.dds_file.replace(/\.dds$/, '.webp')
  const icon = `/equipment/poe2/${art}`
  images.set(art, icon)
  const properties = Object.entries(propertyLabels).flatMap(([key, label]) => {
    const value = source.properties[key]
    if (value == null) return []
    const display = typeof value === 'number' ? String(value) : value.min === value.max ? String(value.min) : `${value.min}–${value.max}`
    return [{ label, value: display + (key === 'block' ? '%' : '') }]
  })
  const p = source.properties
  if (p.physical_damage_min != null && p.physical_damage_max != null) properties.push({ label: '物理伤害', value: `${p.physical_damage_min}–${p.physical_damage_max}` })
  if (p.attack_time) properties.push({ label: '每秒攻击', value: (1000 / p.attack_time).toFixed(2) })
  details[base.id] = { icon, level: source.requirements?.level ?? source.drop_level, properties }
}
const queue = [...images]
let downloaded = 0
const failed: string[] = []
await Promise.all(Array.from({ length: 8 }, async () => {
  for (let image = queue.shift(); image; image = queue.shift()) {
    const [art, icon] = image
    const output = new URL(`../public${icon}`, import.meta.url)
    try { await readFile(output); continue } catch { /* Download missing art. */ }
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(`https://cdn.poe2db.tw/image/${art}`, { signal: AbortSignal.timeout(15000) })
        if (!response.ok) throw new Error(String(response.status))
        const bytes = Buffer.from(await response.arrayBuffer())
        if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') throw new Error('Not WebP')
        await mkdir(new URL('.', output), { recursive: true })
        await writeFile(output, bytes)
        downloaded++
        break
      } catch { if (attempt === 2) failed.push(art) }
    }
  }
}))
// Unavailable source art gets a local placeholder in the UI.
const unavailable = new Set(failed.map(art => images.get(art)))
for (const detail of Object.values(details)) if (unavailable.has(detail.icon)) detail.icon = ''
await writeFile(new URL('../src/config/crafting-base-details.json', import.meta.url), JSON.stringify(details) + '\n')
console.log(`Base cards: ${Object.keys(details).length} items, ${downloaded} downloaded, ${failed.length} unavailable images`)
if (failed.length) console.log(failed.join('\n'))
