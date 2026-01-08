#!/usr/bin/env node
/**
 * Generate 10 procedural hair style GLB models
 *
 * Hair styles:
 * - short: Low-profile cap following head closely
 * - medium: Extends slightly below ears
 * - long: Flows down past shoulders
 * - curly: Spherical with bumpy surface
 * - wavy: Medium length with wave displacement
 * - ponytail: Cap on head + hanging tail
 * - bun: Cap on head + spherical bun at back
 * - afro: Large spherical volume
 * - buzz: Very thin scalp-hugging cap
 * - bald: Minimal scalp-only mesh
 *
 * Uses direct GLB file writing (no browser APIs required)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Output directory for hair models
const OUTPUT_DIR = path.join(__dirname, '../public/models/hair');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ============================================================================
// Hair Style Definitions
// ============================================================================

const HAIR_STYLES = {
  short: {
    name: 'Short Hair',
    type: 'cap',
    thickness: 0.08,
    coverage: 0.75, // How far down the head it goes (0=top, 1=bottom)
    volume: 1.0,
    segments: 24,
    tags: ['masculine', 'feminine', 'common'],
  },
  medium: {
    name: 'Medium Hair',
    type: 'cap',
    thickness: 0.12,
    coverage: 0.55,
    volume: 1.1,
    segments: 24,
    sideExtension: 0.15, // Extends past sides
    tags: ['feminine', 'common'],
  },
  long: {
    name: 'Long Hair',
    type: 'flowing',
    thickness: 0.1,
    coverage: 0.65,
    volume: 1.05,
    flowLength: 0.8, // How far down it flows
    segments: 20, // Reduced for size optimization
    tags: ['feminine', 'common'],
  },
  curly: {
    name: 'Curly Hair',
    type: 'cap',
    thickness: 0.2,
    coverage: 0.6,
    volume: 1.3,
    bumpiness: 0.08,
    bumpFrequency: 8,
    segments: 28,
    tags: ['textured', 'volume'],
  },
  wavy: {
    name: 'Wavy Hair',
    type: 'flowing',
    thickness: 0.1,
    coverage: 0.6,
    volume: 1.1,
    flowLength: 0.5,
    waveAmplitude: 0.05,
    waveFrequency: 4,
    segments: 20, // Reduced for size optimization
    tags: ['textured', 'common'],
  },
  ponytail: {
    name: 'Ponytail',
    type: 'ponytail',
    thickness: 0.08,
    coverage: 0.7,
    volume: 1.0,
    tailLength: 0.6,
    tailRadius: 0.08,
    segments: 24,
    tags: ['feminine', 'tied'],
  },
  bun: {
    name: 'Hair Bun',
    type: 'bun',
    thickness: 0.08,
    coverage: 0.7,
    volume: 1.0,
    bunRadius: 0.12,
    segments: 24,
    tags: ['feminine', 'tied', 'professional'],
  },
  afro: {
    name: 'Afro',
    type: 'cap',
    thickness: 0.35,
    coverage: 0.55,
    volume: 1.5,
    bumpiness: 0.03,
    bumpFrequency: 12,
    segments: 32,
    tags: ['textured', 'volume', 'natural'],
  },
  buzz: {
    name: 'Buzz Cut',
    type: 'cap',
    thickness: 0.02,
    coverage: 0.8,
    volume: 1.0,
    segments: 20,
    tags: ['masculine', 'short'],
  },
  bald: {
    name: 'Bald',
    type: 'scalp',
    thickness: 0.005,
    coverage: 0.85,
    volume: 1.0,
    segments: 16,
    tags: ['none', 'scalp-only'],
    notes: 'Minimal scalp geometry for consistency',
  },
};

// ============================================================================
// Math Utilities
// ============================================================================

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function normalize(v) {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  if (len === 0) return [0, 0, 0];
  return [v[0] / len, v[1] / len, v[2] / len];
}

// ============================================================================
// Hair Cap Geometry (base for most styles)
// ============================================================================

function generateHairCapGeometry(params) {
  const {
    thickness = 0.1,
    coverage = 0.7,
    volume = 1.0,
    bumpiness = 0,
    bumpFrequency = 6,
    segments = 24,
    sideExtension = 0,
  } = params;

  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  const widthSegments = segments;
  const heightSegments = Math.floor(segments * coverage);

  // Head reference dimensions (matching generated heads)
  const headRadius = 1.0;
  const headCenterY = 1.0; // Head is positioned with bottom at y=0

  // Generate hair cap vertices
  for (let y = 0; y <= heightSegments; y++) {
    const v = y / heightSegments;
    const phi = v * Math.PI * coverage;

    for (let x = 0; x <= widthSegments; x++) {
      const u = x / widthSegments;
      const theta = u * Math.PI * 2;

      // Base sphere position
      let px = Math.sin(phi) * Math.cos(theta);
      let py = Math.cos(phi);
      let pz = Math.sin(phi) * Math.sin(theta);

      // Calculate hair offset from head surface
      let hairOffset = thickness;

      // Add bumpiness for curly/afro styles
      if (bumpiness > 0) {
        const bumpNoise =
          Math.sin(theta * bumpFrequency) *
          Math.cos(phi * bumpFrequency * 0.7) *
          bumpiness;
        hairOffset += bumpNoise;
      }

      // Side extension for medium hair
      if (sideExtension > 0) {
        const sideAmount = Math.sin(phi) * sideExtension;
        hairOffset += sideAmount * (1 - Math.abs(Math.cos(theta)));
      }

      // Scale by volume and apply offset
      const radius = (headRadius + hairOffset) * volume;
      px *= radius;
      py *= radius;
      pz *= radius;

      // Position relative to head center
      py += headCenterY;

      positions.push(px, py, pz);

      // Calculate normal (pointing outward)
      const normal = normalize([px, py - headCenterY, pz]);
      normals.push(normal[0], normal[1], normal[2]);

      // UVs
      uvs.push(u, v);
    }
  }

  // Generate indices
  for (let y = 0; y < heightSegments; y++) {
    for (let x = 0; x < widthSegments; x++) {
      const a = y * (widthSegments + 1) + x;
      const b = a + widthSegments + 1;
      const c = a + 1;
      const d = b + 1;

      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }

  return { positions, normals, uvs, indices };
}

// ============================================================================
// Flowing Hair Geometry (for long/wavy styles)
// ============================================================================

function generateFlowingHairGeometry(params) {
  const {
    thickness = 0.1,
    coverage = 0.65,
    volume = 1.0,
    flowLength = 0.6,
    waveAmplitude = 0,
    waveFrequency = 4,
    segments = 28,
  } = params;

  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  const widthSegments = segments;
  const capSegments = Math.floor(segments * 0.5);
  const flowSegments = Math.floor(segments * 0.6);

  const headRadius = 1.0;
  const headCenterY = 1.0;

  let vertexOffset = 0;

  // Part 1: Hair cap on head
  for (let y = 0; y <= capSegments; y++) {
    const v = y / capSegments;
    const phi = v * Math.PI * coverage;

    for (let x = 0; x <= widthSegments; x++) {
      const u = x / widthSegments;
      const theta = u * Math.PI * 2;

      let px = Math.sin(phi) * Math.cos(theta);
      let py = Math.cos(phi);
      let pz = Math.sin(phi) * Math.sin(theta);

      const radius = (headRadius + thickness) * volume;
      px *= radius;
      py *= radius;
      pz *= radius;

      py += headCenterY;

      positions.push(px, py, pz);

      const normal = normalize([px, py - headCenterY, pz]);
      normals.push(normal[0], normal[1], normal[2]);

      uvs.push(u, v * 0.4);
    }
  }

  vertexOffset = (capSegments + 1) * (widthSegments + 1);

  // Part 2: Flowing hair below
  const flowStartY = headCenterY + headRadius * Math.cos(Math.PI * coverage) * volume;
  const flowStartRadius = headRadius * Math.sin(Math.PI * coverage) * volume + thickness;

  for (let y = 0; y <= flowSegments; y++) {
    const v = y / flowSegments;

    for (let x = 0; x <= widthSegments; x++) {
      const u = x / widthSegments;
      const theta = u * Math.PI * 2;

      // Only back half flows down
      const isBack = theta > Math.PI * 0.3 && theta < Math.PI * 1.7;
      const backAmount = isBack ? 1.0 : 0.0;

      let px = Math.cos(theta) * flowStartRadius * (1 - v * 0.3);
      let py = flowStartY - v * flowLength * backAmount;
      let pz = Math.sin(theta) * flowStartRadius * (1 - v * 0.3);

      // Add wave displacement
      if (waveAmplitude > 0) {
        const wave = Math.sin(v * Math.PI * waveFrequency + theta * 2) * waveAmplitude;
        px += wave * Math.cos(theta);
        pz += wave * Math.sin(theta);
      }

      positions.push(px, py, pz);

      const normal = normalize([px, 0, pz]);
      normals.push(normal[0], -0.3, normal[2]);

      uvs.push(u, 0.4 + v * 0.6);
    }
  }

  // Generate indices for cap
  for (let y = 0; y < capSegments; y++) {
    for (let x = 0; x < widthSegments; x++) {
      const a = y * (widthSegments + 1) + x;
      const b = a + widthSegments + 1;
      const c = a + 1;
      const d = b + 1;

      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }

  // Generate indices for flow
  for (let y = 0; y < flowSegments; y++) {
    for (let x = 0; x < widthSegments; x++) {
      const a = vertexOffset + y * (widthSegments + 1) + x;
      const b = a + widthSegments + 1;
      const c = a + 1;
      const d = b + 1;

      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }

  // Connect cap to flow (ring at transition)
  const capLastRow = capSegments * (widthSegments + 1);
  const flowFirstRow = vertexOffset;

  for (let x = 0; x < widthSegments; x++) {
    const a = capLastRow + x;
    const b = flowFirstRow + x;
    const c = a + 1;
    const d = b + 1;

    indices.push(a, b, c);
    indices.push(b, d, c);
  }

  return { positions, normals, uvs, indices };
}

// ============================================================================
// Ponytail Geometry
// ============================================================================

function generatePonytailGeometry(params) {
  const {
    thickness = 0.08,
    coverage = 0.7,
    tailLength = 0.6,
    tailRadius = 0.08,
    segments = 24,
  } = params;

  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  // First, generate the cap
  const cap = generateHairCapGeometry({
    ...params,
    segments,
    coverage,
    thickness,
  });

  positions.push(...cap.positions);
  normals.push(...cap.normals);
  uvs.push(...cap.uvs);
  indices.push(...cap.indices);

  const capVertexCount = cap.positions.length / 3;

  // Add ponytail hanging from back
  const headCenterY = 1.0;
  const tailSegments = 12;
  const tailCircleSegments = 8;

  // Tail attachment point (back of head, slightly lower)
  const tailStartX = 0;
  const tailStartY = headCenterY + 0.3;
  const tailStartZ = -0.95;

  // Generate tail tube
  for (let y = 0; y <= tailSegments; y++) {
    const v = y / tailSegments;
    const currentY = tailStartY - v * tailLength;
    const currentRadius = tailRadius * (1 - v * 0.3); // Taper

    for (let x = 0; x <= tailCircleSegments; x++) {
      const u = x / tailCircleSegments;
      const theta = u * Math.PI * 2;

      const px = tailStartX + Math.cos(theta) * currentRadius;
      const py = currentY;
      const pz = tailStartZ + Math.sin(theta) * currentRadius * 0.6;

      positions.push(px, py, pz);

      const normal = normalize([Math.cos(theta), 0, Math.sin(theta)]);
      normals.push(normal[0], normal[1], normal[2]);

      uvs.push(u, v);
    }
  }

  // Generate tail indices
  for (let y = 0; y < tailSegments; y++) {
    for (let x = 0; x < tailCircleSegments; x++) {
      const a = capVertexCount + y * (tailCircleSegments + 1) + x;
      const b = a + tailCircleSegments + 1;
      const c = a + 1;
      const d = b + 1;

      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }

  return { positions, normals, uvs, indices };
}

// ============================================================================
// Bun Geometry
// ============================================================================

function generateBunGeometry(params) {
  const {
    thickness = 0.08,
    coverage = 0.7,
    bunRadius = 0.12,
    segments = 24,
  } = params;

  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  // First, generate the cap
  const cap = generateHairCapGeometry({
    ...params,
    segments,
    coverage,
    thickness,
  });

  positions.push(...cap.positions);
  normals.push(...cap.normals);
  uvs.push(...cap.uvs);
  indices.push(...cap.indices);

  const capVertexCount = cap.positions.length / 3;

  // Add bun at back of head
  const headCenterY = 1.0;
  const bunSegments = 12;

  // Bun center position (back of head, upper)
  const bunCenterX = 0;
  const bunCenterY = headCenterY + 0.7;
  const bunCenterZ = -1.0;

  // Generate bun sphere
  for (let y = 0; y <= bunSegments; y++) {
    const v = y / bunSegments;
    const phi = v * Math.PI;

    for (let x = 0; x <= bunSegments; x++) {
      const u = x / bunSegments;
      const theta = u * Math.PI * 2;

      const px = bunCenterX + Math.sin(phi) * Math.cos(theta) * bunRadius;
      const py = bunCenterY + Math.cos(phi) * bunRadius;
      const pz = bunCenterZ + Math.sin(phi) * Math.sin(theta) * bunRadius;

      positions.push(px, py, pz);

      const normal = normalize([
        Math.sin(phi) * Math.cos(theta),
        Math.cos(phi),
        Math.sin(phi) * Math.sin(theta),
      ]);
      normals.push(normal[0], normal[1], normal[2]);

      uvs.push(u, v);
    }
  }

  // Generate bun indices
  for (let y = 0; y < bunSegments; y++) {
    for (let x = 0; x < bunSegments; x++) {
      const a = capVertexCount + y * (bunSegments + 1) + x;
      const b = a + bunSegments + 1;
      const c = a + 1;
      const d = b + 1;

      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }

  return { positions, normals, uvs, indices };
}

// ============================================================================
// Scalp Geometry (minimal for bald)
// ============================================================================

function generateScalpGeometry(params) {
  const { coverage = 0.85, segments = 16 } = params;

  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  const widthSegments = segments;
  const heightSegments = Math.floor(segments * coverage);

  const headRadius = 1.0;
  const headCenterY = 1.0;
  const scalpOffset = 0.003; // Very thin

  for (let y = 0; y <= heightSegments; y++) {
    const v = y / heightSegments;
    const phi = v * Math.PI * coverage;

    for (let x = 0; x <= widthSegments; x++) {
      const u = x / widthSegments;
      const theta = u * Math.PI * 2;

      const radius = headRadius + scalpOffset;
      let px = Math.sin(phi) * Math.cos(theta) * radius;
      let py = Math.cos(phi) * radius + headCenterY;
      let pz = Math.sin(phi) * Math.sin(theta) * radius;

      positions.push(px, py, pz);

      const normal = normalize([px, py - headCenterY, pz]);
      normals.push(normal[0], normal[1], normal[2]);

      uvs.push(u, v);
    }
  }

  for (let y = 0; y < heightSegments; y++) {
    for (let x = 0; x < widthSegments; x++) {
      const a = y * (widthSegments + 1) + x;
      const b = a + widthSegments + 1;
      const c = a + 1;
      const d = b + 1;

      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }

  return { positions, normals, uvs, indices };
}

// ============================================================================
// Geometry Router
// ============================================================================

function generateHairGeometry(styleId, params) {
  switch (params.type) {
    case 'flowing':
      return generateFlowingHairGeometry(params);
    case 'ponytail':
      return generatePonytailGeometry(params);
    case 'bun':
      return generateBunGeometry(params);
    case 'scalp':
      return generateScalpGeometry(params);
    case 'cap':
    default:
      return generateHairCapGeometry(params);
  }
}

// ============================================================================
// GLB File Generation
// ============================================================================

function createGLB(styleId, params) {
  const geometry = generateHairGeometry(styleId, params);

  // Create buffers
  const positionBuffer = new Float32Array(geometry.positions);
  const normalBuffer = new Float32Array(geometry.normals);
  const uvBuffer = new Float32Array(geometry.uvs);
  const indexBuffer =
    geometry.indices.length > 65535
      ? new Uint32Array(geometry.indices)
      : new Uint16Array(geometry.indices);

  const indexComponentType = geometry.indices.length > 65535 ? 5125 : 5123; // UNSIGNED_INT or UNSIGNED_SHORT

  // Calculate bounding box
  let minX = Infinity,
    minY = Infinity,
    minZ = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity,
    maxZ = -Infinity;

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

  // Default hair color (brown)
  const defaultHairColor = [0.231, 0.188, 0.141, 1.0];

  // Create GLTF JSON
  const gltf = {
    asset: {
      version: '2.0',
      generator: 'Backtrack Avatar Generator',
    },
    scene: 0,
    scenes: [
      {
        name: 'Scene',
        nodes: [0],
      },
    ],
    nodes: [
      {
        name: `Hair_${styleId}`,
        mesh: 0,
      },
    ],
    meshes: [
      {
        name: `Hair_${styleId}`,
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
        name: 'Hair',
        pbrMetallicRoughness: {
          baseColorFactor: defaultHairColor,
          metallicFactor: 0.0,
          roughnessFactor: 0.6,
        },
      },
    ],
    accessors: [
      {
        bufferView: 0,
        byteOffset: 0,
        componentType: 5126, // FLOAT
        count: positionBuffer.length / 3,
        type: 'VEC3',
        min: [minX, minY, minZ],
        max: [maxX, maxY, maxZ],
      },
      {
        bufferView: 1,
        byteOffset: 0,
        componentType: 5126, // FLOAT
        count: normalBuffer.length / 3,
        type: 'VEC3',
      },
      {
        bufferView: 2,
        byteOffset: 0,
        componentType: 5126, // FLOAT
        count: uvBuffer.length / 2,
        type: 'VEC2',
      },
      {
        bufferView: 3,
        byteOffset: 0,
        componentType: indexComponentType,
        count: indexBuffer.length,
        type: 'SCALAR',
      },
    ],
    bufferViews: [
      {
        buffer: 0,
        byteOffset: positionOffset,
        byteLength: positionByteLength,
        target: 34962, // ARRAY_BUFFER
      },
      {
        buffer: 0,
        byteOffset: normalOffset,
        byteLength: normalByteLength,
        target: 34962, // ARRAY_BUFFER
      },
      {
        buffer: 0,
        byteOffset: uvOffset,
        byteLength: uvByteLength,
        target: 34962, // ARRAY_BUFFER
      },
      {
        buffer: 0,
        byteOffset: indexOffset,
        byteLength: indexByteLength,
        target: 34963, // ELEMENT_ARRAY_BUFFER
      },
    ],
    buffers: [
      {
        byteLength: totalBufferLength,
      },
    ],
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

  // GLB header
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0); // 'glTF'
  header.writeUInt32LE(2, 4); // version
  header.writeUInt32LE(
    12 + 8 + paddedJsonBuffer.length + 8 + binBuffer.length,
    8
  );

  // JSON chunk header
  const jsonChunkHeader = Buffer.alloc(8);
  jsonChunkHeader.writeUInt32LE(paddedJsonBuffer.length, 0);
  jsonChunkHeader.writeUInt32LE(0x4e4f534a, 4); // 'JSON'

  // BIN chunk header
  const binChunkHeader = Buffer.alloc(8);
  binChunkHeader.writeUInt32LE(binBuffer.length, 0);
  binChunkHeader.writeUInt32LE(0x004e4942, 4); // 'BIN\0'

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
// Main
// ============================================================================

async function main() {
  console.log('\n💇 Generating Hair Style Models\n');
  console.log(`Output directory: ${OUTPUT_DIR}\n`);

  const results = [];

  for (const [styleId, params] of Object.entries(HAIR_STYLES)) {
    console.log(`Creating ${params.name}...`);

    const result = createGLB(styleId, params);
    const filename = `${styleId}.glb`;
    const outputPath = path.join(OUTPUT_DIR, filename);

    fs.writeFileSync(outputPath, result.buffer);

    const sizeKB = (result.buffer.length / 1024).toFixed(2);
    console.log(
      `  ✓ ${filename} (${sizeKB} KB, ${result.triangles} triangles)`
    );

    results.push({
      id: styleId,
      name: params.name,
      file: filename,
      sizeKB: parseFloat(sizeKB),
      triangles: result.triangles,
      vertices: result.vertices,
      type: params.type,
      tags: params.tags || [],
    });
  }

  console.log('\n📊 Summary:\n');
  console.log('| Style     | File          | Size (KB) | Triangles | Vertices |');
  console.log('|-----------|---------------|-----------|-----------|----------|');

  for (const r of results) {
    console.log(
      `| ${r.id.padEnd(9)} | ${r.file.padEnd(13)} | ${r.sizeKB.toString().padStart(9)} | ${r.triangles.toString().padStart(9)} | ${r.vertices.toString().padStart(8)} |`
    );
  }

  const totalSize = results.reduce((sum, r) => sum + r.sizeKB, 0);
  console.log(`\nTotal size: ${totalSize.toFixed(2)} KB`);

  // Verify all files under 30KB limit
  const overLimit = results.filter((r) => r.sizeKB > 30);
  if (overLimit.length > 0) {
    console.warn('\n⚠️  Some files exceed 30KB limit:');
    overLimit.forEach((r) => console.warn(`  - ${r.file}: ${r.sizeKB} KB`));
  } else {
    console.log('\n✅ All files within 30KB limit');
  }

  // Generate manifest
  const manifest = {
    category: 'hair',
    version: '1.0.0',
    description: 'Hair style variants - attach to Head bone',
    generated: new Date().toISOString(),
    maxTriangles: 1500,
    maxSizeKB: 30,
    colorTintable: true,
    tintProperty: 'hairColor',
    assets: results.map((r) => ({
      id: r.id,
      name: r.name,
      file: r.file,
      sizeKB: r.sizeKB,
      triangles: r.triangles,
      vertices: r.vertices,
      colorTintable: true,
      type: r.type,
      status: 'complete',
      tags: r.tags,
    })),
  };

  const manifestPath = path.join(OUTPUT_DIR, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\n📝 Manifest written to: ${manifestPath}`);

  console.log('\n✨ Hair generation complete!\n');

  return results;
}

main().catch(console.error);
