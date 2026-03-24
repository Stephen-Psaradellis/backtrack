/**
 * Avatar Quality Audit Generator
 *
 * Generates 50 random AvatarConfig objects with diverse combinations,
 * analyzes rendering code paths triggered, and outputs a comprehensive
 * JSON report identifying quality gaps and improvement opportunities.
 *
 * Run: npx ts-node scripts/generate-avatar-audit.ts
 */

// @ts-nocheck
/* eslint-disable */
const fs = require('fs');
const path = require('path');

// ============================================================================
// ENUM VALUE DEFINITIONS (mirrored from avatar/types.ts for Node.js usage)
// ============================================================================

const GENDERS = ['male', 'female', 'neutral'] as const;

const FACE_SHAPES = [
  'oval', 'round', 'square', 'heart', 'oblong', 'diamond', 'triangle',
  'inverted_triangle', 'rectangle', 'pear', 'long', 'wide', 'angular',
  'soft_square', 'narrow', 'baby_face', 'mature', 'high_cheekbones',
  'full_cheeks', 'hollow_cheeks', 'strong_jaw', 'strong_jaw_wide',
  'soft_features', 'defined_features', 'chiseled',
] as const;

const HAIR_STYLES = [
  // Short (25)
  'short_buzz', 'short_crew', 'short_slick', 'short_spiky', 'short_curly',
  'short_wavy', 'short_side_part', 'short_pompadour', 'short_textured_crop',
  'short_fade', 'short_taper_fade', 'short_undercut', 'short_pixie',
  'short_pixie_textured', 'short_military', 'short_caesar', 'short_ivy_league',
  'short_quiff', 'short_faux_hawk', 'short_coils', 'short_twist_out',
  'short_finger_waves', 'short_slicked_back', 'short_messy_fringe', 'short_flat_top',
  // Medium (20)
  'medium_messy', 'medium_straight', 'medium_curly', 'medium_bob',
  'medium_bob_angled', 'medium_bob_layered', 'medium_bob_blunt', 'medium_lob',
  'medium_shag', 'medium_wolf_cut', 'medium_layers', 'medium_curtain_bangs',
  'medium_wavy', 'medium_curly_defined', 'medium_twist_out', 'medium_half_up',
  'medium_slicked_back', 'medium_side_swept', 'medium_feathered', 'medium_mullet',
  // Long (25)
  'long_straight', 'long_wavy', 'long_curly', 'long_ponytail', 'long_ponytail_high',
  'long_ponytail_low', 'long_ponytail_side', 'long_bun', 'long_bun_messy',
  'long_bun_top', 'long_chignon', 'long_braids', 'long_braid_single',
  'long_braids_pigtails', 'long_layers', 'long_beach_waves', 'long_defined_curls',
  'long_half_up', 'long_half_up_bun', 'long_side_swept', 'long_center_part',
  'long_curtain_bangs', 'long_space_buns', 'long_pigtails', 'long_twists',
  // Protective & Cultural (15)
  'afro', 'afro_puff', 'afro_puffs_double', 'locs', 'locs_short', 'locs_updo',
  'box_braids', 'box_braids_updo', 'cornrows', 'cornrows_intricate', 'bantu_knots',
  'twist_out_long', 'flat_twists', 'silk_press', 'natural_curls',
  // Special (10)
  'mohawk', 'mohawk_short', 'bald', 'shaved', 'shaved_sides', 'asymmetric',
  'ombre_straight', 'ombre_wavy', 'bangs_straight', 'bangs_side',
  // Headwear (10)
  'hat_beanie', 'hat_cap', 'hat_bucket', 'hat_fedora', 'headband',
  'headband_wide', 'hijab', 'turban', 'durag', 'bandana',
  // Phase 1.1 Modern Trends (15)
  'curtain_bangs_short', 'curtain_bangs_long', 'curtain_bangs_wavy',
  'egirl_style', 'eboy_style', 'soft_boy', 'soft_girl', 'middle_part_fluffy',
  'side_part_voluminous', 'textured_fringe', 'korean_comma', 'french_bob',
  'italian_bob', 'blunt_bob_chin', 'micro_bangs',
  // Phase 1.1 Braided & Protective (15)
  'goddess_locs', 'passion_twists', 'knotless_braids', 'knotless_braids_long',
  'fulani_braids', 'tribal_braids', 'faux_locs', 'faux_locs_updo',
  'crochet_curls', 'crochet_locs', 'marley_twists', 'senegalese_twists',
  'havana_twists', 'spring_twists', 'butterfly_locs',
  // Phase 1.1 Textured (10)
  'coils_4c', 'coils_4b', 'heat_damaged', 'wash_and_go', 'twist_out_defined',
  'braid_out', 'finger_coils', 'shingled_curls', 'stretched_natural', 'pineapple_updo',
  // Phase 1.1 Age Appropriate (10)
  'receding_short', 'receding_slicked', 'thinning_top', 'thinning_crown',
  'mature_bob', 'mature_pixie', 'distinguished_gray', 'silver_fox',
  'elegant_updo', 'classic_waves',
  // Phase 1.1 Hair Accessories (8)
  'with_clips', 'with_scrunchie', 'with_bobby_pins', 'with_flower_crown',
  'with_hair_pins', 'with_barrettes', 'with_ribbon', 'with_headscarf',
] as const;

// Hair styles with explicit case statements in Hair.tsx
const IMPLEMENTED_HAIR = new Set([
  'bald', 'shaved', 'short_buzz', 'short_crew', 'short_spiky', 'short_curly',
  'medium_messy', 'long_straight', 'long_wavy', 'long_curly', 'long_ponytail',
  'long_bun', 'afro', 'mohawk', 'hat_beanie', 'hat_cap', 'hijab', 'turban',
  // Phase 1.1 Modern Trends (all 15)
  'curtain_bangs_short', 'curtain_bangs_long', 'curtain_bangs_wavy',
  'egirl_style', 'eboy_style', 'soft_boy', 'soft_girl', 'middle_part_fluffy',
  'side_part_voluminous', 'textured_fringe', 'korean_comma', 'french_bob',
  'italian_bob', 'blunt_bob_chin', 'micro_bangs',
  // Phase 1.1 Braided & Protective (all 15)
  'goddess_locs', 'passion_twists', 'knotless_braids', 'knotless_braids_long',
  'fulani_braids', 'tribal_braids', 'faux_locs', 'faux_locs_updo',
  'crochet_curls', 'crochet_locs', 'marley_twists', 'senegalese_twists',
  'havana_twists', 'spring_twists', 'butterfly_locs',
  // Phase 1.1 Textured (all 10)
  'coils_4c', 'coils_4b', 'heat_damaged', 'wash_and_go', 'twist_out_defined',
  'braid_out', 'finger_coils', 'shingled_curls', 'stretched_natural', 'pineapple_updo',
  // Phase 1.1 Age Appropriate (all 10)
  'receding_short', 'receding_slicked', 'thinning_top', 'thinning_crown',
  'mature_bob', 'mature_pixie', 'distinguished_gray', 'silver_fox',
  'elegant_updo', 'classic_waves',
  // Phase 1.1 Hair Accessories (all 8)
  'with_clips', 'with_scrunchie', 'with_bobby_pins', 'with_flower_crown',
  'with_hair_pins', 'with_barrettes', 'with_ribbon', 'with_headscarf',
]);

// Hair styles handled via back-hair grouping (not unique render, but not default fallback)
const HAIR_BACK_GROUPS = new Set([
  // Straight group
  'long_straight', 'medium_straight', 'silk_press', 'long_layers', 'long_side_swept',
  'long_center_part', 'long_curtain_bangs', 'medium_layers', 'medium_side_swept',
  'medium_feathered', 'medium_curtain_bangs', 'stretched_natural', 'curtain_bangs_long',
  // Wavy group
  'long_wavy', 'long_beach_waves', 'medium_wavy', 'classic_waves',
  'curtain_bangs_wavy', 'egirl_style', 'with_flower_crown', 'with_ribbon',
  // Curly group
  'long_curly', 'long_defined_curls', 'medium_curly', 'medium_curly_defined',
  'afro', 'natural_curls', 'twist_out_long', 'medium_twist_out', 'twist_out_defined',
  'braid_out', 'finger_coils', 'shingled_curls', 'crochet_curls',
  // Braids/locs group
  'long_braids', 'long_braid_single', 'long_braids_pigtails', 'long_twists',
  'long_pigtails', 'box_braids', 'locs', 'goddess_locs', 'passion_twists',
  'knotless_braids_long', 'fulani_braids', 'tribal_braids', 'faux_locs',
  'crochet_locs', 'marley_twists', 'senegalese_twists', 'havana_twists',
  'spring_twists', 'butterfly_locs',
  // Bob/medium group
  'medium_bob', 'medium_bob_angled', 'medium_bob_layered', 'medium_bob_blunt',
  'medium_lob', 'medium_shag', 'medium_wolf_cut',
  // Half-up group
  'long_half_up', 'long_half_up_bun', 'medium_half_up',
  // Updo group
  'long_ponytail', 'long_ponytail_high', 'long_ponytail_low', 'long_ponytail_side',
  'long_bun', 'long_bun_messy', 'long_bun_top', 'long_chignon', 'long_space_buns',
]);

const EYE_STYLES = [
  'default', 'round', 'narrow', 'wide', 'almond', 'closed', 'happy', 'wink',
  'wink_left', 'sleepy', 'surprised', 'hearts', 'stars', 'cry', 'squint',
  'side', 'dizzy', 'roll',
] as const;

// All eye styles are implemented
const IMPLEMENTED_EYES = new Set(EYE_STYLES);

const EYEBROW_STYLES = [
  'default', 'natural', 'thick', 'thin', 'arched', 'flat', 'angry', 'sad',
  'raised', 'unibrow', 'concerned', 'skeptical',
] as const;

// All eyebrow styles are implemented
const IMPLEMENTED_EYEBROWS = new Set(EYEBROW_STYLES);

const NOSE_STYLES = [
  'default', 'small', 'medium', 'large', 'pointed', 'rounded', 'button',
  'hooked', 'flat', 'wide', 'narrow',
] as const;

// All nose styles are implemented
const IMPLEMENTED_NOSES = new Set(NOSE_STYLES);

const MOUTH_STYLES = [
  'default', 'smile', 'big_smile', 'grin', 'laugh', 'smirk', 'sad', 'frown',
  'serious', 'open', 'tongue', 'kiss', 'surprised', 'eating', 'grimace',
  'concerned', 'scream', 'bite',
] as const;

// All mouth styles are implemented
const IMPLEMENTED_MOUTHS = new Set(MOUTH_STYLES);

const CLOTHING_STYLES = [
  // T-Shirts
  'tshirt', 'tshirt_crew', 'tshirt_graphic', 'tshirt_striped', 'vneck',
  'scoop_neck',
  // Casual
  'polo', 'henley', 'tank_top', 'tank_athletic', 'crop_top',
  // Shirts
  'collar_shirt', 'button_up', 'button_up_open', 'flannel', 'hawaiian', 'denim_shirt',
  // Sweaters & Hoodies
  'sweater', 'sweater_cable', 'cardigan', 'turtleneck', 'hoodie', 'hoodie_zip', 'sweatshirt',
  // Formal
  'blazer', 'suit_jacket', 'vest', 'blouse', 'dress_shirt',
  // Outerwear
  'jacket_denim', 'jacket_leather', 'jacket_bomber', 'jacket_varsity', 'coat',
  // Athletic
  'jersey', 'sports_bra', 'athletic_top',
  // Dresses
  'dress_casual', 'dress_formal',
  // Special
  'overall', 'overalls', 'suspenders',
  // Phase 1.2 T-Shirts & Casual (20)
  'tshirt_longline', 'tshirt_muscle', 'tshirt_oversized', 'tshirt_raglan',
  'tshirt_baseball', 'tshirt_pocket', 'tshirt_cropped', 'tshirt_tie_dye',
  'tshirt_band', 'tshirt_vintage', 'tank_muscle', 'tank_stringy', 'tank_halter',
  'tank_racerback', 'camisole', 'tube_top', 'bandeau', 'off_shoulder',
  'one_shoulder', 'cold_shoulder',
  // Phase 1.2 Shirts (15)
  'oxford_shirt', 'chambray_shirt', 'linen_shirt', 'camp_collar', 'cuban_shirt',
  'bowling_shirt', 'work_shirt', 'western_shirt', 'mandarin_collar', 'band_collar',
  'popover', 'tunic', 'peasant_top', 'wrap_top', 'peplum_top',
  // Phase 1.2 Sweaters (20)
  'sweater_crew', 'sweater_vneck', 'sweater_oversized', 'sweater_cropped',
  'sweater_vest', 'sweater_mock_neck', 'sweater_cowl', 'sweater_fair_isle',
  'sweater_argyle', 'cardigan_oversized', 'cardigan_cropped', 'cardigan_long',
  'cardigan_belted', 'shrug', 'poncho', 'cape', 'knit_vest', 'pullover',
  'fleece', 'quarter_zip',
  // Phase 1.2 Hoodies (12)
  'hoodie_cropped', 'hoodie_oversized', 'hoodie_pullover', 'hoodie_sleeveless',
  'sweatshirt_crew', 'sweatshirt_cropped', 'sweatshirt_oversized',
  'sweatshirt_half_zip', 'sweatshirt_vintage', 'track_jacket', 'windbreaker', 'anorak',
  // Phase 1.2 Formal (20)
  'blazer_cropped', 'blazer_oversized', 'blazer_double_breasted', 'suit_vest',
  'waistcoat', 'tuxedo_jacket', 'dinner_jacket', 'sport_coat', 'blouse_silk',
  'blouse_ruffle', 'blouse_bow', 'blouse_wrap', 'blouse_peasant',
  'dress_shirt_french', 'dress_shirt_spread', 'dress_shirt_fitted', 'tie_front',
  'corset_top', 'bustier', 'bodysuit',
  // Phase 1.2 Outerwear (25)
  'jacket_trucker', 'jacket_biker', 'jacket_moto', 'jacket_cropped',
  'jacket_puffer', 'jacket_quilted', 'jacket_shearling', 'jacket_fleece',
  'jacket_safari', 'jacket_utility', 'jacket_harrington', 'jacket_field',
  'jacket_rain', 'coat_trench', 'coat_pea', 'coat_duffle', 'coat_overcoat',
  'coat_topcoat', 'coat_wool', 'coat_fur', 'coat_faux_fur', 'parka',
  'vest_puffer', 'vest_quilted', 'gilet',
  // Phase 1.2 Athletic (15)
  'jersey_basketball', 'jersey_football', 'jersey_soccer', 'jersey_baseball',
  'jersey_hockey', 'sports_top', 'compression_top', 'rashguard', 'running_top',
  'yoga_top', 'gym_top', 'workout_tank', 'cycling_jersey', 'tennis_polo', 'golf_shirt',
  // Phase 1.2 Dresses (15)
  'dress_mini', 'dress_midi', 'dress_maxi', 'dress_bodycon', 'dress_shift',
  'dress_wrap', 'dress_a_line', 'dress_slip', 'dress_shirt_dress',
  'dress_sweater', 'dress_sundress', 'dress_cocktail', 'dress_evening',
  'dress_ball_gown', 'romper',
  // Phase 1.2 Cultural (15)
  'kimono', 'kimono_jacket', 'cheongsam', 'kurta', 'dashiki', 'kente',
  'guayabera', 'poncho_traditional', 'sari_blouse', 'salwar_top',
  'hanbok_top', 'ao_dai_top', 'kaftan', 'djellaba', 'abaya',
] as const;

// Clothing styles handled by Sleeves.tsx (which determines sleeve rendering).
// Body.tsx uses a generic bodyShapePath for all clothing - no per-style case.
// Sleeves.tsx categorizes into: long-sleeve, short-sleeve, sleeveless groups.
// The actual torso/body rendering is generic for ALL clothing.
const IMPLEMENTED_CLOTHING_SLEEVES = new Set([
  // Long sleeve group (from Sleeves.tsx cases)
  'hoodie', 'hoodie_zip', 'hoodie_cropped', 'hoodie_oversized', 'hoodie_pullover',
  'sweater', 'sweater_cable', 'sweater_crew', 'sweater_vneck', 'sweater_oversized',
  'sweater_cropped', 'sweater_mock_neck', 'sweater_cowl', 'sweater_fair_isle',
  'sweater_argyle', 'cardigan', 'cardigan_oversized', 'cardigan_cropped',
  'cardigan_long', 'cardigan_belted', 'turtleneck', 'sweatshirt',
  'sweatshirt_crew', 'sweatshirt_cropped', 'sweatshirt_oversized',
  'sweatshirt_half_zip', 'sweatshirt_vintage', 'pullover', 'fleece', 'quarter_zip',
  'blazer', 'blazer_cropped', 'blazer_oversized', 'blazer_double_breasted',
  'suit_jacket', 'tuxedo_jacket', 'dinner_jacket', 'sport_coat',
  'dress_shirt', 'dress_shirt_french', 'dress_shirt_spread', 'dress_shirt_fitted',
  'collar_shirt', 'button_up', 'button_up_open', 'flannel', 'denim_shirt',
  'oxford_shirt', 'chambray_shirt', 'linen_shirt', 'work_shirt', 'western_shirt',
  'blouse', 'blouse_silk', 'blouse_ruffle', 'blouse_bow', 'blouse_wrap', 'blouse_peasant',
  'jacket_denim', 'jacket_leather', 'jacket_bomber', 'jacket_varsity',
  'jacket_trucker', 'jacket_biker', 'jacket_moto', 'jacket_puffer', 'jacket_quilted',
  'jacket_shearling', 'jacket_fleece', 'jacket_safari', 'jacket_utility',
  'jacket_harrington', 'jacket_field', 'jacket_rain', 'jacket_cropped',
  'track_jacket', 'windbreaker', 'anorak', 'coat', 'coat_trench', 'coat_pea',
  'coat_duffle', 'coat_overcoat', 'coat_topcoat', 'coat_wool', 'coat_fur',
  'coat_faux_fur', 'parka', 'tshirt_raglan', 'tshirt_baseball', 'tshirt_longline',
  'rashguard', 'compression_top', 'bodysuit', 'wrap_top', 'tunic', 'peasant_top',
  'kimono', 'kimono_jacket', 'cheongsam', 'kurta', 'dashiki', 'guayabera',
  'kaftan', 'djellaba', 'abaya', 'ao_dai_top', 'hanbok_top', 'salwar_top', 'sari_blouse',
  // Short sleeve group
  'tshirt', 'tshirt_crew', 'tshirt_graphic', 'tshirt_striped', 'tshirt_muscle',
  'tshirt_oversized', 'tshirt_pocket', 'tshirt_cropped', 'tshirt_tie_dye',
  'tshirt_band', 'tshirt_vintage', 'vneck', 'scoop_neck', 'polo', 'henley',
  'hawaiian', 'camp_collar', 'cuban_shirt', 'bowling_shirt', 'mandarin_collar',
  'band_collar', 'popover', 'peplum_top', 'tie_front', 'jersey',
  'jersey_basketball', 'jersey_football', 'jersey_soccer', 'jersey_baseball',
  'jersey_hockey', 'sports_top', 'running_top', 'yoga_top', 'gym_top',
  'cycling_jersey', 'tennis_polo', 'golf_shirt', 'athletic_top',
  'dress_shirt_dress', 'dress_casual', 'dress_midi', 'dress_maxi', 'dress_shift',
  'dress_sweater', 'dress_sundress', 'dress_cocktail', 'dress_evening',
  'dress_ball_gown', 'off_shoulder', 'one_shoulder', 'cold_shoulder',
  'poncho', 'cape', 'kente',
  // Sleeveless group
  'tank_top', 'tank_athletic', 'tank_muscle', 'tank_stringy', 'tank_halter',
  'tank_racerback', 'crop_top', 'camisole', 'tube_top', 'bandeau', 'sports_bra',
  'workout_tank', 'hoodie_sleeveless', 'sweater_vest', 'knit_vest', 'vest',
  'suit_vest', 'waistcoat', 'vest_puffer', 'vest_quilted', 'gilet', 'shrug',
  'corset_top', 'bustier', 'dress_formal', 'dress_mini', 'dress_bodycon',
  'dress_a_line', 'dress_slip', 'dress_wrap', 'romper', 'overall', 'overalls',
  'suspenders', 'poncho_traditional',
]);

const ARM_POSES = [
  'down', 'hips', 'crossed', 'wave', 'peace', 'thumbs_up', 'pointing',
  'hands_in_pockets', 'arms_behind_back', 'arms_behind_head', 'one_hand_hip',
  'arms_out', 'shrug', 'chin_rest', 'thinking', 'head_scratch',
  'arms_up', 'arms_raised_victory', 'fist_pump', 'double_fist_pump',
  'cheering', 'clapping', 'jazz_hands',
  'ok_sign', 'rock_on', 'hang_loose', 'praying', 'high_five', 'facepalm',
  'heart_hands', 'finger_guns', 'salute', 'flexing', 'double_flexing',
  'hugging_self', 'crying_cover', 'shocked_hands', 'blowing_kiss',
  'waving_both', 'covering_eyes', 'covering_mouth', 'covering_ears',
  'running', 'jumping_joy', 'dancing', 'dabbing', 'martial_arts',
  'throwing', 'catching', 'boxing', 'swimming', 'yoga_arms', 'meditation',
  'typing', 'presenting', 'phone_call', 'writing', 'holding_clipboard',
  'holding_coffee', 'holding_phone', 'holding_tablet',
  'leaning', 'lounging', 'stretching',
  'playing_guitar', 'playing_drums', 'djing', 'microphone', 'conducting',
] as const;

const IMPLEMENTED_ARMS = new Set([
  'down', 'hips', 'crossed', 'wave', 'peace', 'thumbs_up', 'pointing',
  'arms_up', 'flexing', 'praying', 'shrug',
]);

const LEG_POSES = [
  'standing', 'crossed', 'wide', 'sitting',
  'standing_relaxed', 'standing_weight_shift', 'standing_crossed_ankles',
  'standing_pigeon_toed', 'standing_duck_footed', 'standing_one_foot',
  'standing_tip_toe', 'standing_heel', 'lunge', 'squat', 'power_stance',
  'sitting_cross_legged', 'sitting_knees_up', 'sitting_legs_out',
  'sitting_legs_crossed', 'sitting_side_saddle', 'kneeling', 'kneeling_one_knee',
  'crouching', 'lotus',
  'walking', 'running_legs', 'jumping', 'jumping_split', 'kicking',
  'kicking_high', 'dancing_legs', 'splits',
  'lounging_legs', 'lying_down', 'lying_side', 'floating',
] as const;

const IMPLEMENTED_LEGS = new Set([
  'standing', 'crossed', 'wide', 'sitting',
]);

const HAND_GESTURES = [
  'open', 'fist', 'peace', 'point', 'thumbs_up', 'wave', 'holding',
  'thumbs_down', 'ok', 'rock_on_gesture', 'hang_loose_gesture', 'pinky_promise',
  'crossed_fingers', 'finger_gun', 'clapping_hands', 'praying_hands',
  'high_five_hand', 'fist_bump', 'snap', 'counting_one', 'counting_two',
  'counting_three', 'counting_four', 'counting_five', 'middle_finger',
  'shaka', 'vulcan_salute', 'call_me', 'money_gesture', 'chef_kiss',
  'pinch', 'grab', 'squeeze',
  'holding_cup', 'holding_phone_hand', 'holding_pen', 'holding_book',
  'holding_flower', 'holding_heart', 'holding_balloon', 'holding_gift',
  'holding_food', 'holding_drink', 'holding_microphone',
  'palm_down', 'palm_up', 'relaxed', 'limp',
] as const;

const IMPLEMENTED_HANDS = new Set([
  'open', 'fist', 'peace', 'point', 'thumbs_up', 'wave', 'holding',
]);

const BOTTOM_STYLES = [
  'none', 'jeans', 'jeans_skinny', 'jeans_wide', 'jeans_ripped', 'chinos',
  'dress_pants', 'joggers', 'sweatpants', 'cargo',
  'shorts', 'shorts_athletic', 'shorts_denim', 'shorts_cargo',
  'skirt_mini', 'skirt_midi', 'skirt_maxi', 'skirt_pleated', 'skirt_pencil', 'skirt_a_line',
  'leggings', 'overalls_full', 'jumpsuit',
  // Phase 1.2 Pants (25)
  'jeans_bootcut', 'jeans_straight', 'jeans_mom', 'jeans_boyfriend',
  'jeans_high_waist', 'jeans_low_rise', 'jeans_flare', 'jeans_distressed',
  'jeans_colored', 'chinos_slim', 'chinos_wide', 'trousers', 'trousers_wide',
  'trousers_pleated', 'culottes', 'palazzo', 'harem', 'capri', 'cropped_pants',
  'track_pants', 'yoga_pants', 'bike_shorts', 'bermuda', 'cargo_slim', 'overalls_shorts',
  // Phase 1.2 Skirts (15)
  'skirt_wrap', 'skirt_flared', 'skirt_bubble', 'skirt_asymmetric', 'skirt_tiered',
  'skirt_denim', 'skirt_leather', 'skirt_tulle', 'skirt_circle', 'skirt_handkerchief',
  'skirt_sarong', 'skirt_trumpet', 'skirt_mermaid', 'skirt_slip', 'skirt_tennis',
] as const;

// Bottoms.tsx uses a generic length-based system (short/knee/midi/long/full) - no per-style case
const IMPLEMENTED_BOTTOMS = 'generic-length-based' as const;

const SHOE_STYLES = [
  'none', 'barefoot', 'sneakers', 'sneakers_high', 'converse', 'slip_ons',
  'loafers', 'running', 'basketball', 'hiking', 'slides', 'sandals',
  'oxfords', 'loafers_dress', 'heels', 'heels_high', 'flats',
  'boots_ankle', 'boots_combat', 'boots_cowboy', 'boots_knee',
  'socks_only', 'flip_flops', 'crocs', 'slippers',
  // Phase 1.2 Sneakers (15)
  'sneakers_chunky', 'sneakers_retro', 'sneakers_minimal', 'sneakers_platform',
  'sneakers_designer', 'sneakers_canvas', 'sneakers_leather', 'sneakers_velcro',
  'sneakers_skate', 'air_jordan', 'yeezy', 'new_balance', 'vans_old_skool',
  'stan_smith', 'air_max',
  // Phase 1.2 Boots (15)
  'boots_chelsea', 'boots_chukka', 'boots_desert', 'boots_work', 'boots_hiking_tall',
  'boots_rain', 'boots_riding', 'boots_thigh_high', 'boots_platform', 'boots_stiletto',
  'boots_lug_sole', 'boots_sock', 'boots_duck', 'boots_snow', 'boots_ugg',
  // Phase 1.2 Formal (15)
  'oxfords_wing', 'brogues', 'derby', 'monks', 'pumps', 'kitten_heels',
  'stilettos', 'wedges', 'platform_heels', 'block_heels', 'mary_janes',
  'mules', 'slingbacks', 'ballet_flats', 'pointed_flats',
  // Phase 1.2 Sandals (10)
  'gladiator', 'espadrilles', 'huaraches', 'birkenstock', 'teva',
  'thong_sandals', 'platform_sandals', 'strappy_sandals', 'sport_sandals', 'jelly_shoes',
] as const;

const IMPLEMENTED_SHOES = new Set([
  'sneakers', 'running', 'sneakers_high', 'converse', 'basketball',
  'heels', 'heels_high', 'boots_ankle', 'boots_combat', 'boots_knee',
  'flats', 'oxfords', 'loafers', 'loafers_dress', 'sandals', 'flip_flops',
  'slides', 'slippers', 'crocs', 'hiking', 'barefoot', 'socks_only', 'none',
]);

const ACCESSORY_STYLES = [
  'none',
  'glasses_round', 'glasses_square', 'glasses_prescription', 'glasses_cat_eye',
  'glasses_oval', 'glasses_rectangle', 'glasses_browline',
  'sunglasses', 'sunglasses_aviator', 'sunglasses_wayfarer', 'sunglasses_round',
  'sunglasses_oversized', 'sunglasses_sport',
  'monocle', 'eyepatch',
  'earring_small', 'earring_hoop', 'earring_hoop_large', 'earring_dangle',
  'earring_stud', 'earring_multiple',
  'nose_ring', 'nose_stud', 'septum', 'lip_ring', 'eyebrow_piercing',
  'necklace_chain', 'necklace_pendant', 'necklace_choker', 'necklace_pearls',
  'headband', 'headband_athletic', 'sweatband',
  'headphones', 'headphones_over_ear', 'earbuds',
  // Phase 1.3 Eyewear (25)
  'glasses_reading', 'glasses_half_rim', 'glasses_wire', 'glasses_horn_rim',
  'glasses_clubmaster', 'glasses_geometric', 'glasses_hexagonal', 'glasses_clear',
  'glasses_tinted', 'glasses_blue_light',
  'sunglasses_shield', 'sunglasses_rectangular', 'sunglasses_vintage',
  'sunglasses_wrap', 'sunglasses_mirrored', 'sunglasses_gradient', 'sunglasses_colored',
  'sunglasses_heart', 'sunglasses_star', 'sunglasses_butterfly',
  'safety_glasses', 'goggles_swim', 'goggles_ski', 'night_vision', 'pince_nez',
  // Phase 1.3 Jewelry (30)
  'earring_cuff', 'earring_climber', 'earring_chandelier', 'earring_threader',
  'earring_huggie', 'earring_cross', 'earring_feather', 'earring_tribal',
  'necklace_layered', 'necklace_locket', 'necklace_bar', 'necklace_collar',
  'necklace_bib', 'necklace_statement', 'necklace_name', 'necklace_zodiac',
  'bracelet', 'bracelet_bangle', 'bracelet_charm', 'bracelet_cuff',
  'bracelet_beaded', 'bracelet_friendship', 'ring', 'ring_signet', 'ring_band',
  'ring_statement', 'ring_stacked', 'brooch', 'anklet', 'watch',
  // Phase 1.3 Headwear (25)
  'hat_baseball', 'hat_dad', 'hat_snapback', 'hat_trucker', 'hat_visor',
  'hat_bowler', 'hat_top', 'hat_cowboy', 'hat_straw', 'hat_sun', 'hat_floppy',
  'hat_beret', 'hat_newsboy', 'hat_flat', 'hat_cloche', 'hat_pillbox',
  'hat_fascinator', 'beanie_slouchy', 'beanie_pom', 'beanie_cuffed',
  'ear_muffs', 'headwrap', 'head_chain', 'tiara', 'crown',
  // Phase 1.3 Face Accessories (15)
  'face_mask', 'face_mask_surgical', 'face_mask_n95', 'face_mask_cloth',
  'face_mask_designer', 'bandana_face', 'face_shield', 'nose_strip',
  'face_sticker', 'face_jewels', 'face_paint', 'freckle_patches',
  'under_eye_patches', 'lip_liner', 'temporary_tattoo',
  // Phase 1.3 Tech (10)
  'airpods', 'airpods_pro', 'beats', 'galaxy_buds', 'gaming_headset',
  'vr_headset', 'smart_glasses', 'bluetooth_headset', 'headlamp', 'hearing_aid',
] as const;

const IMPLEMENTED_ACCESSORIES = new Set([
  'glasses_round', 'glasses_square', 'glasses_prescription', 'glasses_cat_eye',
  'sunglasses', 'sunglasses_aviator', 'sunglasses_wayfarer',
  'monocle', 'eyepatch',
  'earring_small', 'earring_hoop', 'nose_ring',
  'headphones', 'headband',
  'hat_baseball', 'necklace_chain', 'necklace_choker',
  'airpods', 'face_mask', 'beanie_cuffed',
  'none',
]);

const BODY_TYPES = ['slim', 'average', 'athletic', 'curvy', 'plus_size', 'muscular'] as const;

const SKIN_TONE_HEXES = [
  '#ffe4c4', '#fde0d9', '#fce4d8', '#ffdbb4', '#fcd5c5', '#fdd9bc',
  '#f5d7c3', '#f3d3b8', '#f5d5a8', '#f7dcc4', '#eac086', '#f0d5be',
  '#e8c8a0', '#e5c4a1', '#ddb896', '#dab590',
  '#d4a574', '#d0a070', '#cfa067', '#c99d77', '#c69765', '#c08b5a',
  '#b07850', '#a56b42', '#8d5524', '#7a4a2a', '#6b3e26', '#5c3420',
  '#4a2a1a', '#3d2215',
];

const HAIR_COLOR_HEXES = [
  '#1a1a1a', '#2c1b0e', '#3b2314', '#4a3728', '#5c4033', '#6b4423',
  '#7a5533', '#8b6040', '#b8860b', '#daa520', '#c4a35a', '#d4af37',
  '#e6be8a', '#f4d03f', '#e74c3c', '#ff6b35', '#a0522d', '#ffffff',
  '#c0c0c0', '#808080', '#4a0080', '#0066cc', '#2ecc71', '#ff69b4',
];

const EYE_COLOR_HEXES = [
  '#4a3728', '#2c1b0e', '#1a472a', '#1a5276', '#5b6abf', '#808080',
  '#c4a35a', '#2ecc71',
];

const EYELASH_STYLES = ['none', 'natural', 'light', 'medium', 'full', 'dramatic', 'wispy', 'cat_eye', 'doll'] as const;
const FACIAL_HAIR_STYLES = ['none', 'stubble', 'light_beard', 'medium_beard', 'full_beard', 'goatee', 'mustache', 'mustache_fancy', 'sideburns'] as const;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickHex(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// ============================================================================
// AVATAR CONFIG GENERATION
// ============================================================================

interface AvatarConfig {
  id: number;
  gender: string;
  faceShape: string;
  skinTone: string;
  eyeStyle: string;
  eyeColor: string;
  eyelashStyle?: string;
  eyebrowStyle: string;
  noseStyle: string;
  mouthStyle: string;
  hairStyle: string;
  hairColor: string;
  facialHair?: string;
  accessory?: string;
  clothing?: string;
  clothingColor?: string;
  bodyType?: string;
  armPose?: string;
  legPose?: string;
  leftHandGesture?: string;
  rightHandGesture?: string;
  bottomStyle?: string;
  shoeStyle?: string;
  shoeColor?: string;
}

function generateAvatar(id: number): AvatarConfig {
  const gender = pick(GENDERS);
  const config: AvatarConfig = {
    id,
    gender,
    faceShape: pick(FACE_SHAPES),
    skinTone: pickHex(SKIN_TONE_HEXES),
    eyeStyle: pick(EYE_STYLES),
    eyeColor: pickHex(EYE_COLOR_HEXES),
    eyebrowStyle: pick(EYEBROW_STYLES),
    noseStyle: pick(NOSE_STYLES),
    mouthStyle: pick(MOUTH_STYLES),
    hairStyle: pick(HAIR_STYLES),
    hairColor: pickHex(HAIR_COLOR_HEXES),
    bodyType: pick(BODY_TYPES),
    armPose: pick(ARM_POSES),
    legPose: pick(LEG_POSES),
    leftHandGesture: pick(HAND_GESTURES),
    rightHandGesture: pick(HAND_GESTURES),
    bottomStyle: pick(BOTTOM_STYLES),
    clothing: pick(CLOTHING_STYLES),
    clothingColor: pickHex(['#1a1a1a', '#ffffff', '#c62828', '#1565c0', '#2e7d32', '#f57f17', '#6a1b9a', '#00838f', '#d84315', '#4e342e']),
    shoeStyle: pick(SHOE_STYLES),
    shoeColor: pickHex(['#1a1a1a', '#f5f5f5', '#6b4423', '#c9a86c', '#1a237e', '#c62828', '#757575']),
    accessory: pick(ACCESSORY_STYLES),
  };

  if (gender === 'female' || Math.random() > 0.7) {
    config.eyelashStyle = pick(EYELASH_STYLES);
  }
  if (gender === 'male' || Math.random() > 0.8) {
    config.facialHair = pick(FACIAL_HAIR_STYLES);
  }

  return config;
}

// ============================================================================
// IMPROVEMENT ANALYSIS
// ============================================================================

type Priority = 'critical' | 'high' | 'medium' | 'low';
type Category = 'hair' | 'face' | 'body' | 'clothing' | 'accessories' | 'hands' | 'feet' | 'proportions' | 'shading';

interface Improvement {
  priority: Priority;
  category: Category;
  asset: string;
  issue: string;
  suggestion: string;
  file: string;
}

function analyzeAvatar(config: AvatarConfig): Improvement[] {
  const improvements: Improvement[] = [];

  // --- HAIR ---
  const hairVal = config.hairStyle;
  if (!IMPLEMENTED_HAIR.has(hairVal) && !HAIR_BACK_GROUPS.has(hairVal)) {
    improvements.push({
      priority: 'high',
      category: 'hair',
      asset: `HairStyle.${hairVal.toUpperCase()}`,
      issue: `Unimplemented hair style - falls back to generic short hair default. The switch statement in Hair.tsx has no explicit case for '${hairVal}', so it renders a generic rounded short hair shape regardless of what the user selected.`,
      suggestion: `Add a dedicated case in Hair.tsx for '${hairVal}' with custom SVG paths that accurately represent the style's silhouette, volume, and strand direction. Reference real hairstyle photography for proportions.`,
      file: 'packages/react-native-bitmoji/avatar/parts/Hair.tsx',
    });
  } else if (HAIR_BACK_GROUPS.has(hairVal) && !IMPLEMENTED_HAIR.has(hairVal)) {
    improvements.push({
      priority: 'medium',
      category: 'hair',
      asset: `HairStyle.${hairVal.toUpperCase()}`,
      issue: `Hair style '${hairVal}' is handled via back-hair grouping logic but lacks a dedicated front-hair case. The front rendering falls to default while only the back layer renders correctly via category grouping.`,
      suggestion: `Add a dedicated front-hair case in Hair.tsx for '${hairVal}' that renders the distinctive front features (bangs, part line, volume) while keeping the existing back-hair group rendering.`,
      file: 'packages/react-native-bitmoji/avatar/parts/Hair.tsx',
    });
  }

  // Hair-face clipping for long styles
  const longHairStyles = HAIR_STYLES.filter(h => h.startsWith('long_') || h.includes('locs') || h.includes('braids') || h === 'afro');
  if (longHairStyles.includes(hairVal as any)) {
    improvements.push({
      priority: 'low',
      category: 'hair',
      asset: `HairStyle.${hairVal.toUpperCase()}`,
      issue: `Long/voluminous hair style '${hairVal}' may clip through face or body SVG layers. The back-hair layer renders behind the body but long strands can visually overlap the face ellipse without proper masking.`,
      suggestion: `Add clip-path or mask definitions that prevent hair strands from rendering over the face region. Use the faceShape ellipse as a clip boundary for front-layer hair elements.`,
      file: 'packages/react-native-bitmoji/avatar/parts/Hair.tsx',
    });
  }

  // Hair color realism
  improvements.push({
    priority: 'low',
    category: 'shading',
    asset: 'HairColor',
    issue: `Hair uses flat single color with adjustBrightness() for shadow/highlight. No strand-level variation, no natural color gradients. Hair color '${config.hairColor}' renders as a uniform fill.`,
    suggestion: 'Implement SVG gradient fills with slight color variation along strand direction. Add subtle noise or pattern overlay for natural hair color depth. Consider per-strand color jitter for textured styles.',
    file: 'packages/react-native-bitmoji/avatar/parts/Hair.tsx',
  });

  // --- ARM POSE ---
  if (config.armPose && !IMPLEMENTED_ARMS.has(config.armPose)) {
    improvements.push({
      priority: 'high',
      category: 'body',
      asset: `ArmPose.${config.armPose.toUpperCase()}`,
      issue: `Unimplemented arm pose - falls back to arms-down default. ArmPose '${config.armPose}' has no case in Arms.tsx, so the avatar renders with arms straight down regardless of the selected pose.`,
      suggestion: `Add a dedicated case in Arms.tsx with custom arm path coordinates for '${config.armPose}'. Define shoulder, elbow, and wrist positions. Update the sleeve rendering in Sleeves.tsx to match the new arm geometry.`,
      file: 'packages/react-native-bitmoji/avatar/parts/Arms.tsx',
    });
  }

  // --- LEG POSE ---
  if (config.legPose && !IMPLEMENTED_LEGS.has(config.legPose)) {
    improvements.push({
      priority: 'high',
      category: 'body',
      asset: `LegPose.${config.legPose.toUpperCase()}`,
      issue: `Unimplemented leg pose - falls back to standing default. LegPose '${config.legPose}' has no case in Legs.tsx, so the avatar renders in a standard standing position regardless of selection.`,
      suggestion: `Add a dedicated case in Legs.tsx for '${config.legPose}' with proper hip, knee, and ankle positions. Update Feet.tsx shoe positioning to match the new leg geometry. Consider interaction with Bottoms.tsx fabric draping.`,
      file: 'packages/react-native-bitmoji/avatar/parts/Legs.tsx',
    });
  }

  // --- HAND GESTURES ---
  if (config.leftHandGesture && !IMPLEMENTED_HANDS.has(config.leftHandGesture)) {
    improvements.push({
      priority: 'medium',
      category: 'hands',
      asset: `HandGesture.${config.leftHandGesture.toUpperCase()} (left)`,
      issue: `Unimplemented left hand gesture - falls back to open hand default. HandGesture '${config.leftHandGesture}' has no case in Hands.tsx.`,
      suggestion: `Add a case in Hands.tsx for '${config.leftHandGesture}' with finger-specific SVG paths. Even with simplified "mitten" style, the gesture silhouette should be recognizable.`,
      file: 'packages/react-native-bitmoji/avatar/parts/Hands.tsx',
    });
  }
  if (config.rightHandGesture && !IMPLEMENTED_HANDS.has(config.rightHandGesture)) {
    improvements.push({
      priority: 'medium',
      category: 'hands',
      asset: `HandGesture.${config.rightHandGesture.toUpperCase()} (right)`,
      issue: `Unimplemented right hand gesture - falls back to open hand default. HandGesture '${config.rightHandGesture}' has no case in Hands.tsx.`,
      suggestion: `Add a case in Hands.tsx for '${config.rightHandGesture}' with finger-specific SVG paths. Even with simplified "mitten" style, the gesture silhouette should be recognizable.`,
      file: 'packages/react-native-bitmoji/avatar/parts/Hands.tsx',
    });
  }

  // Mitten hands (always applies)
  const handGestures = [config.leftHandGesture, config.rightHandGesture].filter(Boolean);
  if (handGestures.length > 0) {
    improvements.push({
      priority: 'medium',
      category: 'hands',
      asset: 'Hand rendering (all gestures)',
      issue: `All hand gestures use simplified "mitten-style" rendering without individual finger definition. Gestures like ${handGestures.map(g => `'${g}'`).join(', ')} lack knuckle detail, nail rendering, and proper finger separation at avatar scale.`,
      suggestion: 'Add individual finger path definitions with knuckle joints and nail detail. Use quadratic bezier curves for natural finger curvature. Add subtle shadow between fingers for depth.',
      file: 'packages/react-native-bitmoji/avatar/parts/Hands.tsx',
    });
  }

  // --- CLOTHING ---
  if (config.clothing && !IMPLEMENTED_CLOTHING_SLEEVES.has(config.clothing)) {
    improvements.push({
      priority: 'high',
      category: 'clothing',
      asset: `ClothingStyle.${config.clothing.toUpperCase()}`,
      issue: `Clothing style '${config.clothing}' is not handled by the Sleeves.tsx categorization system. Falls through to default short-sleeve rendering. The torso shape in Body.tsx is generic for all clothing.`,
      suggestion: `Add '${config.clothing}' to the appropriate sleeve category in Sleeves.tsx (long/short/sleeveless). Consider if this style needs unique neckline, collar, or detail rendering in Body.tsx.`,
      file: 'packages/react-native-bitmoji/avatar/parts/Sleeves.tsx',
    });
  }

  // Generic torso rendering (always applies when clothing is set)
  if (config.clothing) {
    improvements.push({
      priority: 'medium',
      category: 'clothing',
      asset: `ClothingStyle.${config.clothing.toUpperCase()} (torso)`,
      issue: `Body.tsx renders all clothing using the same generic bodyShapePath. Style '${config.clothing}' gets no unique neckline shape, collar detail, button placement, zipper, pocket, or pattern. Only the color and sleeve type differentiate clothing.`,
      suggestion: `Add per-style neckline variants (crew, v-neck, scoop, collar, hood) and detail overlays (buttons, zippers, pockets, logos) in Body.tsx. Group similar styles to share detail components.`,
      file: 'packages/react-native-bitmoji/avatar/parts/Body.tsx',
    });
  }

  // --- SHOES ---
  if (config.shoeStyle && !IMPLEMENTED_SHOES.has(config.shoeStyle)) {
    improvements.push({
      priority: 'medium',
      category: 'feet',
      asset: `ShoeStyle.${config.shoeStyle.toUpperCase()}`,
      issue: `Unimplemented shoe style '${config.shoeStyle}' falls back to generic sneaker default in Shoes.tsx. The distinctive silhouette, sole shape, and upper design are not rendered.`,
      suggestion: `Add a dedicated case in Shoes.tsx for '${config.shoeStyle}' with accurate sole height, toe shape, upper profile, and distinctive details (laces, straps, buckles, heels).`,
      file: 'packages/react-native-bitmoji/avatar/parts/Shoes.tsx',
    });
  }

  // --- ACCESSORIES ---
  if (config.accessory && config.accessory !== 'none' && !IMPLEMENTED_ACCESSORIES.has(config.accessory)) {
    improvements.push({
      priority: 'medium',
      category: 'accessories',
      asset: `AccessoryStyle.${config.accessory.toUpperCase()}`,
      issue: `Unimplemented accessory '${config.accessory}' renders nothing in AccessoryRenderer.tsx. The user selected this accessory but it is completely invisible on the avatar.`,
      suggestion: `Add a case in AccessoryRenderer.tsx for '${config.accessory}' with properly positioned SVG elements. Ensure correct z-layer ordering relative to face, hair, and body elements.`,
      file: 'packages/react-native-bitmoji/avatar/renderers/AccessoryRenderer.tsx',
    });
  }

  // --- BOTTOMS ---
  if (config.bottomStyle && config.bottomStyle !== 'none') {
    improvements.push({
      priority: 'low',
      category: 'clothing',
      asset: `BottomStyle.${config.bottomStyle.toUpperCase()}`,
      issue: `Bottoms.tsx uses a generic length-based rendering system (short/knee/midi/long/full). Style '${config.bottomStyle}' renders as the same shape as all other bottoms in its length category. No unique silhouette, pocket detail, waistband style, or fabric texture.`,
      suggestion: `Add per-style silhouette variations within each length category. For example, 'jeans_skinny' should taper more than 'jeans_wide'. Add waistband details (high-rise vs low-rise), pocket shapes, and fabric pattern overlays.`,
      file: 'packages/react-native-bitmoji/avatar/parts/Bottoms.tsx',
    });
  }

  // --- FACE SHAPE ---
  improvements.push({
    priority: 'low',
    category: 'face',
    asset: `FaceShape.${config.faceShape.toUpperCase()}`,
    issue: `All face shapes are rendered as ellipses with different rx/ry values. FaceShape '${config.faceShape}' lacks jaw definition, chin shape, cheekbone structure, and temple width variation. A 'heart' face looks like a slightly different ellipse from 'square'.`,
    suggestion: `Replace simple ellipse with a composite SVG path that defines jaw angle, chin point/flatness, cheekbone prominence, and forehead width independently. Use cubic bezier curves for organic face contours.`,
    file: 'packages/react-native-bitmoji/avatar/parts/Face.tsx',
  });

  // --- SKIN TONE SHADING ---
  improvements.push({
    priority: 'low',
    category: 'shading',
    asset: 'SkinTone shading',
    issue: `Skin uses single-color fill with adjustBrightness() for shadow areas. Skin tone '${config.skinTone}' has no subsurface scattering simulation, no warm/cool shadow variation, no natural color zone differences (cheeks warmer, under-eyes cooler).`,
    suggestion: 'Add radial gradient overlays for natural skin color zones. Use warm tint on cheeks/nose/ears and cool tint on temples/under-eyes. Add subtle SVG filter for subsurface scattering effect.',
    file: 'packages/react-native-bitmoji/avatar/parts/Face.tsx',
  });

  // --- NECK ---
  improvements.push({
    priority: 'low',
    category: 'proportions',
    asset: 'Neck rendering',
    issue: 'The neck is a simple rectangle connecting head to body. No trapezius muscle shape, no Adam\'s apple for male avatars, no SCM muscle definition. Neck width does not vary with body type.',
    suggestion: 'Replace rectangle with a tapered path that widens at the shoulders. Add trapezius curve visible above the collar line. Scale neck width/length proportionally to bodyType. Add subtle throat detail for male avatars.',
    file: 'packages/react-native-bitmoji/avatar/parts/Body.tsx',
  });

  // --- SLEEVE-ARM COORDINATION ---
  if (config.armPose && config.armPose !== 'down') {
    improvements.push({
      priority: 'medium',
      category: 'clothing',
      asset: `Sleeve-Arm coordination (${config.armPose})`,
      issue: `Sleeves.tsx duplicates arm dimension logic from Arms.tsx, creating potential drift. When arm pose '${config.armPose}' changes arm geometry, the sleeve rendering may not perfectly track the arm path, causing gaps or overlap.`,
      suggestion: 'Refactor Sleeves.tsx to import arm dimensions directly from Arms.tsx rather than recalculating. Use the arm path as a clip boundary for sleeve rendering to guarantee alignment.',
      file: 'packages/react-native-bitmoji/avatar/parts/Sleeves.tsx',
    });
  }

  // --- CLOTHING-BODY ALIGNMENT ---
  if (config.bodyType && config.bodyType !== 'average') {
    improvements.push({
      priority: 'medium',
      category: 'proportions',
      asset: `BodyType.${config.bodyType.toUpperCase()} clothing fit`,
      issue: `Clothing uses a fixed bodyShapePath that does not perfectly follow '${config.bodyType}' body curves. The body silhouette changes per body type but the clothing overlay uses the same base shape with minor scaling, causing visible gaps or clipping on non-average body types.`,
      suggestion: `Generate per-bodyType clothing paths that follow the actual body silhouette with consistent offset. Add body-type-specific clothing detail placement (pocket position, button spacing, hem line).`,
      file: 'packages/react-native-bitmoji/avatar/parts/Body.tsx',
    });
  }

  // --- EYEBROW-EYE SPACING ---
  improvements.push({
    priority: 'low',
    category: 'face',
    asset: 'Eyebrow-Eye spacing',
    issue: `Eyebrow positions are fixed and do not adapt to facial proportions. EyebrowStyle '${config.eyebrowStyle}' with EyeStyle '${config.eyeStyle}' on FaceShape '${config.faceShape}' uses the same absolute positions regardless of face height/width ratio.`,
    suggestion: 'Calculate eyebrow y-position relative to the eye center, scaled by faceShape proportions. Add a facialProportions.eyebrowHeight parameter that shifts eyebrow position vertically.',
    file: 'packages/react-native-bitmoji/avatar/parts/Eyebrows.tsx',
  });

  // Trim to 5-10 improvements, prioritizing higher severity
  const priorityOrder: Record<Priority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  improvements.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  // Keep between 5 and 10
  if (improvements.length > 10) {
    return improvements.slice(0, 10);
  }
  return improvements;
}

// ============================================================================
// REPORT GENERATION
// ============================================================================

interface AuditEntry {
  id: number;
  config: AvatarConfig;
  codePaths: {
    hairImplemented: boolean;
    hairBackGroupHandled: boolean;
    clothingSleeveHandled: boolean;
    armPoseImplemented: boolean;
    legPoseImplemented: boolean;
    leftHandImplemented: boolean;
    rightHandImplemented: boolean;
    shoeImplemented: boolean;
    accessoryImplemented: boolean;
    eyeStyleImplemented: boolean;
    eyebrowImplemented: boolean;
    noseImplemented: boolean;
    mouthImplemented: boolean;
  };
  improvements: Improvement[];
}

interface AuditReport {
  generatedAt: string;
  totalAvatars: number;
  summary: {
    totalImprovements: number;
    byCritical: number;
    byHigh: number;
    byMedium: number;
    byLow: number;
    byCategory: Record<string, number>;
    coverageGaps: {
      part: string;
      totalEnumValues: number;
      implementedCases: number;
      coveragePercent: number;
      file: string;
    }[];
  };
  avatars: AuditEntry[];
}

function generateReport(): AuditReport {
  // Use a fixed seed for reproducibility
  const rng = seededRandom(42);
  const origRandom = Math.random;
  Math.random = rng;

  const avatars: AuditEntry[] = [];

  for (let i = 1; i <= 50; i++) {
    const config = generateAvatar(i);
    const improvements = analyzeAvatar(config);

    avatars.push({
      id: i,
      config,
      codePaths: {
        hairImplemented: IMPLEMENTED_HAIR.has(config.hairStyle),
        hairBackGroupHandled: HAIR_BACK_GROUPS.has(config.hairStyle),
        clothingSleeveHandled: config.clothing ? IMPLEMENTED_CLOTHING_SLEEVES.has(config.clothing) : true,
        armPoseImplemented: config.armPose ? IMPLEMENTED_ARMS.has(config.armPose) : true,
        legPoseImplemented: config.legPose ? IMPLEMENTED_LEGS.has(config.legPose) : true,
        leftHandImplemented: config.leftHandGesture ? IMPLEMENTED_HANDS.has(config.leftHandGesture) : true,
        rightHandImplemented: config.rightHandGesture ? IMPLEMENTED_HANDS.has(config.rightHandGesture) : true,
        shoeImplemented: config.shoeStyle ? IMPLEMENTED_SHOES.has(config.shoeStyle) : true,
        accessoryImplemented: config.accessory ? IMPLEMENTED_ACCESSORIES.has(config.accessory) : true,
        eyeStyleImplemented: IMPLEMENTED_EYES.has(config.eyeStyle),
        eyebrowImplemented: IMPLEMENTED_EYEBROWS.has(config.eyebrowStyle),
        noseImplemented: IMPLEMENTED_NOSES.has(config.noseStyle),
        mouthImplemented: IMPLEMENTED_MOUTHS.has(config.mouthStyle),
      },
      improvements,
    });
  }

  Math.random = origRandom;

  // Compute summary
  const allImprovements = avatars.flatMap(a => a.improvements);
  const byCategory: Record<string, number> = {};
  for (const imp of allImprovements) {
    byCategory[imp.category] = (byCategory[imp.category] || 0) + 1;
  }

  const report: AuditReport = {
    generatedAt: new Date().toISOString(),
    totalAvatars: 50,
    summary: {
      totalImprovements: allImprovements.length,
      byCritical: allImprovements.filter(i => i.priority === 'critical').length,
      byHigh: allImprovements.filter(i => i.priority === 'high').length,
      byMedium: allImprovements.filter(i => i.priority === 'medium').length,
      byLow: allImprovements.filter(i => i.priority === 'low').length,
      byCategory,
      coverageGaps: [
        { part: 'HairStyle', totalEnumValues: HAIR_STYLES.length, implementedCases: IMPLEMENTED_HAIR.size, coveragePercent: Math.round((IMPLEMENTED_HAIR.size / HAIR_STYLES.length) * 100), file: 'parts/Hair.tsx' },
        { part: 'ClothingStyle (sleeves)', totalEnumValues: CLOTHING_STYLES.length, implementedCases: IMPLEMENTED_CLOTHING_SLEEVES.size, coveragePercent: Math.round((IMPLEMENTED_CLOTHING_SLEEVES.size / CLOTHING_STYLES.length) * 100), file: 'parts/Sleeves.tsx' },
        { part: 'ArmPose', totalEnumValues: ARM_POSES.length, implementedCases: IMPLEMENTED_ARMS.size, coveragePercent: Math.round((IMPLEMENTED_ARMS.size / ARM_POSES.length) * 100), file: 'parts/Arms.tsx' },
        { part: 'LegPose', totalEnumValues: LEG_POSES.length, implementedCases: IMPLEMENTED_LEGS.size, coveragePercent: Math.round((IMPLEMENTED_LEGS.size / LEG_POSES.length) * 100), file: 'parts/Legs.tsx' },
        { part: 'HandGesture', totalEnumValues: HAND_GESTURES.length, implementedCases: IMPLEMENTED_HANDS.size, coveragePercent: Math.round((IMPLEMENTED_HANDS.size / HAND_GESTURES.length) * 100), file: 'parts/Hands.tsx' },
        { part: 'BottomStyle', totalEnumValues: BOTTOM_STYLES.length, implementedCases: 5, coveragePercent: Math.round((5 / BOTTOM_STYLES.length) * 100), file: 'parts/Bottoms.tsx (generic length-based)' },
        { part: 'ShoeStyle', totalEnumValues: SHOE_STYLES.length, implementedCases: IMPLEMENTED_SHOES.size, coveragePercent: Math.round((IMPLEMENTED_SHOES.size / SHOE_STYLES.length) * 100), file: 'parts/Shoes.tsx' },
        { part: 'AccessoryStyle', totalEnumValues: ACCESSORY_STYLES.length, implementedCases: IMPLEMENTED_ACCESSORIES.size, coveragePercent: Math.round((IMPLEMENTED_ACCESSORIES.size / ACCESSORY_STYLES.length) * 100), file: 'renderers/AccessoryRenderer.tsx' },
        { part: 'EyeStyle', totalEnumValues: EYE_STYLES.length, implementedCases: IMPLEMENTED_EYES.size, coveragePercent: 100, file: 'parts/Eyes.tsx' },
        { part: 'EyebrowStyle', totalEnumValues: EYEBROW_STYLES.length, implementedCases: IMPLEMENTED_EYEBROWS.size, coveragePercent: 100, file: 'parts/Eyebrows.tsx' },
        { part: 'NoseStyle', totalEnumValues: NOSE_STYLES.length, implementedCases: IMPLEMENTED_NOSES.size, coveragePercent: 100, file: 'parts/Nose.tsx' },
        { part: 'MouthStyle', totalEnumValues: MOUTH_STYLES.length, implementedCases: IMPLEMENTED_MOUTHS.size, coveragePercent: 100, file: 'parts/Mouth.tsx' },
      ],
    },
    avatars,
  };

  return report;
}

// ============================================================================
// MAIN
// ============================================================================

// ============================================================================
// MARKDOWN REPORT GENERATION
// ============================================================================

function generateMarkdownReport(report: AuditReport): string {
  const s = report.summary;
  const lines: string[] = [];

  lines.push('# Avatar Quality Audit Report');
  lines.push('');
  lines.push(`> Generated: ${report.generatedAt}  `);
  lines.push(`> Avatars analyzed: ${report.totalAvatars} | Total improvements: ${s.totalImprovements}`);
  lines.push('');

  // --- Summary ---
  lines.push('## Summary');
  lines.push('');
  lines.push('| Priority | Count |');
  lines.push('|----------|-------|');
  lines.push(`| Critical | ${s.byCritical} |`);
  lines.push(`| High | ${s.byHigh} |`);
  lines.push(`| Medium | ${s.byMedium} |`);
  lines.push(`| Low | ${s.byLow} |`);
  lines.push('');

  // --- Coverage Gaps ---
  lines.push('## Coverage Gaps');
  lines.push('');
  lines.push('| Part | Implemented | Total | Coverage | File |');
  lines.push('|------|-------------|-------|----------|------|');
  for (const gap of s.coverageGaps) {
    const bar = gap.coveragePercent === 100 ? '100%' : `**${gap.coveragePercent}%**`;
    lines.push(`| ${gap.part} | ${gap.implementedCases} | ${gap.totalEnumValues} | ${bar} | \`${gap.file}\` |`);
  }
  lines.push('');

  // --- Top 10 Critical System-Wide Improvements ---
  lines.push('## Top 10 Critical System-Wide Improvements');
  lines.push('');

  // Aggregate improvements by unique issue pattern (deduplicate per-avatar instances)
  const issueGroups: Map<string, { improvement: Improvement; count: number; avatarIds: number[] }> = new Map();
  for (const avatar of report.avatars) {
    for (const imp of avatar.improvements) {
      // Create a stable key from the issue pattern (strip avatar-specific values)
      const key = `${imp.priority}|${imp.category}|${imp.file}|${imp.issue.replace(/'.+?'/g, "'X'")}`;
      const existing = issueGroups.get(key);
      if (existing) {
        existing.count++;
        existing.avatarIds.push(avatar.id);
      } else {
        issueGroups.set(key, { improvement: imp, count: 1, avatarIds: [avatar.id] });
      }
    }
  }

  // Sort by count * priority weight descending
  const priorityWeight: Record<string, number> = { critical: 100, high: 10, medium: 3, low: 1 };
  const sorted = [...issueGroups.values()].sort((a, b) =>
    (b.count * (priorityWeight[b.improvement.priority] || 1)) -
    (a.count * (priorityWeight[a.improvement.priority] || 1))
  );

  for (let i = 0; i < Math.min(10, sorted.length); i++) {
    const { improvement: imp, count } = sorted[i];
    lines.push(`### ${i + 1}. [${imp.priority.toUpperCase()}] ${imp.category} — ${imp.asset}`);
    lines.push('');
    lines.push(`**Affects ${count}/${report.totalAvatars} avatars** | File: \`${imp.file}\``);
    lines.push('');
    lines.push(`**Issue:** ${imp.issue}`);
    lines.push('');
    lines.push(`**Suggestion:** ${imp.suggestion}`);
    lines.push('');
  }

  // --- 5 Quick Wins ---
  lines.push('## 5 Quick Wins');
  lines.push('');
  lines.push('These are high-impact improvements that can be implemented quickly:');
  lines.push('');

  // Quick wins = high count + low complexity (low/medium priority tend to be simpler)
  // Or: high-count issues in parts with small enum sets
  const quickWinCandidates = sorted.filter(s =>
    s.count >= 5 && (s.improvement.priority === 'medium' || s.improvement.priority === 'low')
  );
  // Also include high-priority items with very high frequency as they indicate missing switch cases
  const highFreqHigh = sorted.filter(s => s.count >= 20 && s.improvement.priority === 'high');
  const quickWins = [...highFreqHigh, ...quickWinCandidates].slice(0, 5);

  for (let i = 0; i < quickWins.length; i++) {
    const { improvement: imp, count } = quickWins[i];
    const effort = imp.priority === 'low' ? 'Low' : imp.priority === 'medium' ? 'Medium' : 'High';
    lines.push(`${i + 1}. **${imp.asset}** (${count} avatars, ${effort} effort)`);
    lines.push(`   - ${imp.suggestion}`);
    lines.push(`   - File: \`${imp.file}\``);
    lines.push('');
  }

  // --- By-Category Breakdown ---
  lines.push('## Improvements by Category');
  lines.push('');
  lines.push('| Category | Count | % of Total |');
  lines.push('|----------|-------|------------|');
  const catEntries = Object.entries(s.byCategory).sort((a, b) => b[1] - a[1]);
  for (const [cat, count] of catEntries) {
    lines.push(`| ${cat} | ${count} | ${Math.round((count / s.totalImprovements) * 100)}% |`);
  }
  lines.push('');

  return lines.join('\n');
}

// ============================================================================
// MAIN
// ============================================================================

const report = generateReport();
const scriptDir = path.dirname(process.argv[1] || __filename);
const outputDir = path.resolve(scriptDir, '..', 'docs');
const jsonPath = path.join(outputDir, 'avatar-quality-audit.json');
const mdPath = path.join(outputDir, 'avatar-quality-audit-report.md');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8');
fs.writeFileSync(mdPath, generateMarkdownReport(report), 'utf-8');

console.log(`Avatar quality audit generated successfully.`);
console.log(`JSON: ${jsonPath}`);
console.log(`Report: ${mdPath}`);
console.log(`Total avatars: ${report.totalAvatars}`);
console.log(`Total improvements: ${report.summary.totalImprovements}`);
console.log(`  Critical: ${report.summary.byCritical}`);
console.log(`  High: ${report.summary.byHigh}`);
console.log(`  Medium: ${report.summary.byMedium}`);
console.log(`  Low: ${report.summary.byLow}`);
console.log(`\nCoverage gaps:`);
for (const gap of report.summary.coverageGaps) {
  console.log(`  ${gap.part}: ${gap.implementedCases}/${gap.totalEnumValues} (${gap.coveragePercent}%) - ${gap.file}`);
}
