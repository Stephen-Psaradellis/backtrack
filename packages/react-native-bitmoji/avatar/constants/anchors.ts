/**
 * Canonical Head Anchor Points
 *
 * ALL head-avatar components MUST reference these constants.
 * ViewBox: 0 0 100 100 (head-only avatar)
 *
 * Coordinate convention:
 *   - Origin (0,0) = top-left
 *   - Face center = (50, 46)
 *   - Top-left lighting assumed (highlights upper-left, shadows lower-right)
 *
 * Zone diagram (approximate Y ranges):
 *   y=14-22  : Hair top / forehead start
 *   y=22-35  : Forehead / eyebrow zone
 *   y=35-38  : Eyebrow line
 *   y=40-48  : Eye line
 *   y=50-56  : Nose zone
 *   y=60-68  : Mouth zone
 *   y=68-76  : Chin / jaw bottom
 *   y=70-92  : Neck zone
 *
 * Face safe zone (hair must NOT cover):
 *   x: 28 to 72, y: 28 to 72
 */

// === Face Ellipse ===
export const FACE_CX = 50;
export const FACE_CY = 46;
export const FACE_RX_DEFAULT = 27; // default oval
export const FACE_RY_DEFAULT = 32;

// === Feature Lines ===
export const EYEBROW_Y = 36;
export const EYE_Y = 44;
export const EYE_LEFT_X = 39;
export const EYE_RIGHT_X = 61;
export const EYE_RADIUS = 4; // reduced from 5 for Bitmoji proportions
export const EYE_SPACING_FROM_CENTER = 11; // each eye is 11 units from center

export const NOSE_X = 50;
export const NOSE_Y = 54;

export const MOUTH_X = 50;
export const MOUTH_Y = 64;

// === Ear Anchors ===
// Ears tuck behind face edge, NOT protrude past it
export const EAR_Y_OFFSET = 4; // below face center
export const EAR_RX = 3.5; // horizontal radius (was 5.5 — way too big)
export const EAR_RY = 5.5; // vertical radius (was 9 — way too big)
export const EAR_TUCK = 2; // how far ear center is INSIDE the face edge

// === Neck ===
export const NECK_TOP_Y = 70;
export const NECK_BOTTOM_Y = 92;
export const NECK_WIDTH_TOP = 18; // width at chin level
export const NECK_WIDTH_BOTTOM = 22; // width at shoulder level
export const NECK_CENTER_X = 50;

// === Hair Safe Zone ===
// Hair MUST NOT fill solid color inside this rectangle
export const FACE_SAFE_ZONE = {
  left: 28,
  right: 72,
  top: 28,
  bottom: 72,
};

// === Hairline ===
export const HAIRLINE_Y = 20; // where hair meets forehead (was effectively ~14, too high)
export const HAIR_TOP_Y = 10; // top of hair volume

// === Lighting Convention ===
export const LIGHT_ANGLE = 315; // degrees, top-left (NW)
export const HIGHLIGHT_OFFSET_X = -3; // shift highlights left
export const HIGHLIGHT_OFFSET_Y = -5; // shift highlights up

// === Clothing Neckline ===
export const CLOTHING_TOP_Y = 82; // where clothing starts in head avatar
export const SHOULDER_LEFT_X = 20;
export const SHOULDER_RIGHT_X = 80;
