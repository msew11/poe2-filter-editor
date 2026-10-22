import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'
import { itemAffixLevelsConfig, itemClassOptions } from '@/config'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { matchesClassSearch } from '@/lib/item-class-search'

export function ClassPicker({ values, onChange }: { values: string[]; onChange: (values: string[]) => void }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [tier, setTier] = useState(1)
  const [floating, setFloating] = useState<{ host: HTMLElement; style: CSSProperties } | null>(null)
  const container = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const searchInput = useRef<HTMLInputElement>(null)
  const id = useId()
  const contains = (target: Node | null) => !!target && (container.current?.contains(target) || panel.current?.contains(target))
  useLayoutEffect(() => {
    if (!open) return
    const updatePosition = () => {
      const button = trigger.current
      const host = button?.closest<HTMLElement>('[role="dialog"]')
      if (!button || !host) return
      const anchor = button.getBoundingClientRect()
      const scrollBounds = button.closest('.rule-dialog-body')?.getBoundingClientRect()
      if (scrollBounds && (anchor.bottom <= scrollBounds.top || anchor.top >= scrollBounds.bottom)) {
        setOpen(false)
        return
      }
      const bounds = host.getBoundingClientRect()
      const below = window.innerHeight - anchor.bottom - 17
      const above = anchor.top - 17
      const placeBelow = below >= Math.min(320, above)
      const width = Math.min(Math.max(280, anchor.width), window.innerWidth - 24)
      const left = Math.max(12, Math.min(anchor.left, window.innerWidth - width - 12))
      setFloating({ host, style: {
        width, left: left - bounds.left - host.clientLeft,
        ...(placeBelow ? { top: anchor.bottom - bounds.top + 5 - host.clientTop }
          : { bottom: bounds.bottom - anchor.top + 5 - host.clientTop }),
        maxHeight: Math.max(100, Math.min(360, placeBelow ? below : above)),
      } })
    }
    updatePosition()
    window.addEventListener('resize', updatePosition)
    document.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      document.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])
  useEffect(() => {
    if (open && floating) searchInput.current?.focus()
  }, [open, floating?.host])
  useEffect(() => {
    if (!open) return
    const closeOutside = (event: PointerEvent) => {
      if (!contains(event.target as Node)) setOpen(false)
    }
    // Radix handles Escape at document capture, so intercept it before the dialog.
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
      trigger.current?.focus()
    }
    document.addEventListener('pointerdown', closeOutside)
    window.addEventListener('keydown', closeOnEscape, true)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      window.removeEventListener('keydown', closeOnEscape, true)
    }
  }, [open])
  const options = itemClassOptions.filter(item => matchesClassSearch(search,
    `${item.labelZh} ${item.value}`, item.affixLevels?.byTier[tier - 1]?.allLevel ?? null))
  return <div className="field-control field-class-control class-picker" ref={container}
    onBlur={event => { if (!contains(event.relatedTarget)) setOpen(false) }}>
    <span id={`${id}-label`}>添加类别</span>
    <div className="class-picker-content">
      <Select className="class-picker-tier" aria-label="目标词缀等级" value={tier} onChange={event => setTier(Number(event.target.value))}>
        {Array.from({ length: itemAffixLevelsConfig.maxTier }, (_, index) => <option key={index + 1} value={index + 1}>T{index + 1}</option>)}
      </Select>
      <button type="button" className="forge-select class-picker-trigger" ref={trigger}
        aria-label="添加物品类别" aria-expanded={open} aria-controls={`${id}-panel`}
        onClick={() => setOpen(current => !current)}>
        <span>{values.length ? `选择类别 · 已选 ${values.length} 项` : '选择类别（含系统及历史类别）'}</span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open && floating && createPortal(<div id={`${id}-panel`} ref={panel} style={floating.style} className="class-picker-panel" role="group" aria-labelledby={`${id}-label`}>
        <Input ref={searchInput} aria-label="搜索物品类别" aria-describedby={`${id}-search-help`} placeholder="搜索类别或物等，如 71、>=71、71-82"
          value={search} onChange={event => setSearch(event.target.value)} />
        <p id={`${id}-search-help`} className="class-picker-hint">支持中英文类别、当前 T{tier} 最低物等及组合搜索，例如：戒指 &gt;=65。</p>
        <p className="class-picker-hint">全部词缀达到 T{tier} 或更高（含亵渎）；不足 {tier} 档取最低档。同类底材取最高门槛，请另加物品等级条件。</p>
        <div className="class-picker-options">
          {options.map(item => {
            const levels = item.affixLevels?.byTier[tier - 1]
            const checked = values.includes(item.value)
            const description = levels?.allLevel == null ? undefined : [
              levels.ordinaryLevel === null ? null : `普通词缀 T${tier}：物等 ≥ ${levels.ordinaryLevel}`,
              levels.desecratedLevel === null ? null : `亵渎词缀 T${tier}：物等 ≥ ${levels.desecratedLevel}`,
              '各词缀最高档的等级条件，不代表可以同时出现；包含数据表中的系统及历史底材。',
            ].filter(Boolean).join('；')
            return <label key={item.value} className={`class-picker-option${checked ? ' is-selected' : ''}`} title={description}>
              <input type="checkbox" checked={checked} onChange={() => onChange(checked
                ? values.filter(value => value !== item.value) : [...values, item.value])} />
              <span className="class-picker-name"><span>{item.labelZh}</span><small>{item.value}</small></span>
              {levels?.allLevel != null && <span className="class-picker-level">全 T{tier} ≥ {levels.allLevel}</span>}
            </label>
          })}
          {!options.length && <p className="class-picker-empty">没有匹配的类别</p>}
        </div>
      </div>, floating.host)}
    </div>
  </div>
}
