import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { effectColors, iconShapes } from '@/lib/rules'
import { FieldControl, type FieldEditorProps } from './shared'

const colorNames: Record<string, string> = { Red: '红色', Green: '绿色', Blue: '蓝色', Brown: '棕色', White: '白色', Yellow: '黄色', Cyan: '青色', Grey: '灰色', Orange: '橙色', Pink: '粉色', Purple: '紫色' }
function ColorOptions() { return <>{effectColors.map(color => <option key={color} value={color}>{colorNames[color]} / {color}</option>)}</> }
function ColorField({ field, onChange }: FieldEditorProps) {
  return <><FieldControl label="颜色"><span className="field-color-picker"><input type="color" aria-label="颜色" value={field.params.value} onChange={e => onChange({ value: e.target.value })} /><code>{field.params.value.toUpperCase()}</code></span></FieldControl><FieldControl label="透明度 0–255"><Input type="number" min="0" max="255" step="1" value={field.params.alpha} onChange={e => onChange({ alpha: e.target.value })} /></FieldControl></>
}
export function SetTextColorField(props: FieldEditorProps) { return <ColorField {...props} /> }
export function SetBackgroundColorField(props: FieldEditorProps) { return <ColorField {...props} /> }
export function SetBorderColorField(props: FieldEditorProps) { return <ColorField {...props} /> }
export function SetFontSizeField({ field, onChange }: FieldEditorProps) { return <FieldControl label="字号 1–45"><Input type="number" min="1" max="45" step="1" value={field.params.value} onChange={e => onChange({ value: e.target.value })} /></FieldControl> }
export function PlayAlertSoundField({ field, onChange }: FieldEditorProps) {
  return <><FieldControl label="音效"><Select value={field.params.sound} onChange={e => onChange({ sound: e.target.value })}><option value="None">无音效 / None</option>{Array.from({ length: 16 }, (_, i) => <option key={i + 1} value={i + 1}>音效 {i + 1}</option>)}</Select></FieldControl>{field.params.sound !== 'None' && <FieldControl label="音量 0–300"><Input type="number" min="0" max="300" step="1" value={field.params.volume} onChange={e => onChange({ volume: e.target.value })} /></FieldControl>}</>
}
export function PlayEffectField({ field, onChange }: FieldEditorProps) {
  return <><FieldControl label="光柱颜色"><Select value={field.params.color} onChange={e => onChange({ color: e.target.value })}><option value="None">无光柱 / None</option><ColorOptions /></Select></FieldControl>{field.params.color !== 'None' && <FieldControl label="持续方式"><Select value={field.params.temporary} onChange={e => onChange({ temporary: e.target.value })}><option value="False">持续显示</option><option value="True">仅掉落时 / Temp</option></Select></FieldControl>}</>
}
export function MinimapIconField({ field, onChange }: FieldEditorProps) {
  return <><FieldControl label="图标大小"><Select value={field.params.size} onChange={e => onChange({ size: e.target.value })}><option value="-1">不显示</option><option value="0">大 / 0</option><option value="1">中 / 1</option><option value="2">小 / 2</option></Select></FieldControl>{field.params.size !== '-1' && <><FieldControl label="图标颜色"><Select value={field.params.color} onChange={e => onChange({ color: e.target.value })}><ColorOptions /></Select></FieldControl><FieldControl label="图标形状"><Select value={field.params.shape} onChange={e => onChange({ shape: e.target.value })}>{iconShapes.map(shape => <option key={shape} value={shape}>{shape}</option>)}</Select></FieldControl></>}</>
}
