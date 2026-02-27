/**
 * Avatar Parts - Barrel export
 *
 * Re-exports all SVG avatar part components for convenient imports.
 */

// Face parts
export { Face, default as FaceDefault } from './Face';
export { Eyes, default as EyesDefault } from './Eyes';
export { Hair, HairBehind, default as HairDefault } from './Hair';
export { Nose, default as NoseDefault } from './Nose';
export { Mouth, default as MouthDefault } from './Mouth';
export { Teeth, default as TeethDefault } from './Teeth';
export { Eyebrows, default as EyebrowsDefault } from './Eyebrows';
export { FaceDetails, default as FaceDetailsDefault } from './FaceDetails';
export { Makeup, default as MakeupDefault } from './Makeup';
export { FaceTattoo, default as FaceTattooDefault } from './FaceTattoo';

// Full body parts (Phase 1 & 2)
export { Body, default as BodyDefault } from './Body';
export { Arms, getWristPositions, default as ArmsDefault } from './Arms';
export { Legs, getAnklePositions, default as LegsDefault } from './Legs';
export { Hands, default as HandsDefault } from './Hands';
export { Feet, default as FeetDefault } from './Feet';
export { Bottoms, default as BottomsDefault } from './Bottoms';
export { Shoes, default as ShoesDefault } from './Shoes';
export { Sleeves, default as SleevesDefault } from './Sleeves';

// Expression system
export { ExpressionRenderer, applyExpressionToConfig, getExpressionEffects } from './ExpressionRenderer';
