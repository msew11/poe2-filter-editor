import { useState } from 'react'
import { Check, Copy, Download, FileCode2, Pencil, Plus, ScrollText, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FilterBuilder } from '@/components/filter-builder'
import { PageTitle, type UpdateWorkspace } from '@/components/pages'
import { downloadFilter, filterError, serializeFilter, type Filter } from '@/lib/filters'
import { directoryError, exportFilterToDirectory, type FilterDirectory } from '@/lib/filter-directory'
import type { Workspace } from '@/lib/workspace'
import type { Rule } from '@/lib/rules'

function FilterRow({ filter, rules, directory, directoryLoading, onEdit, onDelete }: { filter: Filter; rules: Rule[]; directory: FilterDirectory | null; directoryLoading: boolean; onEdit: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [feedback, setFeedback] = useState<{ error: boolean; text: string } | null>(null)
  const error = filterError(filter, rules)
  const source = error ? '' : serializeFilter(filter, rules)
  async function copy() {
    try { await navigator.clipboard.writeText(source); setCopied(true); setFeedback(null); setTimeout(() => setCopied(false), 2200) }
    catch { setExpanded(true); setFeedback({ error: true, text: '复制失败，请在下方选中文本手动复制。' }) }
  }
  async function exportFilter() {
    if (error || exporting || directoryLoading) return
    setExporting(true); setFeedback(null)
    try {
      if (directory) {
        const filename = await exportFilterToDirectory(filter, rules, directory)
        setFeedback({ error: false, text: `已保存至 ${directory.name} / ${filename}` })
      } else await downloadFilter(filter, rules)
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) setFeedback({ error: true, text: directoryError(error) })
    } finally { setExporting(false) }
  }
  return <article className="rule-row library-rule filter-library-row" data-filter-id={filter.id}>
    <div className="library-rule-header filter-library-header">
      <ScrollText className="filter-library-icon" aria-hidden="true" /><h2 className="library-rule-name" title={filter.name}>{filter.name}</h2>
      <span className="rule-field-count">{filter.rules.length} 条规则</span>
      <div className="library-rule-summary"><span className="filter-rule-mode is-reference">{filter.rules.filter(entry => entry.mode === 'reference').length} 引用</span><span className="filter-rule-mode">{filter.rules.filter(entry => entry.mode === 'copy').length} 拷贝</span></div>
      <div className="library-rule-actions">
        <Button variant="ghost" size="sm" aria-label={`${expanded ? '收起' : '展开'}过滤器文本：${filter.name}`} aria-expanded={expanded} aria-controls={`filter-text-${filter.id}`} title="过滤器文本" onClick={() => setExpanded(value => !value)}><FileCode2 /><span>文本</span></Button>
        <Button variant="ghost" size="sm" disabled={!!error} aria-label={`复制过滤器文本：${filter.name}`} title="复制过滤器文本" onClick={() => void copy()}>{copied ? <Check /> : <Copy />}<span>{copied ? '已复制' : '复制'}</span></Button>
        <Button variant="ghost" size="sm" disabled={!!error || exporting || directoryLoading} aria-label={`导出过滤器：${filter.name}`} title="导出过滤器" onClick={() => void exportFilter()}><Download /><span>{exporting ? '导出中…' : '导出'}</span></Button>
        <Button id={`edit-filter-${filter.id}`} variant="ghost" size="sm" aria-label={`编辑过滤器：${filter.name}`} title="编辑过滤器" onClick={onEdit}><Pencil /><span>编辑</span></Button>
        <Button variant="ghost" size="icon" className="delete-rule-button" aria-label={`删除过滤器：${filter.name}`} title="删除过滤器" onClick={onDelete}><Trash2 /></Button>
      </div>
    </div>
    {error && <p className="inline-alert filter-row-feedback" role="alert">{error}</p>}
    {feedback && <p className={`${feedback.error ? 'inline-alert' : 'export-success'} filter-row-feedback`} role={feedback.error ? 'alert' : 'status'}>{feedback.text}</p>}
    <div id={`filter-text-${filter.id}`} className="library-rule-source" hidden={!expanded}><pre tabIndex={0} aria-label={`过滤器文本：${filter.name}`}><code>{source || '# 请修复过滤器后查看文本。'}</code></pre></div>
  </article>
}

export function FiltersPage({ workspace, update, directory, directoryLoading }: { workspace: Workspace; update: UpdateWorkspace; directory: FilterDirectory | null; directoryLoading: boolean }) {
  const [editor, setEditor] = useState<{ mode: 'create' } | { mode: 'edit'; filter: Filter } | null>(null)
  return <>
    <PageTitle section="FILTER LIBRARY" title="过滤器编辑" extra={<Button id="create-filter" onClick={() => setEditor({ mode: 'create' })}><Plus />创建过滤器</Button>} />
    <div className="rule-library-intro"><span>{workspace.filters.length} 个过滤器</span><p>组合规则创建过滤器。引用随原规则更新，拷贝保留独立副本。</p></div>
    <div className="rule-list" aria-label="过滤器库">{workspace.filters.map(filter => <FilterRow key={filter.id} filter={filter} rules={workspace.rules} directory={directory} directoryLoading={directoryLoading} onEdit={() => setEditor({ mode: 'edit', filter })} onDelete={() => update(current => ({ ...current, filters: current.filters.filter(item => item.id !== filter.id) }))} />)}</div>
    {!workspace.filters.length && <div className="rule-library-empty"><ScrollText aria-hidden="true" /><h2>还没有过滤器</h2><p>点击“创建过滤器”，命名并添加你的规则。</p></div>}
    {editor && <FilterBuilder key={editor.mode === 'edit' ? editor.filter.id : 'create'} initialFilter={editor.mode === 'edit' ? editor.filter : undefined} rules={workspace.rules} returnFocusId={editor.mode === 'edit' ? `edit-filter-${editor.filter.id}` : 'create-filter'} onClose={() => setEditor(null)} onSave={filter => update(current => ({ ...current, filters: editor.mode === 'edit' ? current.filters.map(item => item.id === filter.id ? filter : item) : [...current.filters, filter] }))} />}
  </>
}
