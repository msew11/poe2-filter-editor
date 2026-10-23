import { parseItem, type CraftBase, type CraftData, type CraftItem } from './crafting'

export interface BaseItemSettings { level: number; quality: number; sockets: number }

export function baseSocketLimit(base: CraftBase) {
  if (['Body Armours', 'Two Hand Swords', 'Two Hand Axes', 'Two Hand Maces', 'Quarterstaves', 'Bows', 'Crossbows', 'Talismans'].includes(base.itemClass)) return 2
  if (['Boots', 'Gloves', 'Helmets', 'Shields', 'Bucklers', 'One Hand Swords', 'One Hand Axes', 'One Hand Maces', 'Spears', 'Claws', 'Daggers', 'Flails'].includes(base.itemClass)) return 1
  return 0
}

export function createBaseItem(base: CraftBase, settings: BaseItemSettings, data: CraftData): CraftItem {
  const { level, quality, sockets } = settings
  if (!Number.isInteger(level) || level < 1 || level > 100) throw new Error('物品等级必须是 1–100 的整数。')
  if (!Number.isInteger(quality) || quality < 0 || quality > 30) throw new Error('物品品质必须是 0–30 的整数。')
  if (!Number.isInteger(sockets) || sockets < 0 || sockets > baseSocketLimit(base)) throw new Error('插槽数量超出此底材的限制。')
  const source = `Item Class: ${base.itemClass}\nRarity: Normal\n${base.name}\n--------\nQuality: +${quality}%\nSockets: ${sockets ? Array(sockets).fill('S').join(' ') : '0'}\n--------\nItem Level: ${level}\n--------`
  const item = parseItem(source, data)
  // Several runeforged variants share their name; keep the exact selected ID.
  return { ...item, baseId: base.id, itemClass: base.itemClass }
}

export function itemBaseSettings(item: CraftItem) {
  const quality = item.properties.find(line => /^(?:Quality|品质|品質)\s*[:：]/i.test(line))?.match(/(\d+)%/)?.[1]
  const socketText = item.properties.find(line => /^(?:Sockets|插槽|插孔)\s*[:：]/i.test(line))?.split(/[:：]/).slice(1).join(':').trim()
  return { quality: quality === undefined ? null : Number(quality), sockets: socketText === undefined ? null : /^\d+$/.test(socketText) ? Number(socketText) : (socketText.match(/\S+/g)?.length ?? 0) }
}
