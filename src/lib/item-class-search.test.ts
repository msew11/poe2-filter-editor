import assert from 'node:assert/strict'
import { test } from 'node:test'
import { matchesClassSearch } from './item-class-search'

test('category searches retain Chinese, case-insensitive English, and empty queries', () => {
  for (const query of ['', '  ', '戒指', ' rInG ']) assert.equal(matchesClassSearch(query, '戒指 Rings', 82), true)
  assert.equal(matchesClassSearch('药剂', '戒指 Rings', 82), false)
  assert.equal(matchesClassSearch('通货', '通货 Currency', null), true)
})

test('numeric searches match exact calculated levels rather than digits or tier numbers', () => {
  assert.equal(matchesClassSearch('71', '戒指 Rings', 71), true)
  assert.equal(matchesClassSearch('7', '戒指 Rings', 71), false)
  assert.equal(matchesClassSearch('71', '戒指 Rings', 82), false)
  assert.equal(matchesClassSearch('1', '珠宝 Jewels', 1), true)
})

test('comparisons, inclusive ranges, and combined searches respect boundaries', () => {
  for (const query of ['>=71', '<=71', '=71', '==71', '≥71', '≤71', '>70', '<72', '71-82', '65 ~ 71', '戒指 >= 71', 'RINGS >=65 <=71']) {
    assert.equal(matchesClassSearch(query, '戒指 Rings', 71), true, query)
  }
  for (const query of ['>71', '<71', '72-82', '82-71', '项链 >=65', '>=72 <=82', '>=abc', '71-']) {
    assert.equal(matchesClassSearch(query, '戒指 Rings', 71), false, query)
  }
})

test('numeric filters exclude categories without affixes and follow changed tier thresholds', () => {
  for (const query of ['0', '<=99', '1-99', 'Currency >=1']) assert.equal(matchesClassSearch(query, '通货 Currency', null), false)
  assert.equal(matchesClassSearch('<=71', '戒指 Rings', 82), false)
  assert.equal(matchesClassSearch('<=71', '戒指 Rings', 71), true)
  assert.equal(matchesClassSearch('<=71', '戒指 Rings', 65), true)
})
