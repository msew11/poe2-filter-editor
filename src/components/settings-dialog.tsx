import { useState } from 'react'
import { Check, FolderOpen, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { directoryError, pickFilterDirectory, saveFilterDirectory, supportsDirectoryPicker, type FilterDirectory } from '@/lib/filter-directory'
import { isDesktop } from '@/lib/desktop'

interface SettingsDialogProps {
  directory: FilterDirectory | null
  loading: boolean
  error: string
  onChange: (directory: FilterDirectory | null) => void
}

export function SettingsDialog({ directory, loading, error, onChange }: SettingsDialogProps) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')
  const supported = supportsDirectoryPicker()
  const desktop = isDesktop()

  async function changeDirectory(clear = false) {
    setBusy(true)
    setFeedback('')
    try {
      const next = clear ? null : await pickFilterDirectory(directory)
      await saveFilterDirectory(next)
      onChange(next)
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) setFeedback(directoryError(error))
    } finally { setBusy(false) }
  }

  return <Dialog open={open} onOpenChange={value => { if (!busy) { setOpen(value); setFeedback('') } }}>
    <DialogTrigger asChild><Button aria-label="设置"><Settings aria-hidden="true" /><span>设置</span></Button></DialogTrigger>
    <DialogContent className="settings-dialog">
      <header className="rule-dialog-header"><p className="page-kicker">WORKSHOP / SETTINGS</p><DialogTitle>设置</DialogTitle><DialogDescription>管理工坊的本地偏好设置。</DialogDescription></header>
      <div className="settings-body" aria-busy={busy || loading}>
        <label className="settings-label" htmlFor="filter-directory">过滤器存放目录</label>
        <p id="filter-directory-help" className="settings-description">导出的 .filter 文件将保存到此目录，同名文件会被替换。</p>
        <div className="settings-directory-row"><Input id="filter-directory" readOnly value={loading ? '正在读取设置…' : directory && 'path' in directory ? directory.path : directory?.name ?? ''} placeholder={desktop ? '未设置，导出时选择保存位置' : '未设置，使用浏览器默认下载位置'} aria-describedby="filter-directory-help filter-directory-note" /><Button disabled={!supported || busy || loading} onClick={() => void changeDirectory()}><FolderOpen aria-hidden="true" />{busy ? '处理中…' : directory ? '更改目录' : '选择目录'}</Button></div>
        <p id="filter-directory-note" className="settings-description">{desktop ? '建议选择游戏的过滤器目录，设置会自动保存至本机。' : '建议选择游戏的过滤器目录。浏览器仅显示文件夹名称，设置会自动保存至本机。'}</p>
        {!supported && <p className="inline-alert" role="status">当前浏览器不支持选择存放目录，请使用 Chrome 或 Edge 打开本地页面。仍可通过浏览器下载导出文件。</p>}
        {(feedback || error) && <p className="inline-alert" role="alert">{feedback || error}</p>}
        {directory && <div className="settings-directory-footer"><span role="status"><Check aria-hidden="true" />已设置：{directory.name}</span><Button variant="ghost" size="sm" disabled={busy || loading} onClick={() => void changeDirectory(true)}>{desktop ? '每次选择保存位置' : '恢复默认下载位置'}</Button></div>}
      </div>
      <footer className="settings-footer"><DialogClose asChild><Button disabled={busy}>完成</Button></DialogClose></footer>
    </DialogContent>
  </Dialog>
}
