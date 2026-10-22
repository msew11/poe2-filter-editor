import manifest from '../config/crafting-icons.json'
import type { CraftOptions, Currency, OmenId } from './crafting'

export const craftingIcons: Record<string, { itemId: string; name: string; src: string; source: string; sha256: string }> = manifest.icons

export function craftingIconKey(currency: Currency | 'omens', options: Pick<CraftOptions, 'tier' | 'essenceId'> = {}, itemClass = '') {
  if (currency === 'essence' && options.essenceId) return `essence:${options.essenceId}`
  if (currency === 'desecrate') {
    if (/^(Rings?|Amulets?|Belts?)$/.test(itemClass)) return 'desecrate:jewellery'
    if (/Jewel/.test(itemClass)) return 'desecrate:jewel'
    if (/^Waystones?$/.test(itemClass)) return 'desecrate:waystone'
    if (/Sword|Axe|Mace|Spear|Dagger|Bow|Flail|Staff|Wand|Sceptre|Talisman/i.test(itemClass)) return 'desecrate:weapon'
  }
  return options.tier ? `${currency}:${options.tier}` : currency
}

export const omenIconKey = (id: OmenId) => `omen:${id}`
