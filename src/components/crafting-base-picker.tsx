import { useMemo, useRef, useEffect, useState } from 'react'
import { ArrowLeft, Check, ChevronRight, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { equipmentDisplayName } from '@/lib/crafting-names'
import { basesInGroup, craftBaseGroups, craftBaseTypes } from '@/lib/crafting-base-groups'
import type { CraftBase, CraftData } from '@/lib/crafting'
import { itemClassOptions } from '@/config'
import detailsData from '@/config/crafting-base-details.json'
import { baseSocketLimit, type BaseItemSettings } from '@/lib/crafting-base-item'

interface BaseDetail { icon: string; level: number; properties: { label: string; value: string }[] }
const details: Record<string, BaseDetail> = detailsData
const baseDisplayName = (base: CraftBase) => equipmentDisplayName(base, 'zh-CN')
const className = (value: string) => itemClassOptions.find(option => option.value === value)?.labelZh ?? value
const levels = Array.from({ length: 100 }, (_, index) => index + 1)

export function CraftingBasePicker({ data, onCreate }: { data: CraftData; onCreate: (baseId: string, settings: BaseItemSettings) => void }) {
  const [groupId, setGroupId] = useState('')
  const [typeId, setTypeId] = useState('')
  const [itemId, setItemId] = useState('')
  const [search, setSearch] = useState('')
  const [level, setLevel] = useState(79)
  const [quality, setQuality] = useState(20)
  const [sockets, setSockets] = useState(0)
  const heading = useRef<HTMLHeadingElement>(null)
  const group = craftBaseGroups.find(group => group.id === groupId)
  const types = useMemo(() => group ? craftBaseTypes(data.bases, group, className) : [], [data, group])
  const type = types.find(type => type.id === typeId)
  const item = type?.bases.find(base => base.id === itemId)
  const step = item ? 3 : type ? 2 : group ? 1 : 0
  const titles = ['选择基底分组', '选择 Base 类型', '选择 Item 基底', '设置物品属性']
  const subtitles = ['Choose a base group', 'Choose a base', 'Choose an item', 'Item level / Quality / Sockets']
  const query = search.trim().toLowerCase()
  const visible = type?.bases.filter(base => `${baseDisplayName(base)} ${base.name}`.toLowerCase().includes(query)).sort((a, b) => (details[a.id]?.level ?? 0) - (details[b.id]?.level ?? 0)) ?? []

  useEffect(() => { heading.current?.focus() }, [step])
  function back() {
    if (item) setItemId('')
    else if (type) { setTypeId(''); setSearch('') }
    else setGroupId('')
  }

  return <div className="craft-base-picker">
    <div className="craft-base-step-heading">
      {step > 0 && <Button variant="ghost" size="sm" onClick={back}><ArrowLeft aria-hidden="true" />返回</Button>}
      <h2 ref={heading} tabIndex={-1}>{titles[step]}<small>{subtitles[step]}</small></h2>
      <span>{step + 1} / 4</span>
    </div>
    <nav className="craft-base-breadcrumbs" aria-label="基底选择路径">
      <button type="button" aria-current={step === 0 ? 'step' : undefined} onClick={() => { setGroupId(''); setTypeId(''); setItemId(''); setSearch('') }}>Base group</button>
      {group && <><ChevronRight aria-hidden="true" /><button type="button" aria-current={step === 1 ? 'step' : undefined} onClick={() => { setTypeId(''); setItemId(''); setSearch('') }}>{group.label}</button></>}
      {type && <><ChevronRight aria-hidden="true" /><button type="button" aria-current={step === 2 ? 'step' : undefined} onClick={() => setItemId('')}>{type.label}</button></>}
      {item && <><ChevronRight aria-hidden="true" /><span aria-current="step">{baseDisplayName(item)}</span></>}
    </nav>
    {!group && <div className="craft-base-options" role="group" aria-label="Base group">{craftBaseGroups.map(group => {
      const available = basesInGroup(data.bases, group).length > 0
      return <button type="button" key={group.id} disabled={!available} onClick={() => { setGroupId(group.id); setTypeId(''); setItemId(''); setSearch('') }} title={available ? group.english : '当前做装数据暂不支持此分类'}><strong>{group.label}</strong><small>{group.english}</small>{!available && <small>暂不支持</small>}</button>
    })}</div>}
    {group && !type && <div className="craft-base-options" role="group" aria-label={`${group.label} Base 类型`}>{types.map(type => <button type="button" key={type.id} onClick={() => { setTypeId(type.id); setItemId(''); setSearch('') }}><strong>{type.label}</strong><small>{type.bases.length} 件基底</small></button>)}</div>}
    {type && !item && <>
      <div className="craft-base-search"><label htmlFor="craft-new-base-search">搜索 Item 基底</label><input id="craft-new-base-search" className="forge-textarea" value={search} onChange={event => setSearch(event.target.value)} placeholder="搜索中英文名称…" /><span role="status">{visible.length} 件</span></div>
      <div className="craft-base-items" role="group" aria-label={`${type.label} Item 基底`}>{visible.map(base => {
        const detail = details[base.id]
        return <button type="button" className="craft-base-item" key={base.id} onClick={() => { setItemId(base.id); setSockets(0) }}>
          <span className="craft-base-art" aria-hidden="true">{detail?.icon ? <img src={detail.icon} alt="" loading="lazy" draggable={false} /> : <Package />}</span>
          <span className="craft-base-item-info"><strong>{baseDisplayName(base)}</strong>{baseDisplayName(base) !== base.name && <small>{base.name}</small>}<span className="craft-base-properties">{detail?.properties.map(property => <span key={property.label}>{property.label}<b>{property.value}</b></span>)}</span>{detail && <span className="craft-base-required">需求等级：{detail.level}</span>}</span>
        </button>
      })}</div>
      {!visible.length && <p className="craft-empty">没有匹配的基底，请尝试其他名称。</p>}
    </>}
    {item && <div className="craft-base-level-step">
      <div className="craft-base-selection"><Check aria-hidden="true" /><strong>{baseDisplayName(item)}</strong><span>{type?.label}</span></div>
      <fieldset className="craft-base-settings"><legend>物品等级 <small>Item Level</small><strong>{level}</strong></legend><div className="craft-base-levels" role="group" aria-label="Item Level">{levels.map(value => <button type="button" key={value} onClick={() => setLevel(value)} aria-pressed={level === value} aria-label={`物品等级 ${value}`}>{value}</button>)}</div></fieldset>
      <fieldset className="craft-base-settings"><legend>物品品质 <small>Item Quality</small><strong>{quality}%</strong></legend><div className="craft-base-levels" role="group" aria-label="Item Quality">{Array.from({ length: 31 }, (_, value) => <button type="button" key={value} onClick={() => setQuality(value)} aria-pressed={quality === value} aria-label={`物品品质 ${value}%`}>{value}</button>)}</div></fieldset>
      <fieldset className="craft-base-settings"><legend>物品插槽 <small>Item Sockets</small><strong>{sockets}</strong></legend><div className="craft-base-levels" role="group" aria-label="Item Sockets">{Array.from({ length: baseSocketLimit(item) + 1 }, (_, value) => <button type="button" key={value} onClick={() => setSockets(value)} aria-pressed={sockets === value} aria-label={`物品插槽 ${value}`}>{value}</button>)}</div>{!baseSocketLimit(item) && <p>此底材不支持符文插槽。</p>}</fieldset>
      <footer className="craft-base-create"><p>普通基底 · 物等 {level} · 品质 {quality}% · {sockets} 个插槽</p><Button onClick={() => onCreate(item.id, { level, quality, sockets })}>创建项目<ChevronRight aria-hidden="true" /></Button></footer>
    </div>}
  </div>
}
