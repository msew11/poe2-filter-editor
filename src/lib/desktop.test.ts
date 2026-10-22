import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mockIPC, clearMocks } from '@tauri-apps/api/mocks'
import { isDesktop, type DesktopDirectory } from './desktop'
import { pickFilterDirectory, readFilterDirectory, saveFilterDirectory, exportFilterToDirectory, directoryError, supportsDirectoryPicker } from './filter-directory'
import { addFilterRule, createFilter, downloadFilter, serializeFilter } from './filters'
import { createRule } from './rules'

test('desktop exports use native dialogs and UTF-8 text, preserve cancellation, and report write errors', async () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  Object.defineProperty(globalThis, 'window', { value: {}, configurable: true })
  try {
    const directory: DesktopDirectory = { kind: 'desktop', name: '过滤器', path: 'D:\\游戏\\过滤器' }
    const calls: { command: string; payload: unknown }[] = []
    let cancel = false
    let failedWrite = false
    mockIPC((command, payload) => {
      calls.push({ command, payload })
      if (command === 'pick_filter_directory') return cancel ? null : directory
      if (command === 'read_filter_directory') return directory
      if (command === 'save_filter') return !cancel
      if (command === 'export_filter' && failedWrite) throw '磁盘空间不足'
    })
    assert.ok(isDesktop())
    assert.ok(supportsDirectoryPicker())
    assert.deepEqual(await readFilterDirectory(), directory)
    assert.deepEqual(await pickFilterDirectory(null), directory)
    await saveFilterDirectory(directory)
    assert.equal(calls.at(-1)?.command, 'pick_filter_directory')
    await saveFilterDirectory(null)
    assert.equal(calls.at(-1)?.command, 'clear_filter_directory')

    const rule = createRule(); rule.name = '中文规则'
    const filter = createFilter(); filter.name = '中文过滤器'; filter.rules = [addFilterRule(rule, 'reference')]
    assert.equal(await exportFilterToDirectory(filter, [rule], directory), '中文过滤器.filter')
    assert.deepEqual(calls.at(-1), {
      command: 'export_filter', payload: { filename: '中文过滤器.filter', source: serializeFilter(filter, [rule]) },
    })
    await downloadFilter(filter, [rule])
    assert.equal(calls.at(-1)?.command, 'save_filter')
    cancel = true
    await assert.rejects(pickFilterDirectory(directory), { name: 'AbortError' })
    await assert.rejects(downloadFilter(filter, [rule]), { name: 'AbortError' })
    failedWrite = true
    await assert.rejects(exportFilterToDirectory(filter, [rule], directory), error => {
      assert.equal(directoryError(error), '磁盘空间不足')
      return true
    })
  } finally {
    clearMocks()
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow)
    else Reflect.deleteProperty(globalThis, 'window')
  }
})
