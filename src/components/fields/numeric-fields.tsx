import { Input } from '@/components/ui/input'
import { FieldControl, OperatorSelect, type FieldEditorProps } from './shared'

function NumericField(props: FieldEditorProps) {
  return <><OperatorSelect {...props} /><FieldControl label="数值"><Input type="number" min="0" step="1" aria-label="数值" value={props.field.params.value} onChange={e => props.onChange({ value: e.target.value })} /></FieldControl></>
}

// Separate registered components allow each game field to gain its own options later.
export function QualityField(props: FieldEditorProps) { return <NumericField {...props} /> }
export function ItemLevelField(props: FieldEditorProps) { return <NumericField {...props} /> }
export function DropLevelField(props: FieldEditorProps) { return <NumericField {...props} /> }
export function AreaLevelField(props: FieldEditorProps) { return <NumericField {...props} /> }
export function StackSizeField(props: FieldEditorProps) { return <NumericField {...props} /> }
export function SocketsField(props: FieldEditorProps) { return <NumericField {...props} /> }
export function WaystoneTierField(props: FieldEditorProps) { return <NumericField {...props} /> }
export function UnidentifiedItemTierField(props: FieldEditorProps) { return <NumericField {...props} /> }
export function BaseArmourField(props: FieldEditorProps) { return <NumericField {...props} /> }
export function BaseEvasionField(props: FieldEditorProps) { return <NumericField {...props} /> }
export function BaseEnergyShieldField(props: FieldEditorProps) { return <NumericField {...props} /> }
