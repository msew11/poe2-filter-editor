import { useMemo, useState } from 'react'
import { Check, ChevronDown, CircleDot, Copy, Crosshair, FlaskConical, Gem, History, Import, LockKeyhole, RotateCcw, Search, Sparkles, Undo2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { applyCurrency, candidates, craftActionLabel, currencies, currencyError, currentItem, modLines, modTier, omens, optionsError, rarityLabels, tieredCurrencies, minimumModLevel, type CraftData, type CraftMod, type CraftOptions, type CraftSession, type Currency, type OmenId } from '@/lib/crafting'
import { baseDisplayName, modDisplayName, modDisplayRanges } from '@/lib/crafting-localization'

const currencyGlyphs: Record<Currency, string> = { transmute: '蜕', augment: '增', regal: '富', alchemy: '金', exalt: '崇', chaos: '混', annul: '剥', divine: '神', fracture: '裂', essence: '精', desecrate: '渎', reveal: '揭', 'select-reveal': '选', vaal: '瓦' }
const seriesKey = (mod: CraftMod) => `${mod.kind}:${mod.type}:${mod.stats.map(stat => stat.id).sort().join(',')}`

interface Props {
  data: CraftData
  session: CraftSession
  onChange: (session: CraftSession) => void
  onImport: () => void
  onNotice: (message: string) => void
  onError: (message: string) => void
}

export function CraftingWorkbench({ data, session, onChange, onImport, onNotice, onError }: Props) {
  const [currency, setCurrency] = useState<Currency>('regal')
  const [selectedOmens, setSelectedOmens] = useState<OmenId[]>([])
  const [tier, setTier] = useState<'' | 'greater' | 'perfect'>('')
  const [essenceId, setEssenceId] = useState('')
  const [corruption, setCorruption] = useState<NonNullable<CraftOptions['corruption']>>('unchanged')
  const [method, setMethod] = useState('currency')
  const [poolSource, setPoolSource] = useState('ordinary')
  const [poolKind, setPoolKind] = useState('prefix')
  const [modSearch, setModSearch] = useState('')
  const [availableOnly, setAvailableOnly] = useState(false)
  const [activityTab, setActivityTab] = useState('history')
  const [historyIndex, setHistoryIndex] = useState<number | null>(null)
  const liveItem = currentItem(session)
  const item = historyIndex === null ? liveItem : session.steps[historyIndex]?.item ?? session.original
  const base = data.bases.find(base => base.id === item.baseId)!
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
  const relevantOmens = omens.filter(omen => omen.currency === currency)
  const selectedDefinition = currencies.find(entry => entry.id === currency)!
  const reason = historyIndex !== null ? '正在回看历史，请先返回当前进度。' : session.steps.length + (currency === 'desecrate' ? 3 : currency === 'reveal' ? 2 : 1) > 200 ? '剩余步骤不足以完成此工艺，请撤销部分步骤或重置。' : currencyError(item, currency, data, options)
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
  }, [base, data, poolKind, poolSource, modSearch, availableOnly, item, currency, selectedOmens, tier])

  function useCurrency(action: Currency = currency, override: CraftOptions = options) {
    try {
      const next = applyCurrency(liveItem, action, data, Math.random, override)
      onChange({ ...session, steps: [...session.steps, { currency: action, ...override, item: next }] })
      setSelectedOmens([])
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
      const name = step.currency === 'essence' ? data.essences?.find(entry => entry.id === step.essenceId)?.name ?? '精华' : craftActionLabel(step.currency, { tier: step.tier })
      map.set(name, (map.get(name) ?? 0) + 1)
    }
    for (const id of step.omens ?? []) { const name = omens.find(entry => entry.id === id)!.name; map.set(name, (map.get(name) ?? 0) + 1) }
    return map
  }, new Map<string, number>())].map(([name, count]) => ({ id: name, name, count }))
  const methods = [
    { id: 'currency', label: '基础通货', icon: CircleDot, currency: 'regal' },
    { id: 'omens', label: '征兆组合', icon: Sparkles, currency: 'exalt' },
    { id: 'fracture', label: '破裂锁定', icon: LockKeyhole, currency: 'fracture' },
    { id: 'essence', label: '精华', icon: Gem, currency: 'essence' },
    { id: 'desecrate', label: '亵渎揭示', icon: Sparkles, currency: 'desecrate' },
    { id: 'vaal', label: '腐化', icon: CircleDot, currency: 'vaal' },
  ]
  const selectMethod = (id: string) => { setMethod(id); setCurrency(methods.find(entry => entry.id === id)!.currency as Currency); setSelectedOmens([]) }

  return <div className="craft-station">
    <div className="craft-station-heading"><div><FlaskConical aria-hidden="true" /><span>装备工作台</span><small>CRAFTING BENCH</small></div><div><Button variant="ghost" size="sm" onClick={onImport}><Import />导入 / 更换底材</Button><Button variant="ghost" size="sm" disabled={!session.steps.length} onClick={() => { onChange({ ...session, steps: [] }); setHistoryIndex(null); setSelectedOmens([]); onNotice('已恢复导入状态，消耗记录已清空。') }}><RotateCcw />重置</Button></div></div>
    <div className="craft-method-tabs" role="tablist" aria-label="做装方式">{methods.map(({ id, label, icon: Icon }) => <button key={id} id={`craft-method-${id}`} type="button" role="tab" aria-selected={method === id} aria-controls="craft-method-body" tabIndex={method === id ? 0 : -1} onKeyDown={event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
      event.preventDefault(); const index = methods.findIndex(entry => entry.id === id)
      const next = event.key === 'Home' ? methods[0] : event.key === 'End' ? methods.at(-1)! : methods[(index + (event.key === 'ArrowRight' ? 1 : methods.length - 1)) % methods.length]
      selectMethod(next.id); document.getElementById(`craft-method-${next.id}`)?.focus()
    }} onClick={() => selectMethod(id)}><Icon aria-hidden="true" />{label}</button>)}</div>
    <div id="craft-method-body" role="tabpanel" aria-labelledby={`craft-method-${method}`}>
      <div className="craft-orb-strip" aria-label="选择通货">{currencies.filter(entry => method === 'desecrate' ? ['desecrate', 'reveal'].includes(entry.id) : method === 'essence' || method === 'vaal' || method === 'fracture' ? entry.id === method : method === 'omens' ? omens.some(omen => omen.currency === entry.id) && !['essence', 'desecrate'].includes(entry.id) : !['fracture', 'essence', 'desecrate', 'reveal', 'select-reveal', 'vaal'].includes(entry.id)).map(entry => {
        const disabledReason = currencyError(liveItem, entry.id, data, entry.id === currency ? options : {})
        return <button type="button" key={entry.id} className={`craft-orb ${currency === entry.id ? 'is-selected' : ''} ${disabledReason ? 'is-unavailable' : ''}`} aria-pressed={currency === entry.id} aria-label={`选择${entry.name}`} onClick={() => { setCurrency(entry.id); setSelectedOmens([]) }} title={`${entry.help}${disabledReason ? ` · ${disabledReason}` : ''}`}><span className={`craft-orb-medallion orb-${entry.id}`} aria-hidden="true">{currencyGlyphs[entry.id]}</span><span>{entry.name}</span><small>×{session.steps.filter(step => step.currency === entry.id).length}</small></button>
      })}</div>
      {tieredCurrencies.includes(currency) && <div className="craft-advanced-settings"><label>通货阶级<select aria-label="通货阶级" value={tier} onChange={event => setTier(event.target.value as typeof tier)}><option value="">普通</option><option value="greater">高阶</option><option value="perfect">完美</option></select></label><p>新词缀最低需求等级：{minimumModLevel(currency, options)}。已存在词缀不受影响。</p></div>}
      {currency === 'essence' && <div className="craft-advanced-settings"><label>选择精华<select aria-label="选择精华" value={selectedEssence} onChange={event => { setEssenceId(event.target.value); setSelectedOmens([]) }}>{data.essences?.filter(entry => base.essenceMods?.[entry.id]).map(entry => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label><div>{base.essenceMods?.[selectedEssence ?? '']?.map(id => <p key={id}>保证：{modLines(data.mods[id], data.mods[id].stats.map(stat => stat.max)).join(' / ')}</p>)}</div></div>}
      {method === 'desecrate' && <div className="craft-advanced-settings"><p>按当前底材消耗对应的保存骸骨。未揭示词缀占用位置，可被混沌石、剥离石或完美精华移除。揭示采用词缀系列等概率模型，实际游戏权重尚未公开。</p></div>}
      {currency === 'vaal' && <div className="craft-advanced-settings"><label>推演腐化结果<select aria-label="推演腐化结果" value={corruption} onChange={event => setCorruption(event.target.value as typeof corruption)}><option value="unchanged">无变化，仅标记腐化</option><option value="implicit">添加腐化附魔</option><option value="reroll">重铸为 4–6 词缀稀有物品</option><option value="socket">增加一个符文插槽</option></select></label><p>这是指定结果分支的推演；不计算各分支的命中概率。附魔池内暂按等概率抽取。</p></div>}
      {((method === 'omens' || method === 'desecrate' || (method === 'essence' && data.essences?.find(entry => entry.id === selectedEssence)?.grade === 'perfect') || activeOmens.length > 0) && relevantOmens.length > 0) && <div className="craft-omen-rack"><div className="craft-omen-heading"><Sparkles aria-hidden="true" /><span>搭配{selectedDefinition.name}的征兆</span><small>生效一次后消耗</small></div><div className="craft-omen-options">{relevantOmens.map(omen => {
        const selected = activeOmens.includes(omen.id)
        const conflict = !selected && optionsError(currency, { omens: [...activeOmens, omen.id] })
        return <button type="button" key={omen.id} aria-pressed={selected} disabled={!!conflict} title={conflict || `${omen.english} · ${omen.help}`} className={selected ? 'is-selected' : ''} onClick={() => setSelectedOmens(selected ? activeOmens.filter(id => id !== omen.id) : [...activeOmens, omen.id])}>{selected ? <Check /> : <Sparkles />}<span>{omen.name}<small>{omen.help}</small></span></button>
      })}</div></div>}
    </div>
    <div className="craft-station-grid">
      <div className="craft-project-column">
        <div className="craft-column-title"><Gem aria-hidden="true" /><span>当前物品</span><small>{historyIndex === null ? '实时结果' : `回看第 ${historyIndex + 1} 步`}</small></div>
        {historyIndex !== null && <Button variant="outline" size="sm" className="craft-return-live" onClick={() => setHistoryIndex(null)}>返回当前进度</Button>}
        {item.pendingDesecration && <div className="craft-reveal-panel"><strong>未揭示的亵渎{item.pendingDesecration.kind === 'prefix' ? '前缀' : '后缀'} · 占用 1 个位置</strong>{item.pendingDesecration.choices ? <div>{item.pendingDesecration.choices.map((affix, index) => <Button variant="outline" key={affix.modId} disabled={historyIndex !== null || session.steps.length >= 200} onClick={() => useCurrency('select-reveal', { revealIndex: index })}>{modLines(data.mods[affix.modId!], affix.values).join(' / ')}</Button>)}</div> : <Button disabled={historyIndex !== null || session.steps.length >= 199 || !!currencyError(liveItem, 'reveal', data)} onClick={() => useCurrency('reveal', {})}>揭示三个选项</Button>}</div>}
        <article className={`craft-item-card craft-rarity-${item.rarity}`}>
          <header><span>{rarityLabels[item.rarity]} · 物品等级 {item.itemLevel}{item.corrupted ? ' · 已腐化' : ''}</span><h2 title={base.name}>{baseDisplayName(base)}</h2><p>导入名称：{item.name}</p></header>
          {item.corruptionImplicit && <div className="craft-corruption-result"><strong>腐化附魔</strong>{modLines(data.mods[item.corruptionImplicit.modId!], item.corruptionImplicit.values).map((line, i) => <p key={i}>{line}</p>)}</div>}{item.extraSocket && <p className="craft-corruption-result">腐化：额外增加 1 个符文插槽</p>}
          <div className="craft-affix-count"><span>前缀 {item.affixes.filter(affix => affix.kind === 'prefix').length + (item.pendingDesecration?.kind === 'prefix' ? 1 : 0)}/{cap}</span><span>后缀 {item.affixes.filter(affix => affix.kind === 'suffix').length + (item.pendingDesecration?.kind === 'suffix' ? 1 : 0)}/{cap}</span></div>
          <div className="craft-affix-list">{(['prefix', 'suffix'] as const).map(kind => <div className="craft-slot-group" key={kind}>{item.affixes.filter(affix => affix.kind === kind).map(affix => {
            const mod = data.mods[affix.modId!]!
            return <div className={`craft-affix craft-${kind} ${affix.fractured ? 'is-fractured' : ''}`} key={mod.id}><div><span title={mod.name}>{affix.fractured && <LockKeyhole aria-label="破裂词缀" />}{item.desecratedModId === affix.modId ? '亵渎 · ' : ''}{kind === 'prefix' ? '前缀' : '后缀'} · {modDisplayName(mod)}</span><span>T{modTier(base, mod, data)}</span></div>{modLines(mod, affix.values).map((line, i) => <p key={i}>{line}</p>)}<small>范围 {modDisplayRanges(mod)} · 物等 {mod.level}</small></div>
          })}{Array.from({ length: Math.max(0, cap - item.affixes.filter(affix => affix.kind === kind).length - (item.pendingDesecration?.kind === kind ? 1 : 0)) }, (_, index) => <div className={`craft-empty-slot slot-${kind}`} key={index}><span>＋</span>空{kind === 'prefix' ? '前缀' : '后缀'}位置</div>)}</div>)}{item.rarity === 'normal' && <p className="craft-empty">普通底材 · 使用蜕变石或点金石开始做装</p>}</div>
        </article>
        <div className="craft-action-card"><div className="craft-action-title"><span className={`craft-orb-medallion orb-${currency}`} aria-hidden="true">{currencyGlyphs[currency]}</span><div><strong>{currency === 'essence' ? data.essences?.find(entry => entry.id === selectedEssence)?.name : craftActionLabel(currency, { tier: options.tier })}</strong><p>{selectedDefinition.help}</p></div></div>{activeOmens.length > 0 && <div className="craft-active-omens">{activeOmens.map(id => <span key={id}>{omens.find(omen => omen.id === id)!.name}</span>)}</div>}<Button className="craft-apply" disabled={!!reason} onClick={() => useCurrency()}><FlaskConical />使用{selectedDefinition.name}</Button><p className={reason ? 'craft-action-reason' : 'craft-action-help'} role="status">{reason || (activeOmens.length ? '本次同时消耗选中的征兆，完成后自动取消选择。' : currency === 'vaal' ? '按选定结果分支推演，不随机决定腐化分支。' : currency === 'essence' ? '添加所选精华的保证词缀。' : '按当前可用词缀池随机生成。')}</p><div className="craft-item-actions"><Button variant="ghost" size="sm" disabled={!session.steps.length} onClick={() => { onChange({ ...session, steps: session.steps.slice(0, -1) }); setHistoryIndex(null); onNotice('已撤销上一步，返还通货与征兆。') }}><Undo2 />撤销</Button><Button variant="ghost" size="sm" onClick={async () => {
          try { await navigator.clipboard.writeText([baseDisplayName(base), `稀有度：${rarityLabels[item.rarity]}`, `物品等级：${item.itemLevel}`, ...item.affixes.flatMap(affix => modLines(data.mods[affix.modId!], affix.values)), ...(item.pendingDesecration ? ['未揭示的亵渎词缀'] : []), ...(item.corruptionImplicit ? modLines(data.mods[item.corruptionImplicit.modId!], item.corruptionImplicit.values) : []), ...(item.extraSocket ? ['额外符文插槽 +1'] : []), ...(item.corrupted ? ['已腐化'] : [])].join('\n')); onNotice('已复制模拟结果摘要。') } catch { onError('无法访问剪贴板。') }
        }}><Copy />复制物品</Button></div></div>
        <details className="craft-original"><summary>导入原文与属性</summary><p>导入时快照；防御、装备需求和伤害暂不重算。</p><pre>{item.source}</pre></details>
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
      <aside className="craft-activity-column" aria-label="做装记录"><div className="craft-column-title"><History aria-hidden="true" /><span>做装记录</span><small>{session.steps.length} 步</small></div><div className="craft-activity-tabs" role="group" aria-label="记录视图"><button type="button" aria-pressed={activityTab === 'history'} onClick={() => setActivityTab('history')}>历史</button><button type="button" aria-pressed={activityTab === 'cost'} onClick={() => setActivityTab('cost')}>消耗</button></div>
        {activityTab === 'history' ? <div className="craft-step-list">{session.steps.map((step, index) => ({ step, index })).reverse().map(({ step, index }) => {
          const previous = index ? session.steps[index - 1].item : session.original
          const added = step.item.affixes.filter(affix => !previous.affixes.some(old => old.modId === affix.modId))
          const removed = previous.affixes.filter(affix => !step.item.affixes.some(next => next.modId === affix.modId))
          return <button type="button" key={index} className={historyIndex === index ? 'is-selected' : ''} onClick={() => setHistoryIndex(historyIndex === index ? null : index)} aria-label={`查看第 ${index + 1} 步：${craftActionLabel(step.currency, step)}`}><span className="craft-step-number">{String(index + 1).padStart(2, '0')}</span><div><strong>{step.currency === 'essence' ? data.essences?.find(entry => entry.id === step.essenceId)?.name : craftActionLabel(step.currency, { tier: step.tier })}</strong>{step.omens?.map(id => <small className="craft-step-omen" key={id}>{omens.find(omen => omen.id === id)!.name}</small>)}{added.map(affix => <small className="craft-step-added" key={affix.modId}>＋{modDisplayName(data.mods[affix.modId!])}</small>)}{removed.map(affix => <small className="craft-step-removed" key={affix.modId}>−{modDisplayName(data.mods[affix.modId!])}</small>)}{!added.length && !removed.length && <small>{step.currency === 'fracture' ? '随机锁定一条词缀' : '词缀数值或状态更新'}</small>}</div><span className="craft-step-size">{step.item.affixes.length} 词缀</span></button>
        })}{!session.steps.length && <div className="craft-activity-empty"><History /><p>你的下一步，从这里开始</p><small>选择通货并使用后，记录会出现在这里。点击记录可回看物品。</small></div>}</div> : <div className="craft-cost-list">{costEntries.map(entry => <div key={entry.id}><span>{entry.name}</span><strong>×{entry.count}</strong></div>)}{!costEntries.length && <p className="craft-empty">尚未消耗通货</p>}<footer><span>累计消耗</span><strong>{costEntries.reduce((sum, entry) => sum + entry.count, 0)} 件</strong></footer><p>按数量记录，未接入市场价格。</p></div>}
        <div className="craft-targets-panel"><div><Crosshair /><h3>目标词缀</h3><span>{targets.filter(targetHit).length}/{targets.length}</span></div>{targets.length ? targets.map(id => <div className={`craft-target-row ${targetHit(id) ? 'is-hit' : ''}`} key={id}>{targetHit(id) ? <Check /> : <CircleDot />}<span>{modDisplayName(data.mods[id])}<small>T{modTier(base, data.mods[id], data)} 或更高</small></span><button type="button" aria-label={`移除目标：${modDisplayName(data.mods[id])}`} onClick={() => onChange({ ...session, targets: targets.filter(target => target !== id) })}><X /></button></div>) : <p>展开词缀系列，点击靶心选择目标。目标只用于追踪，不改变随机结果。</p>}</div>
      </aside>
    </div>
    <footer className="craft-station-footer"><span><Check aria-hidden="true" />进度自动保存至本机</span><span>已启用：分阶通货 · 精华 · 亵渎揭示 · 腐化分支推演 · 征兆 · 破裂</span></footer>
  </div>
}
