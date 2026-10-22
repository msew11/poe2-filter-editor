import { ruleFileName, serializeRule, type Rule } from './rules'
import { filterError, filterFileName, serializeFilter, type Filter } from './filters'

// File System Access permission methods are not yet included in TypeScript's DOM types.
export interface FilterDirectory extends FileSystemDirectoryHandle {
  queryPermission(options: { mode: 'readwrite' }): Promise<PermissionState>
  requestPermission(options: { mode: 'readwrite' }): Promise<PermissionState>
}

type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: (options: { id: string; mode: 'readwrite'; startIn?: FileSystemDirectoryHandle }) => Promise<FilterDirectory>
}

export function supportsDirectoryPicker() {
  return window.isSecureContext && typeof (window as DirectoryPickerWindow).showDirectoryPicker === 'function'
}

export async function pickFilterDirectory(current: FilterDirectory | null) {
  const pickerWindow = window as DirectoryPickerWindow
  if (!supportsDirectoryPicker() || !pickerWindow.showDirectoryPicker) throw new Error('请使用 Chrome 或 Edge 打开本地页面，以选择存放目录。')
  return pickerWindow.showDirectoryPicker({ id: 'exile-forge-filters', mode: 'readwrite', ...(current ? { startIn: current } : {}) })
}

// Directory handles must be structured-cloned into IndexedDB, not serialized to localStorage.
async function directoryStore(mode: IDBTransactionMode, write?: FilterDirectory | null): Promise<FilterDirectory | null> {
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    let blocked = false
    const request = indexedDB.open('exile-forge.settings', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('settings')
    request.onsuccess = () => {
      if (blocked) { request.result.close(); return }
      request.result.onversionchange = () => request.result.close()
      resolve(request.result)
    }
    request.onerror = () => reject(request.error)
    request.onblocked = () => { blocked = true; reject(new Error('设置存储被其他页面占用，请关闭其他工坊页面后重试。')) }
  })
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction('settings', mode)
      const store = transaction.objectStore('settings')
      const request = write === undefined ? store.get('filterDirectory') : write === null ? store.delete('filterDirectory') : store.put(write, 'filterDirectory')
      transaction.oncomplete = () => resolve(write === undefined ? request.result ?? null : write)
      transaction.onabort = () => reject(transaction.error ?? new Error('无法保存设置。'))
      transaction.onerror = () => reject(transaction.error ?? request.error)
    })
  } finally { database.close() }
}

export const readFilterDirectory = () => directoryStore('readonly')
export const saveFilterDirectory = (directory: FilterDirectory | null) => directoryStore('readwrite', directory)

export function directoryError(error: unknown) {
  const name = error instanceof Error ? error.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') return '没有目录写入权限，请重新选择目录并允许访问。'
  if (name === 'NotFoundError') return '所选目录已移动或删除，请在设置中重新选择。'
  if (name === 'QuotaExceededError') return '存储空间不足，请释放空间后重试。'
  return '操作失败，请重新选择目录后重试，并检查目录是否可写、浏览器是否允许存储设置。'
}

export async function exportRuleToDirectory(rule: Rule, directory: FilterDirectory) {
  return exportTextToDirectory(ruleFileName(rule), serializeRule(rule), directory)
}

export async function exportFilterToDirectory(filter: Filter, rules: Rule[], directory: FilterDirectory) {
  const error = filterError(filter, rules)
  if (error) throw new Error(error)
  return exportTextToDirectory(filterFileName(filter), serializeFilter(filter, rules), directory)
}

async function exportTextToDirectory(filename: string, source: string, directory: FilterDirectory) {
  const options = { mode: 'readwrite' } as const
  if (await directory.queryPermission(options) !== 'granted' && await directory.requestPermission(options) !== 'granted') {
    throw new DOMException('Directory permission denied', 'NotAllowedError')
  }
  const file = await directory.getFileHandle(filename, { create: true })
  const writable = await file.createWritable()
  try {
    await writable.write(source)
    await writable.close()
  } catch (error) {
    try { await writable.abort() } catch { /* Keep the original write error. */ }
    throw error
  }
  return filename
}
