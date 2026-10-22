import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Check, ChevronDown, CircleDot, Copy, Crosshair, FlaskConical, Gem, History, Import, LockKeyhole, Search, Sparkles, Undo2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { applyCurrency, candidates, currencies, currencyError, currentItem, modTier, omens, optionsError, rarityLabels, tieredCurrencies, minimumModLevel, type CraftData, type CraftMod, type CraftOptions, type CraftSession, type Currency, type OmenId } from '@/lib/crafting'
import { modDisplayRanges } from '@/lib/crafting-localization'
import { equipmentDisplayName, currencyTypeName, consumableDisplayName, omenDisplayName, localizedCraftAction } from '@/lib/crafting-names'
import { craftingClipboardText } from '@/lib/crafting-clipboard'
import { affixDisplayLines, affixDisplayName, sortEssences, type AffixLanguage } from '@/lib/crafting-presentation'
import { CraftingConsumableButton } from '@/components/crafting-consumable-button'
import { craftingIconKey, craftingIcons, omenIconKey } from '@/lib/crafting-icons'

function ItemIcon({ iconKey, tier = '' }: { iconKey: string; tier?: string }) {
  const icon = craftingIcons[iconKey]
  return <span className="craft-currency-icon" aria-hidden="true"><img src={icon.src} alt="" draggable={false} />{tier && <small>{tier === 'greater' ? 'II' : 'III'}</small>}</span>
}
function CurrencyIcon({ id, tier = '', essenceId, itemClass }: { id: Currency | 'omens'; tier?: '' | 'greater' | 'perfect'; essenceId?: string; itemClass?: string }) {
  return <ItemIcon iconKey={craftingIconKey(id, { tier: tier || undefined, essenceId }, itemClass)} tier={tier} />
}
const seriesKey = (mod: CraftMod) => `${mod.kind}:${mod.type}:${mod.stats.map(stat => stat.id).sort().join(',')}`

// Overlapping grid cells reserve the tallest panel at the current width.
// Inactive panels still participate in layout, but cannot be seen or focused.
function StablePanels({ active, label, panels }: { active: string; label: string; panels: { id: string; content: ReactNode }[] }) {
  return <div className="craft-stable-panels" aria-label={label}>{panels.map(panel => <div key={panel.id} className={active === panel.id ? '' : 'is-inactive'} aria-hidden={active !== panel.id} inert={active !== panel.id}>{panel.content}</div>)}</div>
}

interface Props {
  data: CraftData
  session: CraftSession
  onChange: (session: CraftSession) => void
  onImport: () => void
  onNotice: (message: string) => void
  onError: (message: string) => void
}

export function CraftingWorkbenchHeading({ onImport, children, disabled = false }: { onImport: () => void; children?: ReactNode; disabled?: boolean }) {
  return <div className="craft-station-heading"><div><FlaskConical aria-hidden="true" /><span>装备工作台</span><small>CRAFTING BENCH</small></div><div>{children}<Button variant="ghost" size="sm" disabled={disabled} onClick={onImport}><Import />导入 / 更换底材</Button></div></div>
}

export function CraftingWorkbench({ data, session, onChange, onImport, onNotice, onError }: Props) {
  const [currency, setCurrency] = useState<Currency>('regal')
  const [language, setLanguage] = useState<AffixLanguage>('zh-CN')
  const modDisplayName = (mod: CraftMod) => affixDisplayName(mod, language)
  const modLines = (mod: CraftMod, values: number[]) => affixDisplayLines(mod, values, language)
  const [selectedOmens, setSelectedOmens] = useState<OmenId[]>([])
  const [tier, setTier] = useState<'' | 'greater' | 'perfect'>('')
  const [essenceId, setEssenceId] = useState('')
  const [corruption, setCorruption] = useState<NonNullable<CraftOptions['corruption']>>('unchanged')
  const [showOmens, setShowOmens] = useState(false)
  const [armed, setArmed] = useState(false)
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null)
  useEffect(() => {
    if (!armed) return
    const move = (event: PointerEvent) => setPointer({ x: event.clientX, y: event.clientY })
    const cancel = () => { setArmed(false); setPointer(null) }
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') cancel() }
    const context = (event: MouseEvent) => { event.preventDefault(); cancel() }
    const leave = () => setPointer(null)
    window.addEventListener('pointermove', move); window.addEventListener('keydown', key); window.addEventListener('contextmenu', context); window.addEventListener('blur', cancel); document.addEventListener('pointerleave', leave)
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('keydown', key); window.removeEventListener('contextmenu', context); window.removeEventListener('blur', cancel); document.removeEventListener('pointerleave', leave) }
  }, [armed])
  const [poolSource, setPoolSource] = useState('ordinary')
  const [poolKind, setPoolKind] = useState('prefix')
  const [modSearch, setModSearch] = useState('')
  const [availableOnly, setAvailableOnly] = useState(false)
  const [activityTab, setActivityTab] = useState('history')
  const [historyIndex, setHistoryIndex] = useState<number | null>(null)
  const liveItem = currentItem(session)
  const item = historyIndex === null ? liveItem : session.steps[historyIndex]?.item ?? session.original
  const base = data.bases.find(base => base.id === item.baseId)!
  const baseDisplayName = () => equipmentDisplayName(base, language)
  const craftActionLabel = (action: Currency, settings: CraftOptions = {}) => localizedCraftAction(action, settings, language, base.itemClass)
  const essenceName = (id?: string) => id ? consumableDisplayName(`essence:${id}`, language) : currencyTypeName('essence', language)
  const activeOmens = selectedOmens.filter(id => omens.find(omen => omen.id === id)?.currency === currency)
  const selectedEssence = essenceId || data.essences?.find(entry => base.essenceMods?.[entry.id])?.id
  const options: CraftOptions = { omens: activeOmens, ...(tieredCurrencies.includes(currency) && tier ? { tier } : {}), ...(currency === 'essence' ? { essenceId: selectedEssence } : {}), ...(currency === 'vaal' ? { corruption } : {}) }
  // Regal uses rare-item capacity after upgrading; transmutation starts at magic capacity.
  const previewItem = currency === 'regal' ? { ...item, rarity: 'rare' as const } : currency === 'transmute' ? { ...item, rarity: 'magic' as const } : item
  const pool = candidates(previewItem, data, options, minimumModLevel(currency, options))
  const weights = new Map(pool.map(entry => [entry.mod.id, entry.weight]))
  const totalWeight = pool.reduce((sum, entry) => sum + entry.weight, 0)
  const visibleModIds = poolSource === 'desecrated' ? base.desecratedModIds ?? [] : base.modIds
  const targets = session.targets ?? []
  const cap = item.rarity === 'normal' ? 0 : item.rarity === 'magic' ? 1 : 3
  const relevantOmens = omens
  const availableEssences = sortEssences(data.essences?.filter(essence => base.essenceMods?.[essence.id]) ?? [])
  const reason = historyIndex !== null ? '正在回看历史，请先返回当前进度。' : session.steps.length + (currency === 'desecrate' ? 3 : currency === 'reveal' ? 2 : 1) > 200 ? '剩余步骤不足以完成此工艺，请撤销部分步骤或导入其他物品。' : currencyError(item, currency, data, options)
  const targetHit = (id: string) => item.affixes.some(affix => {
    const actual = data.mods[affix.modId!]!
    return seriesKey(actual) === seriesKey(data.mods[id]) && modTier(base, actual, data) <= modTier(base, data.mods[id], data)
  })
  const groups = useMemo(() => {
    const map = new Map<string, CraftMod[]>()
    for (const id of visibleModIds) {
      const mod = data.mods[id]
      if (mod.kind !== poolKind) continue
      if (modSearch && !`${modDisplayName(mod)} ${mod.name} ${mod.text} ${modLines(mod, mod.stats.map(stat => stat.max)).join(' ')}`.toLowerCase().includes(modSearch.toLowerCase())) continue
      if (availableOnly && (poolSource === 'ordinary' ? !weights.has(id) : mod.level > item.itemLevel || item.affixes.some(affix => data.mods[affix.modId!]!.groups.some(group => mod.groups.includes(group))))) continue
      const key = seriesKey(mod)
      map.set(key, [...(map.get(key) ?? []), mod])
    }
    return [...map.entries()].map(([key, mods]) => ({ key, mods: mods.sort((a, b) => modTier(base, a, data) - modTier(base, b, data)) }))
  }, [base, data, poolKind, poolSource, modSearch, availableOnly, item, currency, selectedOmens, tier, language])

  function useCurrency(action: Currency = currency, override: CraftOptions = options) {
    try {
      const next = applyCurrency(liveItem, action, data, Math.random, override)
      onChange({ ...session, steps: [...session.steps, { currency: action, ...override, item: next }] })
      setArmed(false); setPointer(null)
      setSelectedOmens(selectedOmens.filter(id => !activeOmens.includes(id) || action !== currency))
      onError(''); onNotice(`已使用${craftActionLabel(action, override)}。`)
    } catch (error) { onError((error as Error).message) }
  }
  function toggleTarget(mod: CraftMod) {
    const next = targets.filter(id => seriesKey(data.mods[id]) !== seriesKey(mod))
    if (!targets.includes(mod.id)) next.push(mod.id)
    onChange({ ...session, targets: next })
  }
  const costEntries = [...session.steps.reduce((map, step) => {
    if (!['reveal', 'select-reveal'].includes(step.currency)) {
      const name = step.currency === 'essence' ? essenceName(step.essenceId) : craftActionLabel(step.currency, { tier: step.tier })
      map.set(name, (map.get(name) ?? 0) + 1)
    }
    for (const id of step.omens ?? []) { const name = omenDisplayName(id, language); map.set(name, (map.get(name) ?? 0) + 1) }
    return map
  }, new Map<string, number>())].map(([name, count]) => ({ id: name, name, count }))
  function armCurrency(event: React.MouseEvent, nextCurrency: Currency = currency, nextTier: typeof tier = tier, nextEssence = essenceId) {
    setCurrency(nextCurrency); setTier(nextTier); setEssenceId(nextEssence)
    setArmed(true); setPointer({ x: event.clientX, y: event.clientY }); onError('')
  }
  function applySelected() {
    if (!armed) return
    setArmed(false); setPointer(null)
    if (reason) { onError(reason); return }
    useCurrency()
  }
  function toggleOmen(id: OmenId) {
    const omen = omens.find(entry => entry.id === id)!
    if (selectedOmens.includes(id)) { setSelectedOmens(selectedOmens.filter(entry => entry !== id)); return }
    const conflict = optionsError(omen.currency, { omens: [...selectedOmens.filter(entry => omens.find(candidate => candidate.id === entry)!.currency === omen.currency), id] })
    if (conflict) { onError(conflict); return }
    setSelectedOmens([...selectedOmens, id]); onError('')
  }

  return <div className="craft-station">
    <CraftingWorkbenchHeading onImport={() => { setArmed(false); onImport() }}><div className="craft-language-switch" role="group" aria-label="物品语言">{([{ id: 'zh-CN', label: '简中' }, { id: 'zh-TW', label: '繁中' }, { id: 'en', label: 'English' }] as const).map(entry => <button key={entry.id} type="button" aria-pressed={language === entry.id} onClick={() => setLanguage(entry.id)}>{entry.label}</button>)}</div></CraftingWorkbenchHeading>
    <div className="craft-currency-types" role="group" aria-label="通货类型">
      {currencies.filter(entry => !['reveal', 'select-reveal'].includes(entry.id)).map(entry => <CraftingConsumableButton iconKey={craftingIconKey(entry.id, {}, base.itemClass)} tooltipName={currencyTypeName(entry.id, language)} type="button" key={entry.id} aria-pressed={!showOmens && currency === entry.id} onClick={event => { setShowOmens(false); setCurrency(entry.id); setTier(''); setArmed(false); setPointer(null); if (!tieredCurrencies.includes(entry.id) && entry.id !== 'essence') armCurrency(event, entry.id, '') }}><CurrencyIcon id={entry.id} itemClass={base.itemClass} /><span>{currencyTypeName(entry.id, language)}</span></CraftingConsumableButton>)}
      <button type="button" aria-pressed={showOmens} onClick={() => { setShowOmens(true); setArmed(false); setPointer(null) }}><CurrencyIcon id="omens" /><span>{currencyTypeName('omens', language)}</span></button>
    </div>
    <StablePanels active={showOmens ? 'omens' : currency} label="通货列表" panels={[
      ...currencies.filter(entry => !['reveal', 'select-reveal'].includes(entry.id)).map(entry => ({ id: entry.id, content: <div className="craft-currency-variants" role="group" aria-label="选择具体通货">
        <strong>{currencyTypeName(entry.id, language)}</strong>
        {entry.id === 'essence' ? availableEssences.map(essence => <CraftingConsumableButton iconKey={craftingIconKey('essence', { essenceId: essence.id })} tooltipName={essenceName(essence.id)} type="button" key={essence.id} aria-pressed={selectedEssence === essence.id} onClick={event => armCurrency(event, 'essence', '', essence.id)}><CurrencyIcon id="essence" essenceId={essence.id} />{essenceName(essence.id)}</CraftingConsumableButton>) : (tieredCurrencies.includes(entry.id) ? ['', 'greater', 'perfect'] as const : [''] as const).map(grade => <CraftingConsumableButton iconKey={craftingIconKey(entry.id, { tier: grade || undefined }, base.itemClass)} tooltipName={craftActionLabel(entry.id, { tier: grade || undefined })} type="button" key={grade} aria-pressed={tier === grade} onClick={event => armCurrency(event, entry.id, grade)}><CurrencyIcon id={entry.id} tier={grade} itemClass={base.itemClass} />{craftActionLabel(entry.id, { tier: grade || undefined })}</CraftingConsumableButton>)}
        {entry.id === 'vaal' && <label className="craft-corruption-select">推演腐化结果<select aria-label="推演腐化结果" value={corruption} onChange={event => setCorruption(event.target.value as typeof corruption)}><option value="unchanged">无变化，仅标记腐化</option><option value="implicit">添加腐化附魔</option><option value="reroll">重铸为 4–6 词缀稀有物品</option><option value="socket">增加一个符文插槽</option></select></label>}
      </div> })),
      { id: 'omens', content: <div className="craft-currency-variants" role="group" aria-label="选择预兆"><strong>{currencyTypeName('omens', language)}</strong>{relevantOmens.map(omen => <CraftingConsumableButton iconKey={omenIconKey(omen.id)} tooltipName={omenDisplayName(omen.id, language)} type="button" key={omen.id} aria-pressed={selectedOmens.includes(omen.id)} onClick={() => toggleOmen(omen.id)}><ItemIcon iconKey={omenIconKey(omen.id)} />{omenDisplayName(omen.id, language)}</CraftingConsumableButton>)}</div> },
    ]} />
    <div className="craft-enabled-items" aria-label="已启用物品"><strong><Sparkles />已启用</strong>{selectedOmens.length ? selectedOmens.map(id => { const omen = omens.find(entry => entry.id === id)!; return <CraftingConsumableButton iconKey={omenIconKey(id)} tooltipName={omenDisplayName(omen.id, language)} type="button" key={id} className={omen.currency === currency ? 'is-active' : ''} onClick={() => toggleOmen(id)}><ItemIcon iconKey={omenIconKey(id)} />{omenDisplayName(omen.id, language)}<X /></CraftingConsumableButton> }) : <span>尚未启用预兆</span>}<small>匹配通货使用后消耗</small></div>
    <div className="craft-station-grid">
      <div className="craft-project-column">
        <div className="craft-column-title"><Gem aria-hidden="true" /><span>当前物品</span><small>{historyIndex === null ? '实时结果' : `回看第 ${historyIndex + 1} 步`}</small></div>
        {historyIndex !== null && <Button variant="outline" size="sm" className="craft-return-live" onClick={() => setHistoryIndex(null)}>返回当前进度</Button>}
        {item.pendingDesecration && <div className="craft-reveal-panel"><strong>未揭示的亵渎{item.pendingDesecration.kind === 'prefix' ? '前缀' : '后缀'} · 占用 1 个位置</strong>{item.pendingDesecration.choices ? <div>{item.pendingDesecration.choices.map((affix, index) => <Button variant="outline" key={affix.modId} disabled={historyIndex !== null || session.steps.length >= 200} onClick={() => useCurrency('select-reveal', { revealIndex: index })}>{modLines(data.mods[affix.modId!], affix.values).join(' / ')}</Button>)}</div> : <Button disabled={historyIndex !== null || session.steps.length >= 199 || !!currencyError(liveItem, 'reveal', data)} onClick={() => useCurrency('reveal', {})}>揭示三个选项</Button>}</div>}
        <article className={`craft-item-card craft-rarity-${item.rarity} ${armed ? 'is-currency-target' : ''}`} role="button" tabIndex={0} aria-label={armed ? `对当前物品使用${currencyTypeName(currency, language)}` : '当前装备，先选择通货再点击使用'} aria-disabled={!armed || !!reason} onClick={applySelected} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); applySelected() } }}>
          <header><span>{rarityLabels[item.rarity]} · 物品等级 {item.itemLevel}{item.corrupted ? ' · 已腐化' : ''}</span><h2 title={base.name}>{baseDisplayName()}</h2><p>导入名称：{item.name}</p></header>
          {item.corruptionImplicit && <div className="craft-corruption-result"><strong>腐化附魔</strong>{modLines(data.mods[item.corruptionImplicit.modId!], item.corruptionImplicit.values).map((line, i) => <p key={i}>{line}</p>)}</div>}{item.extraSocket && <p className="craft-corruption-result">腐化：额外增加 1 个符文插槽</p>}
          <div className="craft-affix-count"><span>前缀 {item.affixes.filter(affix => affix.kind === 'prefix').length + (item.pendingDesecration?.kind === 'prefix' ? 1 : 0)}/{cap}</span><span>后缀 {item.affixes.filter(affix => affix.kind === 'suffix').length + (item.pendingDesecration?.kind === 'suffix' ? 1 : 0)}/{cap}</span></div>
          <div className="craft-affix-list">{(['prefix', 'suffix'] as const).map(kind => <div className="craft-slot-group" key={kind}>{item.affixes.filter(affix => affix.kind === kind).map(affix => {
            const mod = data.mods[affix.modId!]!
            return <div className={`craft-affix craft-${kind} ${affix.fractured ? 'is-fractured' : ''}`} key={mod.id}><div><span title={mod.name}>{affix.fractured && <LockKeyhole aria-label="破裂词缀" />}{item.desecratedModId === affix.modId ? '亵渎 · ' : ''}{kind === 'prefix' ? '前缀' : '后缀'} · {modDisplayName(mod)}</span><span>T{modTier(base, mod, data)}</span></div>{modLines(mod, affix.values).map((line, i) => <p key={i}>{line}</p>)}<small>范围 {modDisplayRanges(mod)} · 物等 {mod.level}</small></div>
          })}{Array.from({ length: Math.max(0, cap - item.affixes.filter(affix => affix.kind === kind).length - (item.pendingDesecration?.kind === kind ? 1 : 0)) }, (_, index) => <div className={`craft-empty-slot slot-${kind}`} key={index}><span>＋</span>空{kind === 'prefix' ? '前缀' : '后缀'}位置</div>)}</div>)}{item.rarity === 'normal' && <p className="craft-empty">普通底材 · 使用蜕变石或点金石开始做装</p>}</div>
        </article>
        <div className="craft-item-actions"><Button variant="ghost" size="sm" onClick={async () => {
          try {
            const result = craftingClipboardText(item, data, language)
            if (!result.complete) { onError('物品含未识别内容，无法生成完整物品文本。'); return }
            await navigator.clipboard.writeText(result.text); onError(''); onNotice(`已复制${language === 'en' ? '英文' : language === 'zh-TW' ? '繁中' : '简中'}物品文本。`)
          } catch { onError('无法访问剪贴板。') }
        }}><Copy />复制物品</Button></div>

      </div>
      <div className="craft-mods-column"><div className="craft-column-title"><Search aria-hidden="true" /><span>词缀池</span><small>{visibleModIds.length} 个档位</small></div><div className="craft-affix-tabs" role="group" aria-label="词缀来源"><button type="button" aria-pressed={poolSource === 'ordinary'} onClick={() => setPoolSource('ordinary')}>普通词缀</button><button type="button" aria-pressed={poolSource === 'desecrated'} onClick={() => setPoolSource('desecrated')}>亵渎词缀</button></div><div className="craft-mod-search"><Search aria-hidden="true" /><input aria-label="搜索可添加词缀" placeholder="搜索属性或词缀名称…" value={modSearch} onChange={event => setModSearch(event.target.value)} />{modSearch && <button type="button" aria-label="清空词缀搜索" onClick={() => setModSearch('')}><X /></button>}</div><div className="craft-affix-tabs" role="group" aria-label="词缀类型"><button type="button" aria-pressed={poolKind === 'prefix'} className="pool-prefix" onClick={() => setPoolKind('prefix')}>前缀 <span>{visibleModIds.filter(id => data.mods[id].kind === 'prefix').length}</span></button><button type="button" aria-pressed={poolKind === 'suffix'} className="pool-suffix" onClick={() => setPoolKind('suffix')}>后缀 <span>{visibleModIds.filter(id => data.mods[id].kind === 'suffix').length}</span></button></div><div className="craft-pool-caption"><label><input type="checkbox" checked={availableOnly} onChange={event => setAvailableOnly(event.target.checked)} />仅看可添加</label><small>点靶心设为目标</small></div>
        <div className="craft-mod-families">{groups.map(group => {
          const representative = group.mods.find(mod => weights.has(mod.id)) ?? group.mods[0]
          return <details className="craft-mod-family" key={group.key}><summary><ChevronDown aria-hidden="true" /><span>{modLines(representative, representative.stats.map(stat => stat.max)).join(' / ')}</span><small>{group.mods.length} 档</small>{group.mods.some(mod => targets.includes(mod.id)) && <Crosshair className="is-target" aria-label="已设目标" />}</summary><div className="craft-mod-ranks"><div className="craft-mod-rank-head"><span>阶级 / 词缀</span><span>物等</span><span>普通池参考</span><span>目标</span></div>{group.mods.map(mod => {
            const currentWeight = poolSource === 'ordinary' ? weights.get(mod.id) : undefined
            const conflict = item.affixes.some(affix => data.mods[affix.modId!]!.groups.some(group => mod.groups.includes(group)))
            const status = mod.level > item.itemLevel ? '物等不足' : conflict ? '词缀互斥' : !currentWeight && poolSource === 'ordinary' ? '当前不可添加' : ''
            return <div key={mod.id} className={`craft-mod-rank ${status ? 'is-blocked' : ''} ${targets.includes(mod.id) ? 'is-target' : ''}`}><div><span title={mod.name}>T{modTier(base, mod, data)} · {modDisplayName(mod)}</span><small>{modLines(mod, mod.stats.map(stat => stat.max)).join(' / ')}</small>{status && <em>{status}</em>}</div><span>{mod.level}</span><span title={currentWeight ? `权重 ${currentWeight} / ${totalWeight}` : status}>{currentWeight && totalWeight ? `${(currentWeight / totalWeight * 100).toFixed(2)}%` : '—'}</span><button type="button" className="craft-target-toggle" disabled={poolSource !== 'ordinary'} title={poolSource !== 'ordinary' ? '亵渎词缀仅供查看' : undefined} aria-label={`${targets.includes(mod.id) ? '取消' : '设置'}目标：T${modTier(base, mod, data)} ${modDisplayName(mod)}`} aria-pressed={targets.includes(mod.id)} onClick={() => toggleTarget(mod)}><Crosshair /></button></div>
          })}</div></details>
        })}{!groups.length && <p className="craft-empty">没有符合条件的词缀。</p>}</div>
        <p className="craft-pool-explanation">{poolSource === 'desecrated' ? '显示当前底材的特殊亵渎词缀。揭示选项还包含普通词缀；未核实实际权重，不显示命中概率。' : ['transmute', 'augment', 'regal', 'exalt', 'alchemy'].includes(currency) ? '概率是当前添加一条词缀时的相对权重。多次添加会在每次之后重新计算。' : '显示当前物品的普通词缀池；移除词缀后，互斥组和概率会重新计算。'}</p>
      </div>
      <aside className="craft-activity-column" aria-label="做装记录"><div className="craft-column-title"><History aria-hidden="true" /><span>做装记录</span><small>{session.steps.length} 步</small><Button variant="ghost" size="sm" disabled={!session.steps.length} onClick={() => { onChange({ ...session, steps: session.steps.slice(0, -1) }); setHistoryIndex(null); setArmed(false); setPointer(null); onNotice('已撤销上一步，返还通货与征兆。') }}><Undo2 />撤销</Button></div><div className="craft-activity-tabs" role="group" aria-label="记录视图"><button type="button" aria-pressed={activityTab === 'history'} onClick={() => setActivityTab('history')}>历史</button><button type="button" aria-pressed={activityTab === 'cost'} onClick={() => setActivityTab('cost')}>消耗</button></div>
        {activityTab === 'history' ? <div className="craft-step-list">{session.steps.map((step, index) => ({ step, index })).reverse().map(({ step, index }) => {
          const previous = index ? session.steps[index - 1].item : session.original
          const added = step.item.affixes.filter(affix => !previous.affixes.some(old => old.modId === affix.modId))
          const removed = previous.affixes.filter(affix => !step.item.affixes.some(next => next.modId === affix.modId))
          return <button type="button" key={index} className={historyIndex === index ? 'is-selected' : ''} onClick={() => { setArmed(false); setPointer(null); setHistoryIndex(historyIndex === index ? null : index) }} aria-label={`查看第 ${index + 1} 步：${craftActionLabel(step.currency, step)}`}><span className="craft-step-number">{String(index + 1).padStart(2, '0')}</span><div><strong>{step.currency === 'essence' ? essenceName(step.essenceId) : craftActionLabel(step.currency, { tier: step.tier })}</strong>{step.omens?.map(id => <small className="craft-step-omen" key={id}>{omenDisplayName(id, language)}</small>)}{added.map(affix => <small className="craft-step-added" key={affix.modId}>＋{modDisplayName(data.mods[affix.modId!])}</small>)}{removed.map(affix => <small className="craft-step-removed" key={affix.modId}>−{modDisplayName(data.mods[affix.modId!])}</small>)}{!added.length && !removed.length && <small>{step.currency === 'fracture' ? '随机锁定一条词缀' : '词缀数值或状态更新'}</small>}</div><span className="craft-step-size">{step.item.affixes.length} 词缀</span></button>
        })}{!session.steps.length && <div className="craft-activity-empty"><History /><p>你的下一步，从这里开始</p><small>选择通货并使用后，记录会出现在这里。点击记录可回看物品。</small></div>}</div> : <div className="craft-cost-list">{costEntries.map(entry => <div key={entry.id}><span>{entry.name}</span><strong>×{entry.count}</strong></div>)}{!costEntries.length && <p className="craft-empty">尚未消耗通货</p>}<footer><span>累计消耗</span><strong>{costEntries.reduce((sum, entry) => sum + entry.count, 0)} 件</strong></footer><p>按数量记录，未接入市场价格。</p></div>}
        <div className="craft-targets-panel"><div><Crosshair /><h3>目标词缀</h3><span>{targets.filter(targetHit).length}/{targets.length}</span></div>{targets.length ? targets.map(id => <div className={`craft-target-row ${targetHit(id) ? 'is-hit' : ''}`} key={id}>{targetHit(id) ? <Check /> : <CircleDot />}<span>{modDisplayName(data.mods[id])}<small>T{modTier(base, data.mods[id], data)} 或更高</small></span><button type="button" aria-label={`移除目标：${modDisplayName(data.mods[id])}`} onClick={() => onChange({ ...session, targets: targets.filter(target => target !== id) })}><X /></button></div>) : <p>展开词缀系列，点击靶心选择目标。目标只用于追踪，不改变随机结果。</p>}</div>
      </aside>
    </div>
    {armed && pointer && <div className="craft-held-currency" style={{ left: pointer.x + 12, top: pointer.y + 12 }} aria-hidden="true"><CurrencyIcon id={currency} tier={tier} essenceId={selectedEssence} itemClass={base.itemClass} /><span>{currency === 'essence' ? essenceName(selectedEssence) : craftActionLabel(currency, options)}</span></div>}
    <footer className="craft-station-footer"><span><Check aria-hidden="true" />进度自动保存至本机</span><span>已启用：分阶通货 · 精华 · 亵渎揭示 · 腐化分支推演 · 征兆 · 破裂</span></footer>
  </div>
}
