/** Match category names and the minimum item level for the currently selected tier. */
export function matchesClassSearch(query: string, name: string, level: number | null): boolean {
  const checks: boolean[] = []
  const text = query.replace(/(>=|<=|==|=|>|<|≥|≤)?\s*(\d+)(?:\s*[-~～–]\s*(\d+))?/g,
    (_, operator: string | undefined, first: string, last: string | undefined) => {
      const value = Number(first)
      if (level === null) checks.push(false)
      else if (last !== undefined) checks.push(!operator && level >= value && level <= Number(last))
      else {
        switch (operator) {
          case '>=': case '≥': checks.push(level >= value); break
          case '<=': case '≤': checks.push(level <= value); break
          case '>': checks.push(level > value); break
          case '<': checks.push(level < value); break
          default: checks.push(level === value)
        }
      }
      return ' '
    }).trim().toLowerCase().replace(/\s+/g, ' ')
  return checks.every(Boolean) && name.toLowerCase().includes(text)
}
