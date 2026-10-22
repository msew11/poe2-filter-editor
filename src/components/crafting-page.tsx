import { useEffect, useState } from 'react'
import { FlaskConical, Import, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { PageTitle } from '@/components/pages'
import { CraftingWorkbench } from '@/components/crafting-workbench'
import { currentItem, modLines, parseItem, rarityLabels, resolveAffix, restoreSession, unpackCraftData, validateItem, type CraftData, type CraftItem, type CraftSession } from '@/lib/crafting'
import { baseDisplayName, modDisplayName, statStoredValue } from '@/lib/crafting-localization'
import { englishItemPreview } from '@/lib/crafting-english'
import { itemClassOptions } from '@/config'
import craftingDataUrl from '@/config/crafting-data.json?url'

const classDisplayName = (value: string) => itemClassOptions.find(option => option.value === value)?.labelZh ?? value
const SESSION_KEY = 'exile-forge.crafting.v1'
let pendingData: Promise<CraftData> | undefined
function loadData() {
  return pendingData ??= fetch(craftingDataUrl).then(response => { if (!response.ok) throw new Error('无法加载做装数据，请重试。'); return response.json() }).then(unpackCraftData).catch(error => { pendingData = undefined; throw error })
}

export function CraftingPage() {
  const [data, setData] = useState<CraftData | null>(null)
  const [text, setText] = useState('')
  const [draft, setDraft] = useState<CraftItem | null>(null)
  const [session, setSession] = useState<CraftSession | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saveError, setSaveError] = useState('')
  const [baseSearch, setBaseSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)
  const [importOpen, setImportOpen] = useState(false)
  const [importMode, setImportMode] = useState('paste')
  const [newBaseId, setNewBaseId] = useState('Metadata/Items/Armours/BodyArmours/FourBodyInt3Endgame')
  const [newLevel, setNewLevel] = useState('79')
  const base = data?.bases.find(base => base.id === draft?.baseId)

  useEffect(() => {
    let active = true
    setLoading(true)
    loadData().then(value => {
      if (!active) return
      setData(value)
      try { setSession(restoreSession(localStorage.getItem(SESSION_KEY), value)) } catch { setSaveError('无法读取本机记录。') }
    }).catch(error => { if (active) setError(error.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [attempt])

  useEffect(() => {
    if (!data || !session) return
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); setSaveError('') } catch { setSaveError('模拟进度无法保存，请保留导入文本。') }
  }, [data, session])

  function importText(value = text) {
    if (!data) return
    try { setDraft(parseItem(value, data)); setBaseSearch(''); setError(''); setNotice('已解析文本，请核对底材与词缀后开始模拟。') } catch (error) { setDraft(null); setError((error as Error).message); setNotice('') }
  }
  function openImport() {
    setImportOpen(true); setImportMode('paste'); setBaseSearch(''); setError('')
    if (session) {
      const current = currentItem(session)
      const currentText = session.steps.length && data ? englishItemPreview(current, data).text : current.source
      setText(currentText); setDraft({ ...current, source: currentText })
    }
    else { setDraft(null); if (text) importText(text) }
  }
  function createBase() {
    const base = data?.bases.find(base => base.id === newBaseId)
    const level = Number(newLevel)
    if (!base || !Number.isInteger(level) || level < 1 || level > 100) { setError('请选择底材并填写 1–100 的整数物品等级。'); return }
    const source = `Item Class: ${base.itemClass}\nRarity: Normal\n${base.name}\n--------\nItem Level: ${level}\n--------`
    setSession({ original: parseItem(source, data!), steps: [] }); setImportOpen(false); setDraft(null); setError(''); setNotice('已创建普通底材，从选择通货开始。')
  }

  return <section className="workspace-panel crafting-page crafting-layout">
    <PageTitle section="CRAFTING" title="做装模拟" extra={<div className="craft-page-actions"><span className="quiet-tag">PoE 2 · {data?.gameVersion ?? '加载中'}</span></div>} />
    <p className="craft-intro">选择通货与征兆 → 在物品上应用 → 查看词缀变化。展开词缀系列可选择目标，历史记录支持回看。</p>
    {loading && <p role="status">正在加载底材与词缀数据…</p>}
    {error && !importOpen && <div className="inline-alert" role="alert">{error}{!data && !loading && <Button variant="ghost" size="sm" onClick={() => { setError(''); setAttempt(value => value + 1) }}>重试</Button>}</div>}
    <div className="craft-notice" role="status">{saveError || notice}</div>
    {data && <>
      {session ? <CraftingWorkbench key={session.original.source} data={data} session={session} onChange={setSession} onImport={openImport} onNotice={setNotice} onError={setError} /> : <div className="craft-welcome"><span className="craft-welcome-gem"><FlaskConical aria-hidden="true" /></span><p className="page-kicker">YOUR NEXT CRAFT STARTS HERE</p><h2>从一件装备开始</h2><p>导入游戏中的现有物品，或选择一件普通底材。<br />搭配通货和征兆，一步步尝试你的做装思路。</p><div className="craft-toolbar"><Button onClick={openImport}><Import />导入现有物品</Button><Button variant="outline" onClick={() => { openImport(); setImportMode('base') }}><Plus />选择底材</Button></div><div className="craft-welcome-features"><span>9 种通货</span><span>11 种征兆</span><span>词缀目标追踪</span><span>历史与消耗</span></div></div>}
      <Dialog open={importOpen} onOpenChange={setImportOpen}><DialogContent className="craft-import-dialog" overlayClassName="craft-import-overlay"><header className="rule-dialog-header"><p className="page-kicker">CRAFTING / PROJECT</p><DialogTitle>开始做装项目</DialogTitle><DialogDescription>粘贴游戏物品文本，或选择普通底材。现有项目会在确认后替换。</DialogDescription></header><div className="craft-import-mode" role="group" aria-label="项目来源"><button type="button" aria-pressed={importMode === 'paste'} onClick={() => setImportMode('paste')}><Import />导入物品</button><button type="button" aria-pressed={importMode === 'base'} onClick={() => setImportMode('base')}><Plus />选择底材</button></div>{error && <p className="inline-alert" role="alert">{error}</p>}
      {importMode === 'paste' ? <>
        <div className="craft-import-body">
          <label htmlFor="craft-item-text">游戏物品文本</label>
          <textarea id="craft-item-text" className="forge-textarea craft-import-text" rows={9} maxLength={50000} value={text} onChange={event => { const value = event.target.value; setText(value); setError(''); try { setDraft(parseItem(value, data)) } catch { setDraft(null) } }} placeholder="在此粘贴游戏中复制的完整物品文本…" spellCheck={false} />
          <div className="craft-toolbar"><Button onClick={() => importText()} disabled={!text.trim()}><Import />解析物品</Button></div>
          {draft && <div className="craft-confirm">
            <h2>确认导入</h2><p>{draft.name} · {rarityLabels[draft.rarity]} · 物等 {draft.itemLevel}</p>
            <label htmlFor="craft-base-search">底材 {draft.baseId ? '· 已识别，可修改' : '· 未识别，请选择底材'}</label>
            <input id="craft-base-search" className="forge-textarea" value={baseSearch} onChange={event => setBaseSearch(event.target.value)} placeholder="搜索底材中英文名称或类别，如 长袍 / Robe" />
            <Select aria-label="确认物品底材" value={draft.baseId ?? ''} onChange={event => {
              const selected = data.bases.find(base => base.id === event.target.value)
              if (selected) setDraft({ ...draft, baseId: selected.id, affixes: draft.affixes.map(affix => resolveAffix({ ...affix, modId: null }, selected, data, !!affix.modId)) })
            }}><option value="">选择底材</option>{data.bases.filter(candidate => candidate.id === draft.baseId || `${baseDisplayName(candidate)} ${candidate.name} ${classDisplayName(candidate.itemClass)} ${candidate.itemClass}`.toLowerCase().includes(baseSearch.toLowerCase())).map(base => <option key={base.id} value={base.id}>{baseDisplayName(base)} · {classDisplayName(base.itemClass)}（{base.name}）</option>)}</Select>
            <div className="craft-import-affixes">{draft.affixes.map((affix, index) => <div key={index} className="craft-import-affix"><p>{affix.modId ? '✓' : '待确认'} {affix.text}</p>{!affix.modId && base && <>
              <Select aria-label={`确认第 ${index + 1} 条词缀`} value="" onChange={event => {
                const mod = data.mods[event.target.value]
                if (mod) setDraft({ ...draft, affixes: draft.affixes.map((entry, i) => i === index ? { ...entry, modId: mod.id, kind: mod.kind, name: mod.name, values: entry.values.map((value, i) => statStoredValue(mod.stats[i].id, value)) } : entry) })
              }}><option value="">选择数值相符的词缀（原数值保留）</option>{base.modIds.map(id => data.mods[id]).filter(mod => mod.level <= draft.itemLevel && (affix.kind === 'unknown' || affix.kind === mod.kind) && mod.stats.length === affix.values.length && mod.stats.every((stat, i) => statStoredValue(stat.id, affix.values[i]) >= stat.min && statStoredValue(stat.id, affix.values[i]) <= stat.max)).map(mod => <option value={mod.id} key={mod.id}>{mod.kind === 'prefix' ? '前缀' : '后缀'} · {modDisplayName(mod)} · {modLines(mod, affix.values.map((value, i) => statStoredValue(mod.stats[i].id, value))).join(' / ')}</option>)}</Select>
            </>}</div>)}</div>
            {!draft.affixes.length && <p>未发现显式词缀。</p>}
            {validateItem(draft, data) && <p className="craft-warning">{validateItem(draft, data)}</p>}
            <div className="craft-toolbar"><Button disabled={!!validateItem(draft, data)} onClick={() => { setSession({ original: draft, steps: [] }); setDraft(null); setError(''); setNotice('已导入物品，选择通货开始模拟。'); setImportOpen(false) }}><FlaskConical />开始模拟</Button><Button variant="ghost" onClick={() => { setDraft(null); setNotice('') }}>取消</Button></div>
          </div>}
        </div>
      </> : <div className="craft-import-body craft-base-form"><label htmlFor="craft-new-base-search">搜索底材名称或类别</label><input id="craft-new-base-search" className="forge-textarea" value={baseSearch} onChange={event => setBaseSearch(event.target.value)} placeholder="长袍 / Robe / 胸甲" /><label htmlFor="craft-new-base">选择底材</label><Select id="craft-new-base" value={newBaseId} onChange={event => setNewBaseId(event.target.value)}>{data.bases.filter(candidate => candidate.id === newBaseId || `${baseDisplayName(candidate)} ${candidate.name} ${classDisplayName(candidate.itemClass)}`.toLowerCase().includes(baseSearch.toLowerCase())).map(base => <option key={base.id} value={base.id}>{baseDisplayName(base)} · {classDisplayName(base.itemClass)}（{base.name}）</option>)}</Select><label htmlFor="craft-new-level">物品等级</label><input id="craft-new-level" type="number" min={1} max={100} step={1} className="forge-textarea" value={newLevel} onChange={event => setNewLevel(event.target.value)} /><p className="field-description">以普通、无显式词缀的底材开始。物等决定可生成的词缀档位。</p><Button onClick={createBase}><FlaskConical />创建项目</Button></div>}
      </DialogContent></Dialog>
      <details className="craft-scope"><summary>支持范围与数据说明</summary><p>支持基础/高阶/完美通货、15 种征兆、破裂锁定、低阶至完美精华，以及亵渎占位、三选一揭示。腐化提供指定结果分支推演，随后锁定物品；尚未核实各分支概率。亵渎揭示与腐化附魔池使用等概率参考模型。底材与词缀来自固定快照；权重依赖来源数据，概率仅供参考。防御、需求与伤害暂不重算。中文名称为界面说明译名，悬停可查看英文原名；部分底材保留英文名。</p></details>
    </>}
  </section>
}
