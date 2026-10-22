import { Select } from '@/components/ui/select'
import { rarities, rarityLabels } from '@/lib/rules'
import { FieldControl, OperatorSelect, type FieldEditorProps } from './shared'

export function RarityField(props: FieldEditorProps) {
  return <><OperatorSelect {...props} /><FieldControl label="稀有度"><Select aria-label="稀有度" value={props.field.params.value} onChange={e => props.onChange({ value: e.target.value })}>{rarities.map(value => <option key={value} value={value}>{rarityLabels[value]}</option>)}</Select></FieldControl></>
}
function TextListField({ field, onChange }: FieldEditorProps) {
  return <><FieldControl label="匹配方式"><Select value={field.params.match} onChange={e => onChange({ match: e.target.value })}><option value="==">精确匹配 ==</option><option value="partial">部分匹配</option></Select></FieldControl><FieldControl label="匹配值 · 每行一个"><textarea className="forge-textarea" rows={2} placeholder={field.type === 'Class' ? 'Body Armours\nHelmets' : 'Iron Cuirass\nCrude Bow'} value={field.params.value} onChange={e => onChange({ value: e.target.value })} spellCheck={false} /></FieldControl></>
}
export function ClassField(props: FieldEditorProps) { return <TextListField {...props} /> }
export function BaseTypeField(props: FieldEditorProps) { return <TextListField {...props} /> }
function BooleanField({ field, onChange }: FieldEditorProps) { return <FieldControl label="是否符合"><Select value={field.params.value} onChange={e => onChange({ value: e.target.value })}><option value="True">是 / True</option><option value="False">否 / False</option></Select></FieldControl> }
export function IdentifiedField(props: FieldEditorProps) { return <BooleanField {...props} /> }
export function CorruptedField(props: FieldEditorProps) { return <BooleanField {...props} /> }
export function MirroredField(props: FieldEditorProps) { return <BooleanField {...props} /> }
export function TwiceCorruptedField(props: FieldEditorProps) { return <BooleanField {...props} /> }
