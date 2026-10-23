import type { CraftBase } from './crafting'

export const craftBaseGroups = [
  { id: 'body', label: '胸甲', english: 'Body Armours', classes: ['Body Armours'] },
  { id: 'boots', label: '鞋子', english: 'Boots', classes: ['Boots'] },
  { id: 'charms', label: '护符', english: 'Charms', classes: ['Charms'] },
  { id: 'flasks', label: '药剂', english: 'Flasks', classes: ['Life Flasks', 'Mana Flasks', 'Flasks'] },
  { id: 'gloves', label: '手套', english: 'Gloves', classes: ['Gloves'] },
  { id: 'helmets', label: '头部', english: 'Helmets', classes: ['Helmets'] },
  { id: 'jewellery', label: '首饰', english: 'Jewellery', classes: ['Rings', 'Amulets', 'Belts'] },
  { id: 'jewels', label: '珠宝', english: 'Jewels', classes: ['Jewels', 'Abyss Jewels'] },
  { id: 'offhands', label: '副手', english: 'Offhands', classes: ['Shields', 'Bucklers', 'Foci', 'Quivers'] },
  { id: 'one-hand', label: '单手武器', english: 'One-Handed Weapons', classes: ['One Hand Swords', 'One Hand Axes', 'One Hand Maces', 'Spears', 'Claws', 'Daggers', 'Flails', 'Sceptres', 'Wands'] },
  { id: 'tablets', label: '石板', english: 'Tablets', classes: ['Tablets'] },
  { id: 'two-hand', label: '双手武器', english: 'Two-Handed Weapons', classes: ['Two Hand Swords', 'Two Hand Axes', 'Two Hand Maces', 'Quarterstaves', 'Staves', 'Bows', 'Crossbows', 'Talismans'] },
  { id: 'waystones', label: '换界石', english: 'Waystones', classes: ['Waystones'] },
]
export type CraftBaseGroup = typeof craftBaseGroups[number]
export interface CraftBaseType { id: string; label: string; bases: CraftBase[] }

const armourTypes = [
  { tag: 'dex_armour', label: 'DEX' },
  { tag: 'dex_int_armour', label: 'DEX/INT' },
  { tag: 'int_armour', label: 'INT' },
  { tag: 'str_armour', label: 'STR' },
  { tag: 'str_dex_armour', label: 'STR/DEX' },
  { tag: 'str_int_armour', label: 'STR/INT' },
  { tag: 'str_dex_int_armour', label: 'STR/DEX/INT' },
]
const armourClasses = new Set(['Body Armours', 'Boots', 'Gloves', 'Helmets', 'Shields', 'Bucklers', 'Foci'])

export function basesInGroup(bases: CraftBase[], group: CraftBaseGroup) {
  return bases.filter(base => group.classes.includes(base.itemClass))
}

export function craftBaseTypes(bases: CraftBase[], group: CraftBaseGroup, className: (value: string) => string): CraftBaseType[] {
  return group.classes.flatMap(itemClass => {
    const members = bases.filter(base => base.itemClass === itemClass)
    if (!members.length) return []
    if (!armourClasses.has(itemClass)) return [{ id: itemClass, label: className(itemClass), bases: members }]
    const types = armourTypes.flatMap(({ tag, label }) => {
      const matches = members.filter(base => base.tags.includes(tag))
      return matches.length ? [{ id: `${itemClass}:${tag}`, label: itemClass === 'Body Armours' && tag === 'str_dex_int_armour' ? 'Grasping Mail' : `${className(itemClass)} (${label})`, bases: matches }] : []
    })
    const other = members.filter(base => !armourTypes.some(type => base.tags.includes(type.tag)))
    return [...types, ...(other.length ? [{ id: `${itemClass}:other`, label: `${className(itemClass)} · 其他`, bases: other }] : [])]
  })
}
