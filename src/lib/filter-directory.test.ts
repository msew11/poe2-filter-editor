import assert from 'node:assert/strict'
import { test } from 'node:test'
import { directoryError, exportRuleToDirectory, type FilterDirectory } from './filter-directory'
import { createRule, ruleFileName, serializeRule } from './rules'

function directoryMock(permission: PermissionState, requested: PermissionState = 'granted', writeError?: Error) {
  const calls: string[] = []
  let contents = ''
  const directory = {
    queryPermission: async () => { calls.push('query'); return permission },
    requestPermission: async () => { calls.push('request'); return requested },
    getFileHandle: async (name: string, options: { create: boolean }) => {
      calls.push(`file:${name}:${options.create}`)
      return { createWritable: async () => ({
        write: async (text: string) => { calls.push('write'); if (writeError) throw writeError; contents = text },
        close: async () => { calls.push('close') },
        abort: async () => { calls.push('abort') },
      }) }
    },
  } as unknown as FilterDirectory
  return { directory, calls, contents: () => contents }
}

test('exports complete UTF-8 filter text and closes the file after writing', async () => {
  const rule = createRule(); rule.name = '我的规则'
  const mock = directoryMock('granted')
  assert.equal(await exportRuleToDirectory(rule, mock.directory), '我的规则.filter')
  assert.equal(mock.contents(), serializeRule(rule))
  assert.deepEqual(mock.calls, ['query', 'file:我的规则.filter:true', 'write', 'close'])
})

test('requests renewed permission for a restored directory before exporting', async () => {
  const rule = createRule(); rule.name = 'renewed'
  const mock = directoryMock('prompt')
  await exportRuleToDirectory(rule, mock.directory)
  assert.deepEqual(mock.calls, ['query', 'request', 'file:renewed.filter:true', 'write', 'close'])
})

test('denied permission never creates or writes a file', async () => {
  const mock = directoryMock('denied', 'denied')
  await assert.rejects(exportRuleToDirectory(createRule(), mock.directory), { name: 'NotAllowedError' })
  assert.deepEqual(mock.calls, ['query', 'request'])
})

test('failed writes abort the stream and preserve the original error', async () => {
  const error = new DOMException('Disk full', 'QuotaExceededError')
  const mock = directoryMock('granted', 'granted', error)
  await assert.rejects(exportRuleToDirectory(createRule(), mock.directory), error)
  assert.deepEqual(mock.calls.slice(-2), ['write', 'abort'])
  assert.ok(!mock.calls.includes('close'))
})

test('filter filenames are valid for Windows directories and handle reserved device names', () => {
  const rule = createRule()
  for (const [name, filename] of [['a/b:c? .', 'a_b_c_.filter'], ['CON', '_CON.filter'], ['nul.txt', '_nul.txt.filter'], ['...', 'exile-rule.filter']]) {
    rule.name = name
    assert.equal(ruleFileName(rule), filename)
  }
})

test('directory failures explain how to recover', () => {
  assert.match(directoryError(new DOMException('', 'NotFoundError')), /重新选择/)
  assert.match(directoryError(new DOMException('', 'NotAllowedError')), /权限/)
  assert.match(directoryError(new DOMException('', 'QuotaExceededError')), /空间不足/)
})
