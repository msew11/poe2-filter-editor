import { useState, type CSSProperties, type ReactNode } from 'react'
import { Check, Copy, Download, FileCode2, Gem, Plus, ScrollText, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { RuleBuilder } from '@/components/rule-builder'
import { downloadRule, fieldDefinitions, matchesRule, serializeRule, type ExampleItem, type Rule } from '@/lib/rules'
import type { Appearance, Workspace } from '@/lib/workspace'

export type UpdateWorkspace = (updater: (current: Workspace) => Workspace) => void

function PageTitle({ section, title, extra }: { section: string; title: string; extra?: ReactNode }) {
  return <div className="page-heading"><p className="page-kicker">FILTER / {section}</p><div className="page-title-row"><h1>{title}</h1>{extra}</div></div>
}

export function RulesPage({ workspace, update }: { workspace: Workspace; update: UpdateWorkspace }) {
  const [creating, setCreating] = useState(false)
  return <>
    <PageTitle section="RULE LIBRARY" title="规则编辑" extra={<Button id="create-rule" onClick={() => setCreating(true)}><Plus />创建规则</Button>} />
    <div className="rule-library-intro"><span>{workspace.rules.length} 条规则</span><p>在这里创建和管理独立规则，在编排中组合使用。</p></div>
    <div className="rule-list" aria-label="规则库">{workspace.rules.map(rule => <article key={rule.id} className="rule-row library-rule" data-rule-id={rule.id}>
      <span className="library-rule-icon"><ScrollText aria-hidden="true" /></span><div className="rule-copy"><h2>{rule.name}</h2><div className="library-field-tags">{rule.fields.slice(0, 4).map(field => <code key={field.id}>{fieldDefinitions[field.type].label}</code>)}{rule.fields.length > 4 && <span>+{rule.fields.length - 4}</span>}{!rule.fields.length && <span>匹配所有物品</span>}</div></div>
      <span className={`rule-action ${rule.action === 'Show' ? 'action-show' : 'action-hide'}`}>{rule.action === 'Show' ? '显示' : '隐藏'}</span><span className="rule-field-count">{rule.fields.length} 个字段</span><Button variant="ghost" size="icon" className="delete-rule-button" aria-label={`删除规则：${rule.name}`} onClick={() => update(w => ({ ...w, rules: w.rules.filter(r => r.id !== rule.id) }))}><Trash2 /></Button>
    </article>)}</div>
    {!workspace.rules.length && <div className="rule-library-empty"><ScrollText aria-hidden="true" /><h2>还没有规则</h2><p>点击“创建规则”，定义你的第一条规则。</p></div>}
    {creating && <RuleBuilder onClose={() => setCreating(false)} onCreate={rule => update(w => ({ ...w, rules: [...w.rules, rule] }))} />}
  </>
}

function itemStyle(appearance: Appearance): CSSProperties { return { color: appearance.text, backgroundColor: appearance.background, borderColor: appearance.border, fontSize: `${appearance.fontSize / 2 + 2}px` } }

export function AppearancePage({ workspace, update }: { workspace: Workspace; update: UpdateWorkspace }) {
  const fields = [{ key: 'text', label: '文字颜色' }, { key: 'background', label: '背景颜色' }, { key: 'border', label: '边框颜色' }] as const
  return <>
    <PageTitle section="APPEARANCE" title="外观样式" extra={<span className="quiet-tag">样式试色</span>} />
    <div className="appearance-stage"><span className="stage-corner corner-tl" /><span className="stage-corner corner-br" /><span className="item-label" style={itemStyle(workspace.appearance)}>有品质的装备</span><span className="stage-caption">物品标签预览</span></div>
    <div className="palette-fields">{fields.map(({ key, label }) => <label key={key} className="color-field"><span>{label}</span><span className="color-input-shell"><input type="color" aria-label={label} value={workspace.appearance[key]} onChange={e => update(w => ({ ...w, appearance: { ...w.appearance, [key]: e.target.value } }))} /><code>{workspace.appearance[key].toUpperCase()}</code></span></label>)}</div>
    <div className="font-field"><div><label htmlFor="font-size">标签字号</label><output htmlFor="font-size">{workspace.appearance.fontSize}</output></div><input id="font-size" type="range" min="18" max="45" value={workspace.appearance.fontSize} onChange={e => update(w => ({ ...w, appearance: { ...w.appearance, fontSize: Number(e.target.value) } }))} /><p className="field-description">试色用于参考；规则的实际颜色和字号在创建弹窗中添加字段设置。</p></div>
  </>
}

const common = { ItemLevel: 80, DropLevel: 30, AreaLevel: 80, StackSize: 1, Sockets: 2, WaystoneTier: 0, UnidentifiedItemTier: 1, BaseArmour: 200, BaseEvasion: 0, BaseEnergyShield: 0, Class: 'Body Armours', BaseType: 'Iron Cuirass', Identified: false, Corrupted: false, Mirrored: false, TwiceCorrupted: false }
const examples: ExampleItem[] = [
  { name: '有品质的普通装备', properties: { ...common, Rarity: 'Normal', Quality: 20 } },
  { name: '无品质的普通装备', properties: { ...common, Rarity: 'Normal', Quality: 0 } },
  { name: '有品质的魔法装备', properties: { ...common, Rarity: 'Magic', Quality: 10 } },
  { name: '稀有装备', properties: { ...common, Rarity: 'Rare', Quality: 0 } },
]

function RulePicker({ rules, value, onChange, id }: { rules: Rule[]; value: string; onChange: (id: string) => void; id: string }) {
  return <div className="single-rule-picker"><label htmlFor={id}>选择规则</label><Select id={id} value={value} onChange={e => onChange(e.target.value)}>{rules.map(rule => <option key={rule.id} value={rule.id}>{rule.name} · {rule.action === 'Show' ? '显示' : '隐藏'}</option>)}</Select></div>
}
function NoRules() { return <div className="rule-library-empty"><FileCode2 aria-hidden="true" /><h2>还没有可查看的规则</h2><p>请先到规则编辑页创建一条规则。</p></div> }
function ruleItemStyle(rule: Rule, appearance: Appearance): CSSProperties {
  const style = itemStyle(appearance)
  for (const field of rule.fields) {
    if (field.type === 'SetTextColor') style.color = `${field.params.value}${Number(field.params.alpha).toString(16).padStart(2, '0')}`
    if (field.type === 'SetBackgroundColor') style.backgroundColor = `${field.params.value}${Number(field.params.alpha).toString(16).padStart(2, '0')}`
    if (field.type === 'SetBorderColor') style.borderColor = `${field.params.value}${Number(field.params.alpha).toString(16).padStart(2, '0')}`
    if (field.type === 'SetFontSize') style.fontSize = `${Number(field.params.value) / 2 + 2}px`
  }
  return style
}

export function PreviewPage({ workspace }: { workspace: Workspace }) {
  const [selected, setSelected] = useState('')
  const rule = workspace.rules.find(r => r.id === selected) || workspace.rules[0]
  return <>
    <PageTitle section="PREVIEW" title="掉落预览" extra={<span className="quiet-tag">单条规则预览</span>} />
    {!rule ? <NoRules /> : <><RulePicker rules={workspace.rules} value={rule.id} onChange={setSelected} id="preview-rule" /><div className="drop-stage"><Gem className="drop-stage-gem" aria-hidden="true" />{examples.map((item, index) => {
      const matched = matchesRule(rule, item)
      const hidden = matched && rule.action === 'Hide'
      return <div key={index} className={`drop-example ${hidden ? 'drop-hidden' : ''}`} data-example={index}><span className="item-label" style={matched && !hidden ? ruleItemStyle(rule, workspace.appearance) : undefined}>{item.name}</span><span className="drop-detail">{matched ? `命中规则 · ${hidden ? '隐藏' : '显示'}` : '未命中这条规则'}</span></div>
    })}</div><p className="page-hint">仅测试所选规则。示例为等级 80 的 Iron Cuirass，其余规则不参与判断。</p></>}
  </>
}

export function SourcePage({ workspace }: { workspace: Workspace }) {
  const [selected, setSelected] = useState('')
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const rule = workspace.rules.find(r => r.id === selected) || workspace.rules[0]
  const source = rule ? serializeRule(rule) : ''
  async function copy() {
    try { await navigator.clipboard.writeText(source); setCopyState('copied') } catch { setCopyState('failed') }
    setTimeout(() => setCopyState('idle'), 2200)
  }
  return <>
    <PageTitle section="SOURCE" title="过滤器源码" extra={rule && <div className="source-actions"><Button variant="outline" size="sm" onClick={copy}>{copyState === 'copied' ? <Check /> : <Copy />}{copyState === 'copied' ? '已复制' : '复制源码'}</Button><Button size="sm" onClick={() => downloadRule(rule)}><Download />导出规则</Button></div>} />
    {!rule ? <NoRules /> : <><RulePicker rules={workspace.rules} value={rule.id} onChange={id => { setSelected(id); setCopyState('idle') }} id="source-rule" />{copyState === 'failed' && <p role="alert" className="inline-alert">复制失败，请在下方选中源码手动复制。</p>}<div className="source-frame"><div className="source-file-name"><span className="file-status-dot" />{rule.name}.filter<span>UTF-8</span></div><pre aria-label="规则源码"><code>{source.split('\n').map((line, index) => <span className={`source-line ${line.startsWith('#') ? 'code-comment' : /^(Show|Hide)$/.test(line) ? 'code-keyword' : ''}`} key={index}><span className="line-number" aria-hidden="true">{index + 1}</span><span>{line || '\u00a0'}</span></span>)}</code></pre></div><p className="page-hint">这里展示和导出单条规则的文本，完整过滤器将在编排中生成。</p></>}
  </>
}
