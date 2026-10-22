import { useId, useState, type ComponentProps } from 'react'
import { createPortal } from 'react-dom'
import itemText from '@/config/crafting-item-text.json'
import { craftingIcons } from '@/lib/crafting-icons'

const descriptions: Record<string, { description: string; directions: string }> = itemText

export function CraftingConsumableButton({ iconKey, tooltipName, children, ...props }: ComponentProps<'button'> & { iconKey: string; tooltipName: string }) {
  const [anchor, setAnchor] = useState<{ left: number; top: number; above: boolean; maxHeight: number } | null>(null)
  const id = useId()
  const description = descriptions[iconKey]
  function show(element: HTMLButtonElement) {
    const rect = element.getBoundingClientRect()
    const above = rect.top > innerHeight / 2
    setAnchor({ left: Math.max(8, Math.min(rect.left, innerWidth - Math.min(360, innerWidth - 16) - 8)), top: above ? rect.top - 8 : rect.bottom + 8, above, maxHeight: (above ? rect.top : innerHeight - rect.bottom) - 16 })
  }
  return <><button {...props} aria-describedby={anchor ? id : undefined} onMouseEnter={event => show(event.currentTarget)} onMouseLeave={() => setAnchor(null)} onFocus={event => show(event.currentTarget)} onBlur={() => setAnchor(null)}>{children}</button>{anchor && createPortal(<div id={id} role="tooltip" className="craft-consumable-tooltip" style={{ left: anchor.left, top: anchor.top, maxHeight: anchor.maxHeight, transform: anchor.above ? 'translateY(-100%)' : undefined }}><header><img src={craftingIcons[iconKey].src} alt="" /><strong>{tooltipName}</strong></header><p>{description.description}</p>{description.directions && <footer>{description.directions}</footer>}</div>, document.body)}</>
}
