import { useState, type CSSProperties, type ReactNode } from 'react'
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Copy, FileCode2, Gem, GripVertical, Pencil, Plus, ScrollText, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { RuleBuilder } from '@/components/rule-builder'
import { copyRule, fieldDefinitions, matchesRule, serializeRule, type ExampleItem, type Rule } from '@/lib/rules'
import type { Appearance, Workspace } from '@/lib/workspace'

export type UpdateWorkspace = (updater: (current: Workspace) => Workspace) => void

export function PageTitle({ section, title, extra }: { section: string; title: string; extra?: ReactNode }) {
  return <div className="page-heading"><p className="page-kicker">FILTER / {section}</p><div className="page-title-row"><h1>{title}</h1>{extra}</div></div>
}

function SortableRule({ rule, onEdit, onCopy, onDelete }: { rule: Rule; onEdit: () => void; onCopy: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: rule.id })
  return <article ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`rule-row library-rule ${isDragging ? 'is-dragging' : ''}`} data-rule-id={rule.id}>
    <div className="library-rule-header">
      <button type="button" ref={setActivatorNodeRef} className="rule-drag-handle" {...attributes} {...listeners} aria-label={`拖动规则：${rule.name}`} title="拖动调整列表顺序"><GripVertical aria-hidden="true" /></button>
      <h2 className="library-rule-name" title={rule.name}>{rule.name}</h2>
      <span className={`rule-action ${rule.action === 'Show' ? 'action-show' : 'action-hide'}`}>{rule.action === 'Show' ? '显示' : '隐藏'}</span>
      <div className="library-rule-summary"><span className="rule-field-count">{rule.fields.length} 个字段</span><div className="library-field-tags">{rule.fields.slice(0, 3).map(field => <code key={field.id}>{fieldDefinitions[field.type].label}</code>)}{rule.fields.length > 3 && <span>+{rule.fields.length - 3}</span>}{!rule.fields.length && <span>匹配所有物品</span>}</div></div>
      <div className="library-rule-actions">
        <Button variant="ghost" size="sm" className="rule-text-toggle" aria-label={`${expanded ? '收起' : '展开'}规则文本：${rule.name}`} aria-expanded={expanded} aria-controls={`rule-text-${rule.id}`} title={expanded ? '收起规则文本' : '展开规则文本'} onClick={() => setExpanded(value => !value)}><FileCode2 /><span>文本</span></Button>
        <Button id={`edit-rule-${rule.id}`} variant="ghost" size="sm" aria-label={`编辑规则：${rule.name}`} title="编辑规则" onClick={onEdit}><Pencil /><span>编辑</span></Button>
        <Button id={`copy-rule-${rule.id}`} variant="ghost" size="sm" aria-label={`复制规则：${rule.name}`} title="复制为新规则" onClick={onCopy}><Copy /><span>复制</span></Button>
        <Button variant="ghost" size="icon" className="delete-rule-button" aria-label={`删除规则：${rule.name}`} title="删除规则" onClick={onDelete}><Trash2 /></Button>
      </div>
    </div>
    <div id={`rule-text-${rule.id}`} className="library-rule-source" hidden={!expanded}><pre tabIndex={0} aria-label={`规则文本：${rule.name}`}><code>{serializeRule(rule)}</code></pre></div>
  </article>
}

export function RulesPage({ workspace, update }: { workspace: Workspace; update: UpdateWorkspace }) {
  const [editor, setEditor] = useState<{ mode: 'create' } | { mode: 'edit'; rule: Rule } | { mode: 'copy'; rule: Rule; sourceId: string } | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))
  function reorder({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    update(current => {
      const from = current.rules.findIndex(rule => rule.id === active.id)
      const to = current.rules.findIndex(rule => rule.id === over.id)
      return from < 0 || to < 0 ? current : { ...current, rules: arrayMove(current.rules, from, to) }
    })
  }
  function saveRule(rule: Rule) {
    update(current => {
      if (editor?.mode === 'edit') return { ...current, rules: current.rules.map(item => item.id === rule.id ? rule : item) }
      const rules = [...current.rules]
      const sourceIndex = editor?.mode === 'copy' ? rules.findIndex(item => item.id === editor.sourceId) : -1
      rules.splice(sourceIndex < 0 ? rules.length : sourceIndex + 1, 0, rule)
      return { ...current, rules }
    })
  }
  return <>
    <PageTitle section="RULE LIBRARY" title="规则编辑" extra={<Button id="create-rule" onClick={() => setEditor({ mode: 'create' })}><Plus />创建规则</Button>} />
    <div className="rule-library-intro"><span>{workspace.rules.length} 条规则</span><p>拖动手柄调整列表顺序，请在过滤器编辑页组合规则并设置执行顺序。</p></div>
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={reorder} accessibility={{ screenReaderInstructions: { draggable: '按空格键拾起规则，使用上下方向键移动，再按空格键放下。按 Escape 取消。' }, announcements: { onDragStart: ({ active }) => `已拾起规则：${workspace.rules.find(rule => rule.id === active.id)?.name || ''}。`, onDragOver: ({ over }) => over ? `移动到列表第 ${workspace.rules.findIndex(rule => rule.id === over.id) + 1} 个位置。` : '移出规则列表。', onDragEnd: () => '规则已放下。', onDragCancel: () => '已取消移动。' } }}><SortableContext items={workspace.rules.map(rule => rule.id)} strategy={verticalListSortingStrategy}>
      <div className="rule-list" aria-label="规则库">{workspace.rules.map(rule => <SortableRule key={rule.id} rule={rule} onEdit={() => setEditor({ mode: 'edit', rule })} onCopy={() => setEditor({ mode: 'copy', sourceId: rule.id, rule: copyRule(rule, workspace.rules.map(item => item.name)) })} onDelete={() => update(w => ({ ...w, rules: w.rules.filter(r => r.id !== rule.id) }))} />)}</div>
    </SortableContext></DndContext>
    {!workspace.rules.length && <div className="rule-library-empty"><ScrollText aria-hidden="true" /><h2>还没有规则</h2><p>点击“创建规则”，定义你的第一条规则。</p></div>}
    {editor && <RuleBuilder key={editor.mode === 'create' ? 'create' : editor.rule.id} initialRule={editor.mode === 'create' ? undefined : editor.rule} copying={editor.mode === 'copy'} returnFocusId={editor.mode === 'edit' ? `edit-rule-${editor.rule.id}` : editor.mode === 'copy' ? `copy-rule-${editor.sourceId}` : 'create-rule'} onClose={() => setEditor(null)} onSave={saveRule} />}
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
