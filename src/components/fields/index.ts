import type { ComponentType } from 'react'
import type { FieldType } from '@/lib/rules'
import type { FieldEditorProps } from './shared'
import { QualityField, ItemLevelField, DropLevelField, AreaLevelField, StackSizeField, SocketsField, WaystoneTierField, UnidentifiedItemTierField, BaseArmourField, BaseEvasionField, BaseEnergyShieldField } from './numeric-fields'
import { RarityField, ClassField, BaseTypeField, IdentifiedField, CorruptedField, MirroredField, TwiceCorruptedField } from './condition-fields'
import { SetTextColorField, SetBackgroundColorField, SetBorderColorField, SetFontSizeField, PlayAlertSoundField, PlayEffectField, MinimapIconField } from './action-fields'

export const fieldComponents = {
  Quality: QualityField, ItemLevel: ItemLevelField, DropLevel: DropLevelField, AreaLevel: AreaLevelField, StackSize: StackSizeField, Sockets: SocketsField, WaystoneTier: WaystoneTierField, UnidentifiedItemTier: UnidentifiedItemTierField, BaseArmour: BaseArmourField, BaseEvasion: BaseEvasionField, BaseEnergyShield: BaseEnergyShieldField,
  Rarity: RarityField, Class: ClassField, BaseType: BaseTypeField, Identified: IdentifiedField, Corrupted: CorruptedField, Mirrored: MirroredField, TwiceCorrupted: TwiceCorruptedField,
  SetTextColor: SetTextColorField, SetBackgroundColor: SetBackgroundColorField, SetBorderColor: SetBorderColorField, SetFontSize: SetFontSizeField, PlayAlertSound: PlayAlertSoundField, PlayEffect: PlayEffectField, MinimapIcon: MinimapIconField,
} satisfies Record<FieldType, ComponentType<FieldEditorProps>>
