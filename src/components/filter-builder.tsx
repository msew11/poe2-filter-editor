import { useRef, useState, type FormEvent } from 'react'
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Check, CodeXml, Copy, GripVertical, Link2, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { RuleBuilder } from '@/components/rule-builder'
import { addFilterRule, createFilter, filterError, resolveFilterRule, serializeFilter, type Filter, type FilterRule } from '@/lib/filters'
import type { Rule } from '@/lib/rules'

function SortableFilterRule({ entry, rules, onEdit, onDelete }: { entry: FilterRule; rules: Rule[]; onEdit: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: entry.id })
  const rule = resolveFilterRule(entry, rules)
  return <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`filter-rule-card ${isDragging ? 'is-dragging' : ''} ${!rule ? 'has-error' : ''}`}>
    <button type="button" ref={setActivatorNodeRef} className="field-drag-handle" {...attributes} {...listeners} aria-label={`拖动规则：${rule?.name || '失效引用'}`} title="拖动调整执行顺序"><GripVertical aria-hidden="true" /></button>
    <div className="filter-rule-info"><strong>{rule?.name || '引用的规则已删除'}</strong><span>{rule ? `${rule.action === 'Show' ? '显示' : '隐藏'} · ${rule.fields.length} 个字段` : '请移除此项，再添加其他规则。'}</span></div>
    <span className={`filter-rule-mode ${entry.mode === 'reference' ? 'is-reference' : ''}`}>{entry.mode === 'reference' ? <Link2 aria-hidden="true" /> : <Copy aria-hidden="true" />}{entry.mode === 'reference' ? '引用' : '拷贝'}</span>
    {entry.mode === 'copy' && <Button id={`edit-filter-rule-${entry.id}`} variant="ghost" size="icon" aria-label={`编辑拷贝：${rule?.name}`} title="编辑独立副本" onClick={onEdit}><Pencil /></Button>}
    <Button variant="ghost" size="icon" className="delete-rule-button" aria-label={`移除规则：${rule?.name || '失效引用'}`} title="从过滤器移除" onClick={onDelete}><Trash2 /></Button>
  </li>
}

export function FilterBuilder({ initialFilter, rules, returnFocusId, onClose, onSave }: { initialFilter?: Filter; rules: Rule[]; returnFocusId: string; onClose: () => void; onSave: (filter: Filter) => void }) {
  const editing = !!initialFilter
  const [draft, setDraft] = useState<Filter>(() => initialFilter ? structuredClone(initialFilter) : createFilter())
  const [selected, setSelected] = useState('')
  const [mode, setMode] = useState<FilterRule['mode']>('reference')
  const [attempted, setAttempted] = useState(false)
  const [editingCopyId, setEditingCopyId] = useState<string | null>(null)
  const dragging = useRef(false)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))
  const selectedRule = rules.find(rule => rule.id === selected) || rules[0]
  const editingEntry = draft.rules.find(entry => entry.id === editingCopyId)
  const error = filterError(draft, rules)
  const missing = draft.rules.some(entry => !resolveFilterRule(entry, rules))
  const source = missing ? '# 请移除失效引用后预览过滤器文本。' : serializeFilter(draft, rules)

  function reorder({ active, over }: DragEndEvent) {
    dragging.current = false
    if (!over || active.id === over.id) return
    setDraft(current => {
      const from = current.rules.findIndex(entry => entry.id === active.id)
      const to = current.rules.findIndex(entry => entry.id === over.id)
      return from < 0 || to < 0 ? current : { ...current, rules: arrayMove(current.rules, from, to) }
    })
  }
  function submit(event: FormEvent) {
    event.preventDefault(); setAttempted(true)
    if (error) { document.getElementById(!draft.name.trim() ? 'filter-name' : 'new-filter-rule')?.focus(); return }
    onSave({ ...draft, name: draft.name.trim() }); onClose()
  }

  return <Dialog open onOpenChange={open => { if (!open) onClose() }}><DialogContent className="rule-dialog filter-dialog" onEscapeKeyDown={event => { if (dragging.current) event.preventDefault() }} onCloseAutoFocus={event => { event.preventDefault(); document.getElementById(returnFocusId)?.focus() }}><form onSubmit={submit} noValidate>
    <header className="rule-dialog-header"><p className="page-kicker">FILTER / {editing ? 'EDIT' : 'CREATE'}</p><DialogTitle>{editing ? '编辑过滤器' : '创建过滤器'}</DialogTitle><DialogDescription>设置过滤器名称，添加规则，并按执行顺序排列。</DialogDescription></header>
    <div className="rule-dialog-body filter-dialog-body">
      <div className="rule-name-input"><label htmlFor="filter-name">过滤器名称</label><Input id="filter-name" placeholder="例如：我的冒险过滤器" maxLength={100} value={draft.name} aria-invalid={attempted && !draft.name.trim()} aria-describedby={attempted && error ? 'filter-error' : undefined} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))} autoComplete="off" /></div>
      <div className="filter-editor-columns">
      <section className="filter-rules-panel" aria-label="过滤器规则编辑">
      <div className="field-section-heading filter-section-heading"><h3>过滤器规则 <span>{draft.rules.length}</span></h3><span>拖动左侧手柄调整执行顺序</span></div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={() => { dragging.current = true }} onDragEnd={reorder} onDragCancel={() => { dragging.current = false }} accessibility={{ screenReaderInstructions: { draggable: '按空格键拾起规则，使用上下方向键移动，再按空格键放下。按 Escape 取消。' }, announcements: { onDragStart: () => '已拾起规则。', onDragOver: ({ over }) => over ? '规则执行顺序已调整。' : '移出规则列表。', onDragEnd: () => '规则已放下。', onDragCancel: () => '已取消移动。' } }}><SortableContext items={draft.rules.map(entry => entry.id)} strategy={verticalListSortingStrategy}>
        <ol className="rule-fields" aria-label="过滤器规则列表">{draft.rules.map(entry => <SortableFilterRule key={entry.id} entry={entry} rules={rules} onEdit={() => setEditingCopyId(entry.id)} onDelete={() => setDraft(current => ({ ...current, rules: current.rules.filter(rule => rule.id !== entry.id) }))} />)}</ol>
      </SortableContext></DndContext>
      {!draft.rules.length && <div className="empty-fields"><Plus aria-hidden="true" /><span>添加第一条规则，开始创建过滤器。</span></div>}
      <div className="add-field-row add-filter-rule-row"><label htmlFor="new-filter-rule">添加规则</label><Select id="new-filter-rule" value={selectedRule?.id || ''} disabled={!rules.length} onChange={event => setSelected(event.target.value)}>{!rules.length && <option value="">规则库暂无规则</option>}{rules.map(rule => <option key={rule.id} value={rule.id}>{rule.name} · {rule.action === 'Show' ? '显示' : '隐藏'}</option>)}</Select><Select className="filter-mode-select" aria-label="规则添加方式" value={mode} onChange={event => setMode(event.target.value as FilterRule['mode'])}><option value="reference">引用</option><option value="copy">拷贝</option></Select><Button variant="outline" disabled={!selectedRule} onClick={() => { if (selectedRule) setDraft(current => ({ ...current, rules: [...current.rules, addFilterRule(selectedRule, mode)] })) }}><Plus />添加</Button></div>
      <p className="field-description">{mode === 'reference' ? '引用：规则库中的修改会同步到过滤器；请前往规则编辑页修改原规则。' : '拷贝：保存独立副本，可在此编辑；规则库的后续修改不会影响它。'}{!rules.length && ' 请先到规则编辑页创建规则。'}</p>
      {((attempted && error) || missing) && <p id="filter-error" className="inline-alert" role="alert">{missing ? '引用的规则已删除，请移除失效引用或添加其他规则。' : error}</p>}
      </section>
      <section className="rule-live-text" aria-label="过滤器文本预览"><div><span><CodeXml aria-hidden="true" />过滤器文本</span><span>{draft.rules.length} 条规则 · 实时更新</span></div><pre aria-live="polite"><code>{source}</code></pre></section>
      </div>
    </div>
    <footer className="rule-dialog-footer"><span>规则从上到下执行，首条命中规则决定物品显示。</span><div><DialogClose asChild><Button variant="ghost">取消</Button></DialogClose><Button type="submit"><Check />{editing ? '保存修改' : '创建过滤器'}</Button></div></footer>
    {editingEntry?.mode === 'copy' && <RuleBuilder initialRule={editingEntry.rule} returnFocusId={`edit-filter-rule-${editingEntry.id}`} description="修改过滤器中的独立副本，保存后仅更新当前过滤器。" onClose={() => setEditingCopyId(null)} onSave={rule => setDraft(current => ({ ...current, rules: current.rules.map(entry => entry.id === editingEntry.id ? { id: entry.id, mode: 'copy', rule } : entry) }))} />}
  </form></DialogContent></Dialog>
}
