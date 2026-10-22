import type { CraftBase, CraftMod } from './crafting'

// UI translations; IDs and source English remain unchanged for simulation/import.
const baseNames: Record<string, string> = { 'Vile Robe': '恶毒长袍' }
const affixNames: Record<string, string> = {
  Unassailable: '攻不可破的', Unfaltering: '坚定不移的', Protective: '防护的', 'Strong-Willed': '意志坚定的', Resolute: '坚决的', Fearless: '无畏的', Dauntless: '不屈的', Indomitable: '不挠的',
  Thorny: '荆棘的', Spiny: '多刺的', Barbed: '带刺的', Pointed: '尖锐的', Spiked: '尖刺的', Edged: '锋刃的', Jagged: '锯齿的',
  Hale: '健壮的', Healthy: '健康的', Sanguine: '多血的', Stalwart: '强健的', Stout: '厚实的', Robust: '健硕的', Rotund: '丰腴的', Virile: '雄健的', "Athlete's": '运动员的', Fecund: '丰饶的', Vigorous: '活力的', Rapturous: '狂喜的', Prime: '鼎盛的',
  Shining: '闪亮的', Glimmering: '微光的', Glittering: '闪耀的', Glowing: '发光的', Radiating: '辐射的', Pulsing: '脉动的', Blazing: '炽烈的', Dazzling: '炫目的', Scintillating: '璀璨的', Incandescent: '白炽的', Resplendent: '辉煌的',
  "Monk's": '僧侣的', "Prior's": '修院长的', "Abbot's": '住持的', "Bishop's": '主教的', "Exarch's": '总督的', "Pope's": '教宗的', "Deacon's": '执事的', "Cardinal's": '枢机的', "Priest's": '祭司的', "High Priest's": '大祭司的', "Archon's": '执政官的', Divine: '神圣的',
  "Lady's": '贵妇的', "Baronness'": '女男爵的', "Viscountess'": '女勋爵的', "Marchioness'": '女侯爵的', "Countess'": '女伯爵的', "Duchess'": '女公爵的', "Princess'": '公主的', "Queen's": '女王的',
  'of the Pupil': '学徒之', 'of the Student': '学者之', 'of the Prodigy': '奇才之', 'of the Augur': '占卜者之', 'of the Philosopher': '哲学家之', 'of the Sage': '贤者之', 'of the Savant': '博学者之', 'of the Virtuoso': '大师之',
  'of the Whelpling': '幼龙之', 'of the Salamander': '火蜥蜴之', 'of the Drake': '飞龙之', 'of the Kiln': '窑炉之', 'of the Furnace': '熔炉之', 'of the Volcano': '火山之', 'of Magma': '岩浆之', 'of Tzteosh': '提泽许之',
  'of the Seal': '海豹之', 'of the Penguin': '企鹅之', 'of the Narwhal': '独角鲸之', 'of the Yeti': '雪怪之', 'of the Walrus': '海象之', 'of the Polar Bear': '北极熊之', 'of the Ice': '寒冰之', 'of Haast': '哈斯特之',
  'of the Cloud': '云雾之', 'of the Squall': '狂风之', 'of the Storm': '风暴之', 'of the Thunderhead': '雷云之', 'of the Tempest': '暴风之', 'of the Maelstrom': '漩涡之', 'of the Lightning': '闪电之', 'of Ephij': '艾非吉之',
  'of the Lost': '迷失之', 'of Banishment': '放逐之', 'of Eviction': '驱逐之', 'of Expulsion': '逐出之', 'of Exile': '流放之', 'of Bameth': '巴麦斯之',
  'of the Worthy': '胜任之', 'of the Apt': '适任之', 'of the Talented': '天赋之', 'of the Skilled': '熟练之', 'of the Proficient': '精通之',
  'of Thick Skin': '厚皮之', 'of Reinforced Skin': '坚皮之', 'of Stone Skin': '石肤之', 'of Iron Skin': '铁肤之', 'of Steel Skin': '钢肤之', 'of Granite Skin': '花岗岩肤之', 'of Platinum Skin': '白金肤之', 'of Adamantite Skin': '精金肤之', 'of Corundum Skin': '刚玉肤之', 'of Obsidian Skin': '黑曜石肤之',
  'of the Newt': '蝾螈之', 'of the Lizard': '蜥蜴之', 'of the Flatworm': '扁虫之', 'of the Starfish': '海星之', 'of the Hydra': '九头蛇之', 'of the Troll': '巨魔之', 'of Convalescence': '康复之', 'of Recuperation': '复原之', 'of Resurgence': '复苏之', 'of Immortality': '不朽之', 'of the Phoenix': '凤凰之',
  'of Sealing': '封合之', 'of Alleviation': '缓解之', 'of Allaying': '舒缓之', 'of Assuaging': '抚平之', 'of Staunching': '止血之', 'of the Antitoxin': '抗毒之', 'of the Remedy': '药方之', 'of the Cure': '治疗之', 'of the Panacea': '万灵药之', 'of the Antidote': '解毒之',
  'of Damping': '抑火之', 'of Quashing': '压制之', 'of Quelling': '平息之', 'of Quenching': '熄火之', 'of Dousing': '浇熄之', 'of Buffering': '缓冲之', 'of Ardour': '热忱之', 'of Suffusion': '充盈之',
}

interface StatDisplay { text: string; divisor?: number }
const stats: Record<string, StatDisplay> = {}
function add(id: string, text: string, divisor = 1) { stats[id] = { text, divisor } }
const simple: Record<string, string> = {
  local_energy_shield: '+# 最大能量护盾', 'local_energy_shield_+%': '增加 #% 能量护盾',
  local_base_physical_damage_reduction_rating: '+# 护甲', 'local_physical_damage_reduction_rating_+%': '增加 #% 护甲',
  local_base_evasion_rating: '+# 闪避值', 'local_evasion_rating_+%': '增加 #% 闪避值',
  'local_armour_and_evasion_+%': '增加 #% 护甲与闪避值', 'local_armour_and_energy_shield_+%': '增加 #% 护甲与能量护盾',
  'local_evasion_and_energy_shield_+%': '增加 #% 闪避值与能量护盾', 'local_armour_and_evasion_and_energy_shield_+%': '增加 #% 护甲、闪避值与能量护盾',
  base_maximum_life: '+# 最大生命', base_maximum_mana: '+# 最大魔力', base_spirit_from_equipment: '+# 精魂',
  additional_strength: '+# 力量', additional_dexterity: '+# 敏捷', additional_intelligence: '+# 智慧', additional_all_attributes: '+# 全属性',
  'stun_threshold_+': '+# 晕眩门槛', 'energy_shield_recharge_rate_+%': '增加 #% 能量护盾充能速度',
  'local_spirit_+%': '增加 #% 精魂', 'mana_regeneration_rate_+%': '增加 #% 魔力回复速度',
  'light_radius_+%': '增加 #% 照亮范围', 'presence_area_+%': '增加 #% 存在范围',
  'minion_maximum_life_+%': '召唤生物的最大生命增加 #%', 'allies_in_presence_damage_+%': '你存在范围内友军的伤害增加 #%',
  'allies_in_presence_resist_all_elements_%': '你存在范围内友军的全部元素抗性 +#%',
  'allies_in_presence_attack_speed_+%': '你存在范围内友军的攻击速度增加 #%',
  'allies_in_presence_cast_speed_+%': '你存在范围内友军的施法速度增加 #%',
  'allies_in_presence_critical_strike_chance_+%': '你存在范围内友军的暴击率增加 #%',
  'allies_in_presence_critical_strike_multiplier_+': '你存在范围内友军的暴击伤害加成增加 #%',
  'armour_%_applies_to_fire_cold_lightning_damage': '#% 护甲也作用于元素伤害',
  'base_deflection_rating_%_of_evasion_rating': '获得等同于闪避值 #% 的偏斜值',
  accuracy_rating: '+# 命中值', local_accuracy_rating: '+# 命中值',
  'base_item_found_rarity_+%': '增加 #% 物品稀有度', 'critical_strike_chance_+%': '增加 #% 暴击率',
  'attack_speed_+%': '增加 #% 攻击速度', 'local_attack_speed_+%': '增加 #% 攻击速度',
  'base_critical_strike_multiplier_+': '增加 #% 暴击伤害加成', 'local_critical_strike_multiplier_+': '+#% 暴击伤害加成',
  'base_movement_velocity_+%': '增加 #% 移动速度', 'local_block_chance_+%': '增加 #% 格挡率',
  'additional_maximum_all_elemental_resistances_%': '+#% 全部元素抗性上限',
  'elemental_damage_with_attack_skills_+%': '增加 #% 攻击技能元素伤害',
  'spell_damage_+%': '增加 #% 法术伤害', 'spell_physical_damage_+%': '增加 #% 法术物理伤害',
  'base_cast_speed_+%': '增加 #% 施法速度', 'spell_critical_strike_chance_+%': '增加 #% 法术暴击率',
  'base_spell_critical_strike_multiplier_+': '增加 #% 法术暴击伤害加成', 'base_projectile_speed_+%': '增加 #% 投射物速度',
  'damage_+%_with_bow_skills': '增加 #% 弓技能伤害', 'attack_critical_strike_chance_+%': '增加 #% 攻击暴击率',
  'attack_critical_strike_multiplier_+': '增加 #% 攻击暴击伤害加成', 'base_chance_to_pierce_%': '#% 几率穿透敌人',
  'maximum_life_+%': '增加 #% 最大生命', 'maximum_mana_+%': '增加 #% 最大魔力',
  base_maximum_energy_shield: '+# 最大能量护盾', 'maximum_energy_shield_+%': '增加 #% 最大能量护盾',
  'physical_damage_reduction_rating_+%': '增加 #% 护甲', 'evasion_rating_+%': '增加 #% 闪避值',
  'base_resist_all_elements_%': '+#% 全部元素抗性', 'damage_taken_goes_to_life_over_4_seconds_%': '受到伤害的 #% 在 4 秒内补偿为生命',
  'damage_taken_goes_to_mana_%': '受到伤害的 #% 补偿为魔力', base_evasion_rating: '+# 闪避值', base_physical_damage_reduction_rating: '+# 护甲',
  'flask_life_recovery_rate_+%': '增加 #% 药剂生命回复速度', 'flask_mana_recovery_rate_+%': '增加 #% 药剂魔力回复速度',
  'charm_duration_+%': '增加 #% 护符效果持续时间', 'flask_charges_gained_+%': '增加 #% 药剂充能获取', 'charm_charges_gained_+%': '增加 #% 护符充能获取',
  'local_physical_damage_+%': '增加 #% 物理伤害', 'local_base_stun_duration_+%': '增加 #% 晕眩持续时间', 'local_hit_damage_stun_multiplier_+%': '增加 #% 晕眩累积',
  base_life_gained_on_enemy_death: '每击败一名敌人获得 # 生命', base_mana_gained_on_enemy_death: '每击败一名敌人获得 # 魔力',
  base_life_gain_per_target: '攻击每击中一名敌人获得 # 生命', local_life_gain_per_target: '每击中一名敌人获得 # 生命',
  'chance_to_fire_1_additional_projectile_%_with_rollover_with_bow_attacks': '+#% 超额几率额外发射一支箭矢',
  base_number_of_crossbow_bolts: '额外装填 # 枚弩箭',
  'base_additional_physical_damage_reduction_%': '额外 #% 物理伤害减免', 'base_self_critical_strike_multiplier_-%': '承受击中的暴击伤害加成降低 #%',
  'grenade_skill_cooldown_count_+': '手雷技能的冷却使用次数 +#', grenade_skill_number_of_additional_projectiles: '手雷技能额外发射 # 个投射物',
  'grenade_skill_cooldown_speed_+%': '增加 #% 手雷技能冷却回复速度',
  'fishing_line_strength_+%': '增加 #% 鱼线强度', 'fishing_range_+%': '增加 #% 钓鱼范围',
  'fish_quantity_+%': '增加 #% 捕鱼数量', 'fish_rarity_+%': '增加 #% 捕鱼稀有度', fishing_lure_type: '图腾木鱼饵', fishing_hook_type: '永恒铁鱼钩',
}
for (const [id, text] of Object.entries(simple)) add(id, text)
for (const [kind, label] of Object.entries({ fire: '火焰', cold: '冰冷', lightning: '闪电', chaos: '混沌' })) {
  add(`base_${kind}_damage_resistance_%`, `+#% ${label}抗性`)
  add(`base_maximum_${kind}_damage_resistance_%`, `+#% ${label}抗性上限`)
  add(`${kind}_damage_+%`, `增加 #% ${label}伤害`)
}
for (const [kind, label] of Object.entries({ melee: '近战', projectile: '投射物', minion: '召唤生物', spell: '法术' })) add(`${kind}_skill_gem_level_+`, `所有${label}技能等级 +#`)
for (const [id, text] of Object.entries({
  'local_attribute_requirements_+%': '降低 #% 属性需求', 'self_bleed_duration_+%': '你受到的流血持续时间缩短 #%',
  'self_poison_duration_+%': '你受到的中毒持续时间缩短 #%', 'flask_charges_used_+%': '降低 #% 药剂充能消耗',
  'charm_charges_used_+%': '降低 #% 护符充能消耗', 'fishing_pool_consumption_+%': '降低 #% 鱼群消耗',
})) add(id, text, -1)
for (const [kind, label] of Object.entries({ ignite: '点燃', shock: '感电', chill: '冰缓', freeze: '冻结' })) add(`base_self_${kind}_duration_-%`, `你受到的${label}持续时间缩短 #%`)
add('base_life_regeneration_rate_per_minute', '每秒回复 # 生命', 60)
add('allies_in_presence_life_regeneration_rate_per_minute', '你存在范围内的友军每秒回复 # 生命', 60)
add('local_critical_strike_chance', '+#% 暴击率', 100)
for (const [kind, label] of Object.entries({ life: '生命', mana: '魔力' })) {
  add(`base_${kind}_leech_from_physical_attack_damage_permyriad`, `物理攻击伤害的 #% 偷取为${label}`, 100)
  add(`local_${kind}_leech_from_physical_damage_permyriad`, `物理伤害的 #% 偷取为${label}`, 100)
}

// Additional descriptions for essence, desecration and corruption pools.
const special: Record<string, string> = {
  cannot_be_inflicted_by_corrupted_blood: '无法被施加腐化之血', immune_to_maim: '免疫瘫痪', you_cannot_be_hindered: '无法被阻碍', cannot_be_blinded: '无法被致盲',
  'local_+%_weapon_range': '增加 #% 此武器的近战打击范围',
  'local_chance_to_bleed_on_hit_%': '击中时有 #% 几率造成流血', 'local_poison_on_hit_%': '此武器击中时有 #% 几率使敌人中毒', local_gain_X_rage_on_hit: '击中时获得 # 怒火',
  melee_attack_skills_additional_totems_allowed: '近战攻击技能的最大召唤图腾数量 +#', 'damage_+%_while_totem_active': '拥有图腾时增加 #% 伤害', 'damage_+%_against_enemies_with_fully_broken_armour': '对护甲完全破坏的敌人增加 #% 伤害', 'empowered_attack_damage_+%': '增助攻击增加 #% 伤害',
  'base_attack_skill_cost_efficiency_+%': '增加 #% 攻击消耗效率', 'summon_totem_cast_speed_+%': '增加 #% 图腾放置速度', 'armour_break_physical_damage_%_dealt_as_armour_break': '破坏等同于造成物理伤害 #% 的护甲', 'skill_additional_fissure_chance_%': '制造裂隙的技能有 #% 几率额外制造一道裂隙', 'your_mace_slam_aftershock_chance_%': '你亲自使用的锤类猛击技能有 #% 几率额外产生一次余震', 'warcry_cooldown_speed_+%': '增加 #% 战吼冷却恢复速度',
  'projectile_damage_+%_vs_enemies_further_than_6m_distance': '投射物对 6 米外敌人的击中伤害增加 #%', 'companion_damage_+%': '伙伴增加 #% 伤害', 'damage_+%_while_in_presence_of_companion': '伙伴在你的存在范围内时增加 #% 伤害', 'attack_area_of_effect_+%': '增加 #% 攻击范围效果', 'projectile_chance_to_chain_1_extra_time_from_terrain_%': '投射物有 #% 几率从地形额外连锁一次',
  'melee_damage_+%_if_youve_dealt_projectile_attack_hit_recently': '过去八秒造成过投射物攻击击中时增加 #% 近战伤害', 'projectile_attacks_%_chance_to_fire_2_additional_projectiles_while_moving': '移动时投射物攻击有 #% 几率额外发射两个投射物', 'attack_speed_+%_while_in_presence_of_companion': '伙伴在你的存在范围内时增加 #% 攻击速度', 'companion_attack_speed_+%': '伙伴增加 #% 攻击速度', 'critical_strike_chance_+%_vs_enemies_further_than_6m_distance': '投射物对 6 米外敌人增加 #% 暴击率', 'hit_damage_immobilisation_multiplier_+%': '增加 #% 定身累积',
  'lightning_damage_+%': '增加 #% 闪电伤害', 'shock_effect_+%': '增加 #% 造成的感电效果幅度', 'fire_damage_+%': '增加 #% 火焰伤害', 'base_ignite_effect_+%': '增加 #% 点燃效果幅度', 'cold_damage_+%': '增加 #% 冰冷伤害', 'hit_damage_freeze_multiplier_+%': '增加 #% 冰冻累积',
  'recover_%_maximum_life_when_spending_at_least_10_combo': '消耗至少 10 连击时回复 #% 最大生命', 'additional_combo_gain_chance_%': '击中时有 #% 几率额外累积一点连击', 'recover_%_maximum_mana_when_spending_at_least_10_combo': '消耗至少 10 连击时回复 #% 最大魔力', 'quiver_mod_effect_+%': '增加 #% 装备箭袋提供的加成', 'local_maim_on_hit_%': '击中时有 #% 几率瘫痪', 'local_chance_to_blind_on_hit_%': '击中时有 #% 几率致盲', number_of_additional_arrows: '弓攻击额外发射 # 支箭矢', additional_ballista_totems_allowed: '最大召唤弩炮图腾数量 +#',
  'grenade_skill_damage_+%': '增加 #% 手榴弹伤害', 'grenade_skill_duration_+%': '增加 #% 手榴弹持续时间', 'projectile_damage_+%_vs_enemies_within_2m_distance': '投射物对 2 米内敌人的击中伤害增加 #%', attacks_num_of_additional_chains: '攻击额外连锁 # 次', 'critical_hit_damage_bonus_+%_vs_enemies_within_2m_distance': '投射物对 2 米内敌人增加 #% 暴击伤害加成', 'grenade_skill_%_chance_to_explode_twice': '手榴弹有 #% 几率再次引爆', 'local_reload_speed_+%': '增加 #% 装填速度', '%_chance_for_crossbow_reload_to_be_instant': '弩装填时有 #% 几率立即完成',
  'minion_damage_+%_if_enemy_hit_recently': '近期击中过敌人时召唤生物增加 #% 伤害', warcry_empowers_next_x_melee_attacks: '战吼额外增助 # 次攻击', gain_x_rage_on_melee_hit: '近战击中时获得 # 怒火', 'critical_strike_chance_+%_vs_marked_enemies': '对标记敌人增加 #% 暴击率', 'base_enemy_critical_strike_chance_+%_against_self': '击中你的暴击率修正 #% ', 'curse_effect_on_self_+%': '对你的诅咒效果修正 #%', 'base_spirit_reservation_efficiency_+%': '增加 #% 技能精魂保留效率', 'thorns_damage_+%': '增加 #% 荆棘伤害', 'base_damage_%_deflected': '偏斜击中额外防止 #% 伤害',
  'reservation_efficiency_+%_of_companion_skills': '增加 #% 伙伴技能保留效率', 'base_damage_removed_from_mana_before_life_%': '#% 伤害优先从魔力扣除', 'base_mana_cost_efficiency_+%': '增加 #% 魔力消耗效率', 'base_life_cost_efficiency_+%': '增加 #% 生命消耗效率', 'glory_generation_+%': '增加 #% 荣耀生成', 'recoup_%_elemental_damage_as_energy_shield': '受到元素伤害的 #% 补偿为能量护盾', 'base_armour_%_applies_to_chaos_damage': '护甲额外有 #% 也适用于混沌伤害', max_power_charges: '暴击球数量上限 +#', 'life_regeneration_rate_+%': '增加 #% 生命再生速度', 'marked_enemy_damage_taken_+%': '你标记的敌人受到的伤害增加 #%', 'arcane_surge_effect_on_self_+%': '增加 #% 对你的秘能波动效果', 'ailment_effect_+%': '增加 #% 你施加异常状态的幅度', 'poison_chance_+%': '增加 #% 中毒几率', 'bleed_chance_+%': '增加 #% 流血几率', 'base_chance_to_daze_%': '击中时有 #% 几率造成眩惑',
  'base_reduce_enemy_fire_resistance_%': '伤害穿透 #% 火焰抗性', 'base_reduce_enemy_cold_resistance_%': '伤害穿透 #% 冰冷抗性', 'base_reduce_enemy_lightning_resistance_%': '伤害穿透 #% 闪电抗性', 'armour_break_amount_+%': '增加 #% 护甲破坏量', 'gold_+%_from_enemies': '增加 #% 击杀敌人掉落的金币数量', max_frenzy_charges: '狂怒球数量上限 +#', 'curse_area_of_effect_+%': '增加 #% 诅咒范围效果', 'chance_to_inflict_incision_on_attack_hit_%': '攻击击中有 #% 几率施加切口', 'skill_speed_+%_if_consumed_frenzy_charge_recently': '近期消耗过狂怒球时增加 #% 技能速度', 'gain_arcane_surge_on_crit_%_chance': '暴击时有 #% 几率获得秘能波动', 'cast_speed_+%_when_on_full_life': '满血时增加 #% 施法速度', 'base_slow_potency_+%': '对你的减速效力修正 #%',
  dodge_roll_base_travel_distance: '闪避翻滚距离 +# 米', 'mana_cost_efficiency_+%_if_dodge_rolled_recently': '近期闪避翻滚过时增加 #% 魔力消耗效率', 'mana_regeneration_rate_+%_while_stationary': '静止时增加 #% 魔力再生速度', 'life_regeneration_rate_+%_while_moving': '移动时增加 #% 生命再生速度', 'stun_threshold_+%': '增加 #% 晕眩门槛', 'freeze_threshold_+%': '增加 #% 冰冻门槛', 'additional_maximum_block_%': '最大格挡率 +#%', 'parried_magnitude_+%': '增加 #% 招架减益幅度', 'parry_skill_effect_duration_+%': '增加 #% 招架减益持续时间', 'physical_hit_and_dot_damage_%_taken_as_lightning_while_active_blocking': '举盾时 #% 受到的物理伤害转为闪电伤害', 'block_%_damage_taken_while_active_blocking': '举盾时承受被格挡击中的 #% 伤害', fully_break_enemies_armour_on_heavy_stun_with_shield_skills: '盾牌技能造成重度晕眩时完全破坏敌人护甲', 'heavy_stun_poise_decay_rate_+%': '你的重度晕眩累积消退速度修正 #%', 'additional_maximum_all_resistances_%': '所有抗性上限 +#%', mana_gained_on_block: '格挡时获得 # 魔力', 'energy_shield_recharge_rate_+%_if_blocked_recently': '近期格挡过时增加 #% 能量护盾充能速度', life_gained_on_block: '格挡时获得 # 生命',
  spell_skills_additional_totems_allowed: '法术技能的最大召唤图腾数量 +#', 'spell_damage_+%_while_wielding_melee_weapon': '持近战武器时增加 #% 法术伤害', 'curse_effect_+%': '增加 #% 诅咒幅度', 'offering_spells_effect_+%': '增加 #% 奉献技能增益效果', 'invocation_spell_damage_+%': '增加 #% 祈愿触发法术伤害', 'spell_area_of_effect_+%': '增加 #% 法术技能范围效果', 'spells_cost_life_instead_of_mana_%': '法术魔力消耗的 #% 转为生命消耗', 'spell_skills_fire_2_additional_projectiles_final_chance_%': '法术技能有 #% 几率额外发射两个投射物', 'curse_delay_+%': '诅咒激活延迟修正 #%', 'additional_infusion_gain_chance_%': '拾取元素灌注时有 #% 几率额外获得同类灌注', arrow_speed_additive_modifiers_also_apply_to_bow_damage: '投射物速度的增减也适用于弓伤害', 'base_skill_cost_life_instead_of_mana_%': '技能魔力消耗的 #% 转为生命消耗', 'damage_+%': '增加 #% 伤害', 'skill_speed_+%': '增加 #% 技能速度', 'attack_damage_+%_when_on_low_life': '低血时增加 #% 攻击伤害', 'remnant_effect_+%': '增加 #% 你创造的残留物效果', 'spell_damage_+%_while_es_full': '满能量护盾时增加 #% 法术伤害',
  'body_armour_evasion_rating_+%': '增加 #% 胸甲提供的闪避值', 'deflection_rating_+%': '增加 #% 偏斜值', 'chance_to_retain_40%_of_glory_on_use_%': '技能有 #% 几率在使用时保留四成荣耀', 'body_armour_+%': '增加 #% 胸甲提供的护甲', 'global_armour_evasion_energy_shield_+%': '增加 #% 全域护甲、闪避值与能量护盾', 'maximum_energy_shield_from_body_armour_+%': '增加 #% 胸甲提供的能量护盾', 'invocation_spell_chance_to_cost_half_energy_%': '祈愿触发法术有 #% 几率只消耗一半能量', 'lightning_and_chaos_damage_resistance_%': '+#% 闪电与混沌抗性', additional_strength_and_dexterity: '+# 力量与敏捷', 'fire_and_chaos_damage_resistance_%': '+#% 火焰与混沌抗性', additional_strength_and_intelligence: '+# 力量与智慧', 'cold_and_chaos_damage_resistance_%': '+#% 冰冷与混沌抗性', additional_dexterity_and_intelligence: '+# 敏捷与智慧', 'recover_%_maximum_life_on_kill': '击杀时回复 #% 最大生命', 'skill_effect_duration_+%': '增加 #% 技能效果持续时间', 'remnant_pickup_range_+%': '增加 #% 残留物拾取距离', 'exposure_effect_+%': '增加 #% 曝光效果', 'base_cooldown_speed_+%': '增加 #% 冷却恢复速度', 'maximum_mana_%_gained_on_kill': '击杀时回复 #% 最大魔力', 'reservation_efficiency_+%_of_herald_skills': '增加 #% 捷技能保留效率', 'all_skill_gem_level_+': '所有技能等级 +#', 'global_item_attribute_requirements_+%': '装备与技能宝石的属性需求修正 #%', 'aura_effect_+%': '增加 #% 光环技能幅度', 'minion_cooldown_recovery_+%': '召唤生物增加 #% 冷却恢复速度', 'all_skill_gem_quality_+': '所有技能品质 +#%',
  'shock_effect_+%_if_consumed_frenzy_charge_recently': '近期消耗过狂怒球时增加 #% 感电幅度', 'ignite_effect_+%_if_consumed_endurance_charge_recently': '近期消耗过耐力球时增加 #% 点燃幅度', 'hit_damage_freeze_multiplier_+%_if_consumed_power_charge_recently': '近期消耗过暴击球时增加 #% 冰冻累积', 'base_life_leech_amount_+%': '增加 #% 生命偷取量', 'base_mana_leech_amount_+%': '增加 #% 魔力偷取量', 'flasks_%_chance_to_not_consume_charges': '使用药剂时有 #% 几率不消耗充能', 'life_regeneration_rate_+%_while_using_life_flask': '生命药剂效果期间增加 #% 生命再生速度', 'thorns_maximum_fire_damage_per_100_life': '每百点最大生命提供 # 最大火焰荆棘伤害', 'thorns_minimum_fire_damage_per_100_life': '每百点最大生命提供 # 最小火焰荆棘伤害', 'charms_%_chance_to_not_consume_charges': '护符有 #% 几率不消耗充能', 'mana_%_to_gain_as_armour': '获得等于最大魔力 #% 的护甲', 'slow_potency_+%_if_you_have_used_a_charm_recently': '近期使用过护符时对你的减速效力修正 #%', base_thorns_critical_strike_chance: '荆棘暴击率 +#%', max_endurance_charges: '耐力球数量上限 +#', 'non_skill_base_all_damage_%_to_gain_as_physical': '获得伤害的 #% 作为额外物理伤害', 'non_skill_base_all_damage_%_to_gain_as_fire': '获得伤害的 #% 作为额外火焰伤害', 'non_skill_base_all_damage_%_to_gain_as_cold': '获得伤害的 #% 作为额外冰冷伤害', 'non_skill_base_all_damage_%_to_gain_as_lightning': '获得伤害的 #% 作为额外闪电伤害', 'attack_skill_gem_level_+': '所有攻击技能等级 +#', 'local_chance_to_gain_onslaught_on_killing_blow_%': '此武器击杀时有 #% 几率获得猛攻', 'local_lightning_penetration_%': '此武器攻击穿透 #% 闪电抗性', 'local_fire_penetration_%': '此武器攻击穿透 #% 火焰抗性', 'local_cold_penetration_%': '此武器攻击穿透 #% 冰冷抗性', 'local_maximum_quality_+': '最大品质 +#%', local_force_corruption_outcome_two_enchants: '腐化时物品获得两条附魔', 'fire_damage_taken_goes_to_life_over_4_seconds_%': '受到火焰伤害的 #% 补偿为生命', 'cold_damage_taken_goes_to_life_over_4_seconds_%': '受到冰冷伤害的 #% 补偿为生命', 'physical_damage_taken_%_as_chaos': '击中受到的物理伤害的 #% 转为混沌伤害', 'local_socketed_items_effect_+%': '增加 #% 插入的强化物品效果', 'lightning_damage_taken_goes_to_life_over_4_seconds_%': '受到闪电伤害的 #% 补偿为生命',
}
for (const [id, text] of Object.entries(special)) add(id, text)
add('dodge_roll_base_travel_distance', '闪避翻滚距离 +# 米', 10)
for (const [id, label] of Object.entries({generate_x_charges_for_life_flasks_per_minute:'生命药剂', generate_x_charges_for_mana_flasks_per_minute:'魔力药剂', generate_x_charges_for_charms_per_minute:'护符'})) add(id, `${label}每秒获得 # 充能`, 60)

// Two damage stats are one displayed range, never two independent effects.
const damagePairs: { min: string; max: string; text: string }[] = []
for (const [kind, label] of Object.entries({ physical: '物理', fire: '火焰', cold: '冰冷', lightning: '闪电', chaos: '混沌' })) {
  damagePairs.push({ min: `local_minimum_added_${kind}_damage`, max: `local_maximum_added_${kind}_damage`, text: `附加 {0}–{1} ${label}伤害` },
    { min: `attack_minimum_added_${kind}_damage`, max: `attack_maximum_added_${kind}_damage`, text: `攻击附加 {0}–{1} ${label}伤害` },
    { min: `allies_in_presence_attack_minimum_added_${kind}_damage`, max: `allies_in_presence_attack_maximum_added_${kind}_damage`, text: `你存在范围内友军的攻击附加 {0}–{1} ${label}伤害` })
}
damagePairs.push({ min: 'thorns_minimum_base_physical_damage', max: 'thorns_maximum_base_physical_damage', text: '{0}–{1} 物理荆棘伤害' })

export const baseDisplayName = (base: CraftBase) => baseNames[base.name] ?? base.name
export function modDisplayName(mod: CraftMod) {
  return affixNames[mod.name] ?? `${(stats[mod.stats[0]?.id]?.text ?? damagePairs.find(pair => mod.stats.some(stat => stat.id === pair.min))?.text ?? '特殊属性').replace(/[+#%{\d}–]/g, '').replace(/^增加\s*/, '').trim()}词缀`
}
export function statDisplayValue(id: string, value: number) { return Number((value / (stats[id]?.divisor ?? 1)).toFixed(2)) }
export function statStoredValue(id: string, value: number) { return Math.round(value * (stats[id]?.divisor ?? 1)) }
export function localizedModLines(mod: CraftMod, values: number[]) {
  const consumed = new Set<string>()
  const lines: string[] = []
  for (const stat of mod.stats) {
    if (consumed.has(stat.id)) continue
    const pair = damagePairs.find(pair => pair.min === stat.id || pair.max === stat.id)
    if (pair && mod.stats.some(stat => stat.id === pair.min) && mod.stats.some(stat => stat.id === pair.max)) {
      lines.push(pair.text.replace('{0}', String(values[mod.stats.findIndex(stat => stat.id === pair.min)])).replace('{1}', String(values[mod.stats.findIndex(stat => stat.id === pair.max)])))
      consumed.add(pair.min); consumed.add(pair.max)
    } else {
      const display = stats[stat.id]
      lines.push(display ? display.text.replace('#', String(statDisplayValue(stat.id, values[mod.stats.indexOf(stat)]))) : '特殊属性（暂无中文说明）')
    }
  }
  return lines
}
export function modDisplayRanges(mod: CraftMod) {
  return mod.stats.map(stat => {
    const limits = [statDisplayValue(stat.id, stat.min), statDisplayValue(stat.id, stat.max)].sort((a, b) => a - b)
    return `${limits[0]}–${limits[1]}`
  }).join(' / ')
}
