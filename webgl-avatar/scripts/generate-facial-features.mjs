#!/usr/bin/env node
/**
 * Generate procedural facial feature GLB models
 *
 * Categories:
 * - Eyes (4 variants): almond, round, monolid, hooded
 * - Noses (4 variants): straight, roman, button, wide
 * - Mouths (4 variants): neutral, smile, slight, serious
 * - Eyebrows (4 variants): natural, arched, thick, thin
 * - Facial-hair (4 variants): none, stubble, goatee, beard
 *
 * Approach: Separate geometry pieces (Option A from AVATAR_3D_PLAN.md)
 *
 * Rationale:
 * - Most flexible for runtime customization
 * - Enables color tinting via material properties
 * - Consistent with existing head and hair approach
 * - Works well with R3F asset loading pattern
 *
 * Uses direct GLB file writing (no browser APIs required)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Output directories
const MODELS_DIR = path.join(__dirname, '../public/models');

// ============================================================================
// Math Utilities
// ============================================================================

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function normalize(v) {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  if (len === 0) return [0, 0, 0];
  return [v[0] / len, v[1] / len, v[2] / len];
}

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// ============================================================================
// Eye Shape Definitions
// ============================================================================

const EYE_SHAPES = {
  almond: {
    name: 'Almond Eyes',
    widthScale: 1.0,
    heightScale: 0.6,
    tiltAngle: 0.1,
    cornerSharpness: 0.7,
    lidCurvature: 0.3,
    tags: ['common', 'balanced'],
  },
  round: {
    name: 'Round Eyes',
    widthScale: 0.9,
    heightScale: 0.85,
    tiltAngle: 0,
    cornerSharpness: 0.2,
    lidCurvature: 0.1,
    tags: ['open', 'expressive'],
  },
  monolid: {
    name: 'Monolid Eyes',
    widthScale: 1.1,
    heightScale: 0.45,
    tiltAngle: 0.15,
    cornerSharpness: 0.5,
    lidCurvature: 0.0,
    tags: ['asian', 'smooth'],
  },
  hooded: {
    name: 'Hooded Eyes',
    widthScale: 0.95,
    heightScale: 0.5,
    tiltAngle: 0.05,
    cornerSharpness: 0.6,
    lidCurvature: 0.5,
    tags: ['deep-set', 'mature'],
  },
};

// ============================================================================
// Nose Shape Definitions
// ============================================================================

const NOSE_SHAPES = {
  straight: {
    name: 'Straight Nose',
    bridgeWidth: 0.3,
    bridgeHeight: 0.6,
    tipWidth: 0.35,
    tipProjection: 0.4,
    nostrilWidth: 0.4,
    bridgeCurve: 0.0,
    tags: ['common', 'balanced'],
  },
  roman: {
    name: 'Roman Nose',
    bridgeWidth: 0.35,
    bridgeHeight: 0.7,
    tipWidth: 0.35,
    tipProjection: 0.45,
    nostrilWidth: 0.4,
    bridgeCurve: 0.3,
    tags: ['prominent', 'bridge'],
  },
  button: {
    name: 'Button Nose',
    bridgeWidth: 0.25,
    bridgeHeight: 0.45,
    tipWidth: 0.4,
    tipProjection: 0.3,
    nostrilWidth: 0.35,
    bridgeCurve: -0.1,
    tags: ['small', 'upturned'],
  },
  wide: {
    name: 'Wide Nose',
    bridgeWidth: 0.4,
    bridgeHeight: 0.5,
    tipWidth: 0.55,
    tipProjection: 0.35,
    nostrilWidth: 0.55,
    bridgeCurve: 0.0,
    tags: ['broad', 'flat'],
  },
};

// ============================================================================
// Mouth Shape Definitions
// ============================================================================

const MOUTH_SHAPES = {
  neutral: {
    name: 'Neutral',
    width: 0.5,
    height: 0.15,
    upperLipThickness: 0.08,
    lowerLipThickness: 0.1,
    cornerCurve: 0.0,
    cupidBow: 0.3,
    tags: ['default', 'relaxed'],
  },
  smile: {
    name: 'Smile',
    width: 0.55,
    height: 0.18,
    upperLipThickness: 0.07,
    lowerLipThickness: 0.09,
    cornerCurve: 0.15,
    cupidBow: 0.35,
    tags: ['happy', 'friendly'],
  },
  slight: {
    name: 'Slight Smile',
    width: 0.52,
    height: 0.16,
    upperLipThickness: 0.075,
    lowerLipThickness: 0.095,
    cornerCurve: 0.08,
    cupidBow: 0.32,
    tags: ['subtle', 'pleasant'],
  },
  serious: {
    name: 'Serious',
    width: 0.48,
    height: 0.14,
    upperLipThickness: 0.085,
    lowerLipThickness: 0.1,
    cornerCurve: -0.03,
    cupidBow: 0.25,
    tags: ['firm', 'professional'],
  },
};

// ============================================================================
// Eyebrow Shape Definitions
// ============================================================================

const EYEBROW_SHAPES = {
  natural: {
    name: 'Natural',
    width: 0.35,
    thickness: 0.04,
    archHeight: 0.03,
    archPosition: 0.6,
    taperStart: 0.7,
    taperEnd: 0.02,
    tags: ['default', 'balanced'],
  },
  arched: {
    name: 'Arched',
    width: 0.38,
    thickness: 0.035,
    archHeight: 0.06,
    archPosition: 0.5,
    taperStart: 0.65,
    taperEnd: 0.015,
    tags: ['feminine', 'defined'],
  },
  thick: {
    name: 'Thick',
    width: 0.36,
    thickness: 0.06,
    archHeight: 0.025,
    archPosition: 0.55,
    taperStart: 0.8,
    taperEnd: 0.035,
    tags: ['bold', 'full'],
  },
  thin: {
    name: 'Thin',
    width: 0.34,
    thickness: 0.025,
    archHeight: 0.035,
    archPosition: 0.55,
    taperStart: 0.6,
    taperEnd: 0.01,
    tags: ['subtle', 'refined'],
  },
};

// ============================================================================
// Facial Hair Shape Definitions
// ============================================================================

const FACIAL_HAIR_SHAPES = {
  none: {
    name: 'None',
    isEmpty: true,
    tags: ['default', 'clean'],
  },
  stubble: {
    name: 'Stubble',
    coverage: 0.3,
    density: 0.5,
    length: 0.01,
    chinCoverage: 0.8,
    cheekCoverage: 0.4,
    neckCoverage: 0.3,
    tags: ['light', 'masculine'],
  },
  goatee: {
    name: 'Goatee',
    coverage: 0.4,
    density: 0.8,
    length: 0.03,
    chinCoverage: 1.0,
    cheekCoverage: 0.0,
    neckCoverage: 0.2,
    mustacheWidth: 0.5,
    tags: ['chin', 'defined'],
  },
  beard: {
    name: 'Full Beard',
    coverage: 0.8,
    density: 1.0,
    length: 0.05,
    chinCoverage: 1.0,
    cheekCoverage: 0.9,
    neckCoverage: 0.7,
    mustacheWidth: 0.8,
    tags: ['full', 'masculine'],
  },
};

// ============================================================================
// Geometry Generation: Eyes
// ============================================================================

function generateEyeGeometry(params) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  const segments = 8; // Reduced to meet 10KB limit (500 tri budget per pair)
  const baseRadius = 0.05;
  const eyeSpacing = 0.12;

  // Generate both eyes
  for (let eyeIdx = 0; eyeIdx < 2; eyeIdx++) {
    const side = eyeIdx === 0 ? -1 : 1;
    const offsetX = side * eyeSpacing;
    const vertexOffset = positions.length / 3;

    // Eye shape (ellipsoid with deformations)
    for (let lat = 0; lat <= segments; lat++) {
      const v = lat / segments;
      const phi = v * Math.PI;

      for (let lon = 0; lon <= segments; lon++) {
        const u = lon / segments;
        const theta = u * Math.PI * 2;

        // Base sphere
        let x = Math.sin(phi) * Math.cos(theta);
        let y = Math.sin(phi) * Math.sin(theta);
        let z = Math.cos(phi);

        // Apply eye shape deformations
        const widthMod = params.widthScale;
        const heightMod = params.heightScale;

        // Tilt effect
        const tiltOffset = y * params.tiltAngle * side;

        // Corner sharpness
        const cornerEffect =
          1.0 - params.cornerSharpness * (1 - smoothstep(-0.5, 0.5, Math.abs(x)));

        x *= baseRadius * widthMod * cornerEffect;
        y *= baseRadius * heightMod;
        z *= baseRadius * 0.5;

        // Position offset
        x += offsetX;
        y += 1.5 + tiltOffset; // Eye height on face
        z += 0.85; // Depth from face center

        positions.push(x, y, z);
        normals.push(...normalize([x - offsetX, y - 1.5, z - 0.85]));
        uvs.push(u, v);
      }
    }

    // Generate indices for this eye
    for (let lat = 0; lat < segments; lat++) {
      for (let lon = 0; lon < segments; lon++) {
        const a = vertexOffset + lat * (segments + 1) + lon;
        const b = a + segments + 1;
        const c = a + 1;
        const d = b + 1;

        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }
  }

  return { positions, normals, uvs, indices };
}

// ============================================================================
// Geometry Generation: Nose
// ============================================================================

function generateNoseGeometry(params) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  const segments = 12;

  // Nose bridge and tip using extruded profile
  const profilePoints = [];

  // Build nose profile from top to bottom
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    let y = lerp(1.6, 1.3, t); // Top to bottom of nose
    let z = 0.85; // Base depth

    // Bridge curve (roman nose bump or button upturn)
    const bridgeT = t < 0.6 ? t / 0.6 : 0;
    z += params.bridgeHeight * (1 - Math.abs(bridgeT - 0.5) * 2);
    z += params.bridgeCurve * Math.sin(bridgeT * Math.PI) * 0.1;

    // Tip projection
    if (t > 0.7) {
      const tipT = (t - 0.7) / 0.3;
      z += params.tipProjection * Math.sin(tipT * Math.PI * 0.5) * 0.2;
    }

    profilePoints.push({ y, z });
  }

  // Create nose mesh by extruding profile with varying width
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const { y, z } = profilePoints[i];

    // Width varies along nose
    let width;
    if (t < 0.3) {
      width = params.bridgeWidth;
    } else if (t < 0.7) {
      width = lerp(params.bridgeWidth, params.tipWidth, (t - 0.3) / 0.4);
    } else {
      width = lerp(params.tipWidth, params.nostrilWidth, (t - 0.7) / 0.3);
    }

    width *= 0.15; // Scale to face size

    for (let j = 0; j <= 8; j++) {
      const u = j / 8;
      const angle = (u - 0.5) * Math.PI;

      let x = Math.sin(angle) * width;
      let zOffset = Math.cos(angle) * width * 0.5;

      positions.push(x, y, z + zOffset);
      normals.push(...normalize([Math.sin(angle), 0, Math.cos(angle)]));
      uvs.push(u, t);
    }
  }

  // Generate indices
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < 8; j++) {
      const a = i * 9 + j;
      const b = a + 9;
      const c = a + 1;
      const d = b + 1;

      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }

  return { positions, normals, uvs, indices };
}

// ============================================================================
// Geometry Generation: Mouth
// ============================================================================

function generateMouthGeometry(params) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  const segmentsX = 12; // Reduced from 16 to meet 10KB limit
  const segmentsY = 5; // Reduced from 6
  const mouthY = 1.2;
  const mouthZ = 0.88;

  // Generate lips as curved surfaces
  for (let lip = 0; lip < 2; lip++) {
    const isUpper = lip === 0;
    const vertexOffset = positions.length / 3;

    const lipThickness = isUpper ? params.upperLipThickness : params.lowerLipThickness;
    const yOffset = isUpper ? lipThickness / 2 : -lipThickness / 2;

    for (let i = 0; i <= segmentsY; i++) {
      const v = i / segmentsY;

      for (let j = 0; j <= segmentsX; j++) {
        const u = j / segmentsX;
        const t = (u - 0.5) * 2; // -1 to 1

        // Horizontal position along mouth
        let x = t * params.width * 0.5;

        // Lip curve (pucker)
        const curveAmount = 1 - t * t;

        // Y position with lip curve
        let y = mouthY + yOffset;

        // Upper lip cupid's bow
        if (isUpper && v < 0.5) {
          const bowEffect = Math.cos(t * Math.PI) * params.cupidBow * 0.02;
          y += bowEffect;
        }

        // Z position (lip protrusion)
        let z = mouthZ;
        z += curveAmount * lipThickness * 0.5;
        z += (isUpper ? 1 : -1) * v * lipThickness * 0.3;

        // Corner curve (smile/frown)
        const cornerEffect = Math.abs(t);
        y += params.cornerCurve * cornerEffect * 0.1;
        z -= cornerEffect * cornerEffect * 0.02;

        positions.push(x, y, z);
        normals.push(0, isUpper ? 0.3 : -0.3, 1);
        uvs.push(u, v + lip * 0.5);
      }
    }

    // Generate indices for this lip
    for (let i = 0; i < segmentsY; i++) {
      for (let j = 0; j < segmentsX; j++) {
        const a = vertexOffset + i * (segmentsX + 1) + j;
        const b = a + segmentsX + 1;
        const c = a + 1;
        const d = b + 1;

        if (isUpper) {
          indices.push(a, c, b);
          indices.push(b, c, d);
        } else {
          indices.push(a, b, c);
          indices.push(b, d, c);
        }
      }
    }
  }

  return { positions, normals, uvs, indices };
}

// ============================================================================
// Geometry Generation: Eyebrows
// ============================================================================

function generateEyebrowGeometry(params) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  const segmentsLength = 12;
  const segmentsWidth = 4;

  // Generate both eyebrows
  for (let browIdx = 0; browIdx < 2; browIdx++) {
    const side = browIdx === 0 ? -1 : 1;
    const vertexOffset = positions.length / 3;

    const startX = side * 0.08;
    const endX = side * (0.08 + params.width);
    const baseY = 1.65;
    const baseZ = 0.87;

    for (let i = 0; i <= segmentsLength; i++) {
      const t = i / segmentsLength;

      // Position along eyebrow
      const x = lerp(startX, endX, t);

      // Arch curve
      let archOffset = 0;
      if (t < params.archPosition) {
        archOffset = params.archHeight * smoothstep(0, params.archPosition, t);
      } else {
        archOffset =
          params.archHeight *
          (1 - smoothstep(params.archPosition, 1, t));
      }

      const y = baseY + archOffset;

      // Thickness varies (taper at ends)
      let thickness = params.thickness;
      if (t > params.taperStart) {
        thickness = lerp(
          params.thickness,
          params.taperEnd,
          (t - params.taperStart) / (1 - params.taperStart)
        );
      }
      if (t < 0.2) {
        thickness *= smoothstep(0, 0.2, t);
      }

      for (let j = 0; j <= segmentsWidth; j++) {
        const w = (j / segmentsWidth - 0.5) * 2;
        const yOffset = w * thickness;

        positions.push(x, y + yOffset, baseZ + Math.abs(w) * 0.01);
        normals.push(0, 0, 1);
        uvs.push(t, j / segmentsWidth);
      }
    }

    // Generate indices for this eyebrow
    for (let i = 0; i < segmentsLength; i++) {
      for (let j = 0; j < segmentsWidth; j++) {
        const a = vertexOffset + i * (segmentsWidth + 1) + j;
        const b = a + segmentsWidth + 1;
        const c = a + 1;
        const d = b + 1;

        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }
  }

  return { positions, normals, uvs, indices };
}

// ============================================================================
// Geometry Generation: Facial Hair
// ============================================================================

function generateFacialHairGeometry(params) {
  if (params.isEmpty) {
    // Return minimal empty geometry for 'none' variant
    return {
      positions: [0, 0, 0, 0.001, 0, 0, 0, 0.001, 0],
      normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
      uvs: [0, 0, 1, 0, 0.5, 1],
      indices: [0, 1, 2],
    };
  }

  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  const segmentsX = 12; // Reduced from 16 to meet 10KB limit
  const segmentsY = 10; // Reduced from 12

  // Facial hair covers chin, cheeks, upper lip area
  const centerY = 1.15;
  const centerZ = 0.85;
  const width = 0.4;
  const height = 0.25;

  for (let i = 0; i <= segmentsY; i++) {
    const v = i / segmentsY;
    const yOffset = (v - 0.5) * height;

    for (let j = 0; j <= segmentsX; j++) {
      const u = j / segmentsX;
      const xOffset = (u - 0.5) * width;

      // Determine coverage based on position
      const isChin = v > 0.5;
      const isCheek = Math.abs(u - 0.5) > 0.3 && v < 0.6;
      const isMustache = v < 0.3 && Math.abs(u - 0.5) < 0.25;
      const isNeck = v > 0.8;

      let coverage = 0;
      if (isChin) coverage = params.chinCoverage;
      else if (isCheek) coverage = params.cheekCoverage;
      else if (isMustache) coverage = params.mustacheWidth || 0;
      else if (isNeck) coverage = params.neckCoverage;
      else coverage = params.coverage * 0.5;

      // Vary Z based on coverage and length
      const hairLength = coverage * params.length;
      const y = centerY - yOffset;
      const z = centerZ + hairLength;

      // Face curvature
      const faceRadius = 0.5;
      const distFromCenter = Math.sqrt(xOffset * xOffset + yOffset * yOffset);
      const faceCurve = Math.sqrt(
        Math.max(0, faceRadius * faceRadius - distFromCenter * distFromCenter)
      );

      positions.push(xOffset, y, z + faceCurve * 0.2);
      normals.push(0, 0, 1);
      uvs.push(u, v);
    }
  }

  // Generate indices
  for (let i = 0; i < segmentsY; i++) {
    for (let j = 0; j < segmentsX; j++) {
      const a = i * (segmentsX + 1) + j;
      const b = a + segmentsX + 1;
      const c = a + 1;
      const d = b + 1;

      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }

  return { positions, normals, uvs, indices };
}

// ============================================================================
// GLB File Generation
// ============================================================================

function createGLB(name, geometry, materialName, materialColor) {
  // Create buffers
  const positionBuffer = new Float32Array(geometry.positions);
  const normalBuffer = new Float32Array(geometry.normals);
  const uvBuffer = new Float32Array(geometry.uvs);
  const indexBuffer = new Uint16Array(geometry.indices);

  // Calculate bounding box
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (let i = 0; i < positionBuffer.length; i += 3) {
    minX = Math.min(minX, positionBuffer[i]);
    maxX = Math.max(maxX, positionBuffer[i]);
    minY = Math.min(minY, positionBuffer[i + 1]);
    maxY = Math.max(maxY, positionBuffer[i + 1]);
    minZ = Math.min(minZ, positionBuffer[i + 2]);
    maxZ = Math.max(maxZ, positionBuffer[i + 2]);
  }

  // Calculate byte lengths with padding
  const positionByteLength = positionBuffer.byteLength;
  const normalByteLength = normalBuffer.byteLength;
  const uvByteLength = uvBuffer.byteLength;
  const indexByteLength = indexBuffer.byteLength;

  const positionPadding = (4 - (positionByteLength % 4)) % 4;
  const normalPadding = (4 - (normalByteLength % 4)) % 4;
  const uvPadding = (4 - (uvByteLength % 4)) % 4;
  const indexPadding = (4 - (indexByteLength % 4)) % 4;

  // Buffer offsets
  let offset = 0;
  const positionOffset = offset;
  offset += positionByteLength + positionPadding;
  const normalOffset = offset;
  offset += normalByteLength + normalPadding;
  const uvOffset = offset;
  offset += uvByteLength + uvPadding;
  const indexOffset = offset;
  offset += indexByteLength + indexPadding;
  const totalBufferLength = offset;

  // Create GLTF JSON
  const gltf = {
    asset: {
      version: '2.0',
      generator: 'Backtrack Avatar Generator - Facial Features',
    },
    scene: 0,
    scenes: [{ name: 'Scene', nodes: [0] }],
    nodes: [{ name: name, mesh: 0 }],
    meshes: [
      {
        name: name,
        primitives: [
          {
            attributes: {
              POSITION: 0,
              NORMAL: 1,
              TEXCOORD_0: 2,
            },
            indices: 3,
            material: 0,
          },
        ],
      },
    ],
    materials: [
      {
        name: materialName,
        pbrMetallicRoughness: {
          baseColorFactor: materialColor,
          metallicFactor: 0.0,
          roughnessFactor: 0.6,
        },
      },
    ],
    accessors: [
      {
        bufferView: 0,
        byteOffset: 0,
        componentType: 5126,
        count: positionBuffer.length / 3,
        type: 'VEC3',
        min: [minX, minY, minZ],
        max: [maxX, maxY, maxZ],
      },
      {
        bufferView: 1,
        byteOffset: 0,
        componentType: 5126,
        count: normalBuffer.length / 3,
        type: 'VEC3',
      },
      {
        bufferView: 2,
        byteOffset: 0,
        componentType: 5126,
        count: uvBuffer.length / 2,
        type: 'VEC2',
      },
      {
        bufferView: 3,
        byteOffset: 0,
        componentType: 5123,
        count: indexBuffer.length,
        type: 'SCALAR',
      },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: positionOffset, byteLength: positionByteLength, target: 34962 },
      { buffer: 0, byteOffset: normalOffset, byteLength: normalByteLength, target: 34962 },
      { buffer: 0, byteOffset: uvOffset, byteLength: uvByteLength, target: 34962 },
      { buffer: 0, byteOffset: indexOffset, byteLength: indexByteLength, target: 34963 },
    ],
    buffers: [{ byteLength: totalBufferLength }],
  };

  // Create binary buffer
  const binBuffer = Buffer.alloc(totalBufferLength);
  Buffer.from(positionBuffer.buffer).copy(binBuffer, positionOffset);
  Buffer.from(normalBuffer.buffer).copy(binBuffer, normalOffset);
  Buffer.from(uvBuffer.buffer).copy(binBuffer, uvOffset);
  Buffer.from(indexBuffer.buffer).copy(binBuffer, indexOffset);

  // Create GLB
  const jsonString = JSON.stringify(gltf);
  const jsonBuffer = Buffer.from(jsonString);
  const jsonPadding = (4 - (jsonBuffer.length % 4)) % 4;
  const paddedJsonBuffer = Buffer.concat([
    jsonBuffer,
    Buffer.alloc(jsonPadding, 0x20),
  ]);

  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + paddedJsonBuffer.length + 8 + binBuffer.length, 8);

  const jsonChunkHeader = Buffer.alloc(8);
  jsonChunkHeader.writeUInt32LE(paddedJsonBuffer.length, 0);
  jsonChunkHeader.writeUInt32LE(0x4e4f534a, 4);

  const binChunkHeader = Buffer.alloc(8);
  binChunkHeader.writeUInt32LE(binBuffer.length, 0);
  binChunkHeader.writeUInt32LE(0x004e4942, 4);

  const glb = Buffer.concat([
    header,
    jsonChunkHeader,
    paddedJsonBuffer,
    binChunkHeader,
    binBuffer,
  ]);

  return {
    buffer: glb,
    triangles: geometry.indices.length / 3,
    vertices: geometry.positions.length / 3,
  };
}

// ============================================================================
// Manifest Generation
// ============================================================================

function generateManifest(category, description, maxTriangles, maxSizeKB, tintProperty, tintTarget, assets) {
  return {
    category,
    version: '1.0.0',
    description,
    maxTriangles,
    maxSizeKB,
    colorTintable: true,
    tintProperty,
    ...(tintTarget && { tintTarget }),
    generator: 'scripts/generate-facial-features.mjs',
    generatedAt: new Date().toISOString().split('T')[0],
    assets,
  };
}

// ============================================================================
// Main Generation Functions
// ============================================================================

async function generateCategory(categoryName, shapes, generateGeometry, materialName, materialColor, tintProperty, tintTarget) {
  const outputDir = path.join(MODELS_DIR, categoryName);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`\n  Generating ${categoryName}...`);
  const results = [];

  for (const [shapeId, params] of Object.entries(shapes)) {
    const geometry = generateGeometry(params);
    const name = `${categoryName}_${shapeId}`;
    const result = createGLB(name, geometry, materialName, materialColor);

    const filename = `${shapeId}.glb`;
    const outputPath = path.join(outputDir, filename);
    fs.writeFileSync(outputPath, result.buffer);

    const sizeKB = (result.buffer.length / 1024).toFixed(2);
    console.log(`    ✓ ${filename} (${sizeKB} KB, ${result.triangles} triangles)`);

    results.push({
      id: shapeId,
      name: params.name,
      file: filename,
      status: 'complete',
      sizeKB: parseFloat(sizeKB),
      triangles: result.triangles,
      vertices: result.vertices,
      tags: params.tags,
    });
  }

  return results;
}

async function main() {
  console.log('\n👤 Generating Facial Feature Models\n');
  console.log(`Output directory: ${MODELS_DIR}\n`);

  const allResults = {};

  // Eyes
  const eyeResults = await generateCategory(
    'eyes',
    EYE_SHAPES,
    generateEyeGeometry,
    'Eye',
    [0.95, 0.95, 0.95, 1.0], // White sclera default
    'eyeColor',
    'iris'
  );
  allResults.eyes = eyeResults;

  // Update eyes manifest
  const eyesManifest = generateManifest(
    'eyes',
    'Eye shape variants - attach to Head bone, iris supports color tinting',
    500,
    10,
    'eyeColor',
    'iris',
    eyeResults
  );
  fs.writeFileSync(
    path.join(MODELS_DIR, 'eyes', 'manifest.json'),
    JSON.stringify(eyesManifest, null, 2)
  );

  // Noses
  const noseResults = await generateCategory(
    'noses',
    NOSE_SHAPES,
    generateNoseGeometry,
    'Skin',
    [0.831, 0.647, 0.455, 1.0], // Default skin tone
    'skinTone',
    null
  );
  allResults.noses = noseResults;

  const nosesManifest = generateManifest(
    'noses',
    'Nose shape variants - attach to Head bone',
    300,
    10,
    'skinTone',
    null,
    noseResults
  );
  fs.writeFileSync(
    path.join(MODELS_DIR, 'noses', 'manifest.json'),
    JSON.stringify(nosesManifest, null, 2)
  );

  // Mouths
  const mouthResults = await generateCategory(
    'mouths',
    MOUTH_SHAPES,
    generateMouthGeometry,
    'Lips',
    [0.75, 0.5, 0.5, 1.0], // Default lip color
    'skinTone',
    null
  );
  allResults.mouths = mouthResults;

  const mouthsManifest = generateManifest(
    'mouths',
    'Mouth expression variants - attach to Head bone',
    400,
    10,
    'skinTone',
    null,
    mouthResults
  );
  fs.writeFileSync(
    path.join(MODELS_DIR, 'mouths', 'manifest.json'),
    JSON.stringify(mouthsManifest, null, 2)
  );

  // Eyebrows
  const eyebrowResults = await generateCategory(
    'eyebrows',
    EYEBROW_SHAPES,
    generateEyebrowGeometry,
    'Hair',
    [0.2, 0.15, 0.1, 1.0], // Default dark hair
    'hairColor',
    null
  );
  allResults.eyebrows = eyebrowResults;

  const eyebrowsManifest = generateManifest(
    'eyebrows',
    'Eyebrow style variants - attach to Head bone',
    200,
    10,
    'hairColor',
    null,
    eyebrowResults
  );
  fs.writeFileSync(
    path.join(MODELS_DIR, 'eyebrows', 'manifest.json'),
    JSON.stringify(eyebrowsManifest, null, 2)
  );

  // Facial Hair
  const facialHairResults = await generateCategory(
    'facial-hair',
    FACIAL_HAIR_SHAPES,
    generateFacialHairGeometry,
    'Hair',
    [0.2, 0.15, 0.1, 1.0], // Default dark hair
    'hairColor',
    null
  );
  allResults['facial-hair'] = facialHairResults;

  const facialHairManifest = generateManifest(
    'facial-hair',
    'Facial hair variants - attach to Head bone',
    800,
    10,
    'hairColor',
    null,
    facialHairResults
  );
  fs.writeFileSync(
    path.join(MODELS_DIR, 'facial-hair', 'manifest.json'),
    JSON.stringify(facialHairManifest, null, 2)
  );

  // Print summary
  console.log('\n📊 Summary:\n');

  for (const [category, results] of Object.entries(allResults)) {
    console.log(`\n${category.toUpperCase()}:`);
    console.log('| ID       | File       | Size (KB) | Triangles |');
    console.log('|----------|------------|-----------|-----------|');

    for (const r of results) {
      console.log(
        `| ${r.id.padEnd(8)} | ${r.file.padEnd(10)} | ${r.sizeKB.toString().padStart(9)} | ${r.triangles.toString().padStart(9)} |`
      );
    }

    const totalSize = results.reduce((sum, r) => sum + r.sizeKB, 0);
    console.log(`Total: ${totalSize.toFixed(2)} KB`);
  }

  // Check size limits
  console.log('\n📏 Size Limit Check (10KB per file):');
  let allWithinLimit = true;

  for (const [category, results] of Object.entries(allResults)) {
    const overLimit = results.filter((r) => r.sizeKB > 10);
    if (overLimit.length > 0) {
      allWithinLimit = false;
      console.warn(`  ⚠️  ${category}: ${overLimit.length} file(s) over limit`);
      overLimit.forEach((r) => console.warn(`      - ${r.file}: ${r.sizeKB} KB`));
    }
  }

  if (allWithinLimit) {
    console.log('  ✅ All files within 10KB limit');
  }

  console.log('\n✨ Facial feature generation complete!\n');

  return allResults;
}

main().catch(console.error);
