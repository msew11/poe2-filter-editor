import { readFileSync, writeFileSync } from 'node:fs'
import { Converter } from 'opencc-js/cn2t'
import { unpackCraftData } from '../src/lib/crafting'
import { localizedModLines, modDisplayName } from '../src/lib/crafting-localization'

const traditional = Converter({ from: 'cn', to: 'tw' })
const data = unpackCraftData(JSON.parse(readFileSync(new URL('../src/config/crafting-data.json', import.meta.url), 'utf8')))
const number = /-?\d+(?:\.\d+)?/g
const dictionary: Record<string, string> = {}
const classes = JSON.parse(readFileSync(new URL('../src/config/item-classes.json', import.meta.url), 'utf8')).classes
for (const entry of classes) if (entry.labelZh !== traditional(entry.labelZh)) dictionary[entry.labelZh] = traditional(entry.labelZh)
for (const mod of Object.values(data.mods)) {
  for (const text of [modDisplayName(mod), ...localizedModLines(mod, mod.stats.map(stat => stat.min))]) {
    const translated = traditional(text)
    if (text !== translated) dictionary[text.replace(number, '#')] = translated.replace(number, '#')
  }
}
writeFileSync(new URL('../src/config/crafting-traditional.json', import.meta.url), JSON.stringify(dictionary, null, 2) + '\n')
console.log(`Generated ${Object.keys(dictionary).length} traditional affix templates`)
