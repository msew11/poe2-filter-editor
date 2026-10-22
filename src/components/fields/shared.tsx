import type { ReactNode } from 'react'
import type { RuleField } from '@/lib/rules'
import { Select } from '@/components/ui/select'
import { comparisonOperators } from '@/lib/rules'

export interface FieldEditorProps { field: RuleField; onChange: (params: Record<string, string>) => void }
export function FieldControl({ label, children }: { label: string; children: ReactNode }) { return <label className="field-control"><span>{label}</span>{children}</label> }
export function OperatorSelect({ field, onChange }: FieldEditorProps) {
  return <FieldControl label="比较方式"><Select aria-label="比较方式" value={field.params.operator} onChange={e => onChange({ operator: e.target.value })}>{comparisonOperators.map(op => <option key={op} value={op}>{op}</option>)}</Select></FieldControl>
}
