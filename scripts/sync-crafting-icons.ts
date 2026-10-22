import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { currencies, omens, tieredCurrencies } from '../src/lib/crafting'

// Use the pinned PoE 2 item identities, never the similarly named PoE 1 CDN files.
const bases: Record<string, { name: string; visual_identity: { dds_file: string } }> = JSON.parse(await readFile(new URL('../src/config/poe2/base_items.json', import.meta.url), 'utf8'))
const { essences }: { essences: { id: string }[] } = JSON.parse(await readFile(new URL('../src/config/poe2/essences.json', import.meta.url), 'utf8'))
const itemNames = {
  transmute: 'Orb of Transmutation', augment: 'Orb of Augmentation', regal: 'Regal Orb',
  alchemy: 'Orb of Alchemy', exalt: 'Exalted Orb', chaos: 'Chaos Orb', annul: 'Orb of Annulment',
  divine: 'Divine Orb', fracture: 'Fracturing Orb', vaal: 'Vaal Orb',
} as const
const entries: Record<string, string> = {}
function add(key: string, name: string) {
  const entry = Object.entries(bases).find(([, base]) => base.name === name)
  if (!entry) throw new Error(`Missing PoE 2 item: ${name}`)
  entries[key] = entry[0]
}
for (const currency of currencies) {
  if (!(currency.id in itemNames)) continue
  const name = itemNames[currency.id as keyof typeof itemNames]
  add(currency.id, name)
  if (tieredCurrencies.includes(currency.id)) {
    add(`${currency.id}:greater`, `Greater ${name}`)
    add(`${currency.id}:perfect`, `Perfect ${name}`)
  }
}
for (const omen of omens) add(`omen:${omen.id}`, omen.english)
for (const essence of essences) entries[`essence:${essence.id}`] = essence.id
add('essence', 'Essence of the Body')
add('omens', 'Omen of Sinistral Exaltation')
add('desecrate', 'Preserved Rib')
add('desecrate:weapon', 'Preserved Jawbone')
add('desecrate:jewellery', 'Preserved Collarbone')
add('desecrate:jewel', 'Preserved Cranium')
add('desecrate:waystone', 'Preserved Vertebrae')

const images = new Map<string, { source: string; src: string; sha256?: string }>()
for (const id of Object.values(entries)) {
  const path = bases[id].visual_identity.dds_file.replace(/\.dds$/, '.webp')
  images.set(path, { source: `https://cdn.poe2db.tw/image/${path}`, src: `/currency/poe2/${path.split('/').at(-1)}` })
}
if (new Set([...images.values()].map(image => image.src)).size !== images.size) throw new Error('Duplicate asset filenames')
await mkdir(new URL('../public/currency/poe2/', import.meta.url), { recursive: true })
const queue = [...images.values()]
await Promise.all(Array.from({ length: 6 }, async () => {
  for (let image = queue.shift(); image; image = queue.shift()) {
    let content: Buffer | undefined
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(image.source, { signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'poe2-filter-editor asset sync' } })
        if (!response.ok) throw new Error(`${response.status}: ${image.source}`)
        const bytes = Buffer.from(await response.arrayBuffer())
        if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') throw new Error(`Not WebP: ${image.source}`)
        content = bytes
        break
      } catch (error) { if (attempt === 2) throw error }
    }
    image.sha256 = createHash('sha256').update(content!).digest('hex')
    await writeFile(new URL(`../public${image.src}`, import.meta.url), content!)
  }
}))
const icons = Object.fromEntries(Object.entries(entries).map(([key, id]) => {
  const path = bases[id].visual_identity.dds_file.replace(/\.dds$/, '.webp')
  return [key, { itemId: id, name: bases[id].name, ...images.get(path)! }]
}))
await writeFile(new URL('../src/config/crafting-icons.json', import.meta.url), JSON.stringify({ game: 'Path of Exile 2', copyright: 'Item art © Grinding Gear Games', icons }, null, 2) + '\n')
console.log(`Synced ${images.size} PoE 2 images for ${Object.keys(icons).length} item entries`)
