import { useRef, useState, type FormEvent } from 'react'
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Check, CodeXml, GripVertical, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { fieldComponents } from '@/components/fields'
import { createField, createRule, fieldDefinitions, fieldError, fieldTypes, serializeRule, type FieldType, type Rule, type RuleField } from '@/lib/rules'

function SortableField({ field, onChange, onDelete, showError }: { field: RuleField; onChange: (params: Record<string, string>) => void; onDelete: () => void; showError: boolean }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: field.id })
  const definition = fieldDefinitions[field.type]
  const Editor = fieldComponents[field.type]
  const error = showError ? fieldError(field) : undefined
  return <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`field-card ${isDragging ? 'is-dragging' : ''} ${error ? 'has-error' : ''}`} data-field-id={field.id} data-field-type={field.type}>
    <button type="button" ref={setActivatorNodeRef} className="field-drag-handle" {...attributes} {...listeners} aria-label={`拖动${definition.label}字段`} title="拖动调整字段顺序"><GripVertical aria-hidden="true" /></button>
    <div className="field-card-title"><strong>{definition.label}</strong><code title={field.type}>{field.type}</code></div>
    <div className="field-card-options"><Editor field={field} onChange={onChange} /></div>
    <Button variant="ghost" size="icon" className="field-delete-button" aria-label={`删除${definition.label}字段`} title="删除字段" onClick={onDelete}><Trash2 /></Button>
    {error && <p className="field-error" role="alert">{error}</p>}
  </li>
}

export function RuleBuilder({ initialRule, copying = false, returnFocusId, description, onClose, onSave }: { initialRule?: Rule; copying?: boolean; returnFocusId: string; description?: string; onClose: () => void; onSave: (rule: Rule) => void }) {
  const editing = !!initialRule && !copying
  const [draft, setDraft] = useState<Rule>(() => initialRule ? structuredClone(initialRule) : createRule())
  const [type, setType] = useState<FieldType>('Quality')
  const [attempted, setAttempted] = useState(false)
  const dragging = useRef(false)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))
  const errors = draft.fields.filter(field => fieldError(field))
  function reorder(event: DragEndEvent) {
    dragging.current = false
    if (!event.over || event.active.id === event.over.id) return
    setDraft(current => { const from = current.fields.findIndex(f => f.id === event.active.id); const to = current.fields.findIndex(f => f.id === event.over?.id); return from < 0 || to < 0 ? current : { ...current, fields: arrayMove(current.fields, from, to) } })
  }
  function submit(event: FormEvent) {
    event.preventDefault(); event.stopPropagation(); setAttempted(true)
    if (!draft.name.trim()) { document.getElementById('rule-name')?.focus(); return }
    if (errors.length) { document.querySelector<HTMLElement>(`[data-field-id="${errors[0].id}"] input, [data-field-id="${errors[0].id}"] select, [data-field-id="${errors[0].id}"] textarea`)?.focus(); return }
    onSave({ ...draft, name: draft.name.trim() }); onClose()
  }
  return <Dialog open onOpenChange={open => { if (!open) onClose() }}><DialogContent className="rule-dialog" onEscapeKeyDown={event => { if (dragging.current) event.preventDefault() }} onCloseAutoFocus={event => { event.preventDefault(); document.getElementById(returnFocusId)?.focus() }}><form onSubmit={submit} noValidate>
    <header className="rule-dialog-header"><p className="page-kicker">RULE / {copying ? 'COPY' : editing ? 'EDIT' : 'CREATE'}</p><DialogTitle>{copying ? '复制规则' : editing ? '编辑规则' : '创建规则'}</DialogTitle><DialogDescription>{description || (copying ? '修改副本的名称、类型与字段，保存为一条独立的新规则。' : editing ? '修改规则名称、类型与字段，保存后同步更新引用此规则的过滤器。' : '定义一条独立规则，可在过滤器编辑页引用或拷贝。')}</DialogDescription></header>
    <div className="rule-dialog-body">
      <div className="rule-basics"><div className="rule-name-input"><label htmlFor="rule-name">规则名称</label><Input id="rule-name" placeholder="例如：保留高品质装备" maxLength={100} value={draft.name} aria-invalid={attempted && !draft.name.trim()} aria-describedby={attempted && !draft.name.trim() ? 'rule-name-error' : undefined} onChange={e => setDraft(current => ({ ...current, name: e.target.value }))} autoComplete="off" />{attempted && !draft.name.trim() && <span id="rule-name-error" role="alert" className="field-error">请为规则命名。</span>}</div><fieldset className="rule-action-input"><legend>规则类型</legend><div className="rule-action-selector"><button type="button" className={draft.action === 'Show' ? 'selected-show' : ''} aria-pressed={draft.action === 'Show'} onClick={() => setDraft(current => ({ ...current, action: 'Show' }))}>显示 <span>Show</span></button><button type="button" className={draft.action === 'Hide' ? 'selected-hide' : ''} aria-pressed={draft.action === 'Hide'} onClick={() => setDraft(current => ({ ...current, action: 'Hide' }))}>隐藏 <span>Hide</span></button></div></fieldset></div>
      <div className="field-section-heading"><h3>规则字段 <span>{draft.fields.length}</span></h3><span>拖动左侧手柄调整字段顺序</span></div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={() => { dragging.current = true }} onDragEnd={reorder} onDragCancel={() => { dragging.current = false }} accessibility={{ screenReaderInstructions: { draggable: '按空格键拾起字段，使用上下方向键移动，再按空格键放下。按 Escape 取消。' }, announcements: { onDragStart: () => '已拾起字段。', onDragOver: ({ over }) => over ? '字段位置已调整。' : '移出字段列表。', onDragEnd: () => '字段已放下。', onDragCancel: () => '已取消移动。' } }}><SortableContext items={draft.fields.map(field => field.id)} strategy={verticalListSortingStrategy}>
        <ol className="rule-fields" aria-label="规则字段列表">{draft.fields.map(field => <SortableField key={field.id} field={field} showError={attempted} onChange={params => setDraft(current => ({ ...current, fields: current.fields.map(f => f.id === field.id ? { ...f, params: { ...f.params, ...params } } : f) }))} onDelete={() => setDraft(current => ({ ...current, fields: current.fields.filter(f => f.id !== field.id) }))} />)}</ol>
      </SortableContext></DndContext>
      {!draft.fields.length && <div className="empty-fields"><Plus aria-hidden="true" /><span>添加第一个字段，开始定义这条规则。</span></div>}
      <div className="add-field-row"><label htmlFor="new-field-type">添加字段</label><Select id="new-field-type" value={type} onChange={e => setType(e.target.value as FieldType)}>{(['条件', '外观', '提示'] as const).map(group => <optgroup key={group} label={group}>{fieldTypes.filter(type => fieldDefinitions[type].group === group).map(type => <option key={type} value={type}>{fieldDefinitions[type].label} · {type}</option>)}</optgroup>)}</Select><Button variant="outline" onClick={() => setDraft(current => ({ ...current, fields: [...current.fields, createField(type)] }))}><Plus />添加</Button></div>
      <section className="rule-live-text" aria-label="规则文本预览"><div><span><CodeXml aria-hidden="true" />规则文本</span><span>{errors.length ? `${errors.length} 个字段待完善` : '实时更新'}</span></div><pre aria-live="polite"><code>{serializeRule(draft)}</code></pre></section>
    </div>
    <footer className="rule-dialog-footer"><span>{draft.fields.filter(f => fieldDefinitions[f.type].group === '条件').length ? '同一规则的所有条件需同时满足。' : '未添加条件时，这条规则将匹配所有物品。'}</span><div><DialogClose asChild><Button variant="ghost">取消</Button></DialogClose><Button type="submit"><Check />{copying ? '保存副本' : editing ? '保存修改' : '创建规则'}</Button></div></footer>
  </form></DialogContent></Dialog>
}

