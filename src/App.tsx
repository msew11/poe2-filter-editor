import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, FlaskConical, Gem, ListFilter, Palette, PanelsTopLeft, ScanEye, ScrollText, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AppearancePage, PreviewPage, RulesPage } from '@/components/pages'
import { FiltersPage } from '@/components/filters-page'
import { SettingsDialog } from '@/components/settings-dialog'
import { readFilterDirectory, type FilterDirectory } from '@/lib/filter-directory'
import { isDesktop } from '@/lib/desktop'
import { STORAGE_KEY, pageIds, pageLabels, readWorkspace, type PageId, type Workspace } from '@/lib/workspace'

const CraftingPage = lazy(() => import('@/components/crafting-page').then(module => ({ default: module.CraftingPage })))

const navigation = [
  { id: 'rules', icon: ListFilter, number: '01' },
  { id: 'appearance', icon: Palette, number: '02' },
  { id: 'preview', icon: ScanEye, number: '03' },
  { id: 'source', icon: ScrollText, number: '04' },
  { id: 'crafting', icon: FlaskConical, number: '05' },
] as const

export default function App() {
  const [workspace, setWorkspace] = useState<Workspace>(readWorkspace)
  const [directory, setDirectory] = useState<FilterDirectory | null>(null)
  const [directoryLoading, setDirectoryLoading] = useState(true)
  const [directoryLoadError, setDirectoryLoadError] = useState('')
  const [saveStatus, setSaveStatus] = useState<'saved' | 'pending' | 'failed'>('pending')
  const tabRefs = useRef<Partial<Record<PageId, HTMLButtonElement | null>>>({})
  const navRefs = useRef<Partial<Record<PageId, HTMLButtonElement | null>>>({})

  useEffect(() => {
    let active = true
    readFilterDirectory().then(value => { if (active) setDirectory(value) }).catch(() => {
      if (active) setDirectoryLoadError(isDesktop() ? '无法读取目录设置，请重新选择目录。当前导出将提示选择保存位置。' : '无法读取目录设置，请重新选择目录。当前导出将使用浏览器下载。')
    }).finally(() => { if (active) setDirectoryLoading(false) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    setSaveStatus('pending')
    const timeout = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace)); setSaveStatus('saved') } catch { setSaveStatus('failed') }
    }, 250)
    return () => clearTimeout(timeout)
  }, [workspace])

  // Flush pending edits when the page is left before the debounced save runs.
  useEffect(() => {
    const save = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace)) } catch { /* The status bar reports storage failures. */ } }
    window.addEventListener('pagehide', save)
    return () => window.removeEventListener('pagehide', save)
  }, [workspace])

  function openPage(id: PageId) {
    setWorkspace(current => ({ ...current, openTabs: current.openTabs.includes(id) ? current.openTabs : [...current.openTabs, id], activeTab: id }))
  }

  function closePage(id: PageId) {
    const index = workspace.openTabs.indexOf(id)
    const remaining = workspace.openTabs.filter(tab => tab !== id)
    const activeTab = workspace.activeTab === id ? remaining[Math.min(index, remaining.length - 1)] || '' : workspace.activeTab
    setWorkspace(current => ({ ...current, openTabs: remaining, activeTab }))
    requestAnimationFrame(() => { if (activeTab) tabRefs.current[activeTab]?.focus(); else navRefs.current[id]?.focus() })
  }

  return <div className="forge-app">
    <header className="app-header">
      <a className="brand" href="#" aria-label="Exile Forge 首页" onClick={e => { e.preventDefault(); openPage('rules') }}><span className="brand-mark" aria-hidden="true"><span /></span><span className="brand-copy"><strong>EXILE FORGE</strong><span>流放之路 2 · 过滤器工坊</span></span></a>
      <div className="header-actions"><span className="version-tag">WORKSHOP <span>0.2</span></span><SettingsDialog directory={directory} loading={directoryLoading} error={directoryLoadError} onChange={value => { setDirectory(value); setDirectoryLoadError('') }} /></div>
    </header>
    <div className="app-body">
      <aside className="sidebar" aria-label="功能导航">
        <p className="navigation-caption">工坊 <span>/ WORKSPACE</span></p>
        <nav className="navigation">{navigation.map(({ id, icon: Icon, number }) => <button key={id} type="button" ref={el => { navRefs.current[id] = el }} className={`navigation-item ${workspace.activeTab === id ? 'is-active' : ''}`} aria-current={workspace.activeTab === id ? 'page' : undefined} onClick={() => openPage(id)}><Icon aria-hidden="true" /><span className="navigation-label">{pageLabels[id]}{(id === 'appearance' || id === 'preview') && <span className="navigation-pending">待开发</span>}</span><span className="navigation-number">{number}</span></button>)}</nav>
        <div className="sidebar-footer"><Gem aria-hidden="true" /><div><span>{workspace.name.trim() || '未命名过滤器'}</span><span>本地工作区</span></div></div>
      </aside>
      <Tabs className="workspace" value={workspace.activeTab} onValueChange={id => { if (pageIds.includes(id as PageId)) setWorkspace(current => ({ ...current, activeTab: id as PageId })) }}>
        <div className="tab-strip"><TabsList className="workspace-tabs" aria-label="已打开的页面">{workspace.openTabs.map(id => <div className={`workspace-tab ${workspace.activeTab === id ? 'is-active' : ''}`} key={id}><TabsTrigger ref={el => { tabRefs.current[id] = el }} value={id}>{pageLabels[id]}</TabsTrigger><button type="button" className="tab-close" aria-label={`关闭${pageLabels[id]}`} onClick={() => closePage(id)}><X aria-hidden="true" /></button></div>)}</TabsList><span className="tab-strip-ornament" aria-hidden="true">◇</span></div>
        <main className="workspace-content" aria-label="工作区内容">
          {workspace.openTabs.length === 0 && <div className="empty-workspace"><PanelsTopLeft aria-hidden="true" /><h1>打开你的工作台</h1><p>从左侧导航选择一个页面，继续你的创作。</p><Button onClick={() => openPage('rules')}>开始编辑<ArrowRight /></Button></div>}
          <TabsContent value="rules" forceMount hidden={workspace.activeTab !== 'rules'}><RulesPage workspace={workspace} update={setWorkspace} /></TabsContent>
          <TabsContent value="appearance" forceMount hidden={workspace.activeTab !== 'appearance'}><AppearancePage workspace={workspace} update={setWorkspace} /></TabsContent>
          <TabsContent value="preview" forceMount hidden={workspace.activeTab !== 'preview'}><PreviewPage workspace={workspace} /></TabsContent>
          <TabsContent value="source" forceMount hidden={workspace.activeTab !== 'source'}><FiltersPage workspace={workspace} update={setWorkspace} directory={directory} directoryLoading={directoryLoading} /></TabsContent>
          <TabsContent value="crafting" className="crafting-tab" forceMount hidden={workspace.activeTab !== 'crafting'}>{workspace.openTabs.includes('crafting') && <Suspense fallback={<p role="status">正在加载做装模拟…</p>}><CraftingPage /></Suspense>}</TabsContent>
        </main>
        <footer className="status-bar"><span className="status-dot" /><span>{workspace.activeTab ? pageLabels[workspace.activeTab] : '工作区'}</span><span className="save-status" role="status">{saveStatus === 'saved' && <Check aria-hidden="true" />}{saveStatus === 'saved' ? '已保存至本机' : saveStatus === 'failed' ? '无法自动保存，请导出备份' : '正在保存…'}</span><span className="status-wordmark">PATH OF EXILE 2</span></footer>
      </Tabs>
    </div>
  </div>
}
