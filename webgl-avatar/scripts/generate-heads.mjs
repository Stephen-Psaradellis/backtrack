#!/usr/bin/env node
/**
 * Generate 6 procedural head shape GLB models
 *
 * Head shapes:
 * - oval: taller, narrower (balanced proportions)
 * - round: even proportions, soft features
 * - square: flat sides, strong jaw
 * - heart: wide forehead, narrow pointed chin
 * - oblong: elongated, narrow
 * - diamond: narrow forehead/chin, wide cheekbones
 *
 * Uses direct GLB file writing (no browser APIs required)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Output directory for head models
const OUTPUT_DIR = path.join(__dirname, '../public/models/heads');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ============================================================================
// Head Shape Definitions
// ============================================================================

const HEAD_SHAPES = {
  oval: {
    name: 'Oval Face',
    scaleX: 0.85,
    scaleY: 1.1,
    scaleZ: 0.9,
    jawWidth: 0.8,
    foreheadWidth: 0.95,
    cheekboneWidth: 0.9,
    chinPoint: 0.3,
  },
  round: {
    name: 'Round Face',
    scaleX: 1.0,
    scaleY: 1.0,
    scaleZ: 1.0,
    jawWidth: 0.95,
    foreheadWidth: 1.0,
    cheekboneWidth: 1.0,
    chinPoint: 0.1,
  },
  square: {
    name: 'Square Face',
    scaleX: 1.0,
    scaleY: 0.95,
    scaleZ: 0.95,
    jawWidth: 1.0,
    foreheadWidth: 1.0,
    cheekboneWidth: 0.95,
    chinPoint: 0.0,
  },
  heart: {
    name: 'Heart Face',
    scaleX: 0.9,
    scaleY: 1.05,
    scaleZ: 0.9,
    jawWidth: 0.65,
    foreheadWidth: 1.1,
    cheekboneWidth: 0.95,
    chinPoint: 0.5,
  },
  oblong: {
    name: 'Oblong Face',
    scaleX: 0.8,
    scaleY: 1.25,
    scaleZ: 0.85,
    jawWidth: 0.75,
    foreheadWidth: 0.8,
    cheekboneWidth: 0.8,
    chinPoint: 0.2,
  },
  diamond: {
    name: 'Diamond Face',
    scaleX: 0.85,
    scaleY: 1.1,
    scaleZ: 0.9,
    jawWidth: 0.6,
    foreheadWidth: 0.7,
    cheekboneWidth: 1.1,
    chinPoint: 0.4,
  },
};

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

// ============================================================================
// Geometry Generation
// ============================================================================

function generateSphereGeometry(widthSegments, heightSegments, params) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  // Generate vertices
  for (let y = 0; y <= heightSegments; y++) {
    const v = y / heightSegments;
    const phi = v * Math.PI;

    for (let x = 0; x <= widthSegments; x++) {
      const u = x / widthSegments;
      const theta = u * Math.PI * 2;

      // Base sphere position
      let px = Math.sin(phi) * Math.cos(theta);
      let py = Math.cos(phi);
      let pz = Math.sin(phi) * Math.sin(theta);

      // Normalize Y to 0-1 range (0 at bottom, 1 at top)
      const normalizedY = (py + 1) / 2;

      // Calculate width modifier based on vertical position
      let widthMod = 1.0;

      if (normalizedY < 0.3) {
        // Chin/jaw area
        const t = normalizedY / 0.3;
        widthMod = lerp(params.chinPoint, params.jawWidth, t);
      } else if (normalizedY < 0.5) {
        // Lower cheek to cheekbone
        const t = (normalizedY - 0.3) / 0.2;
        widthMod = lerp(params.jawWidth, params.cheekboneWidth, t);
      } else if (normalizedY < 0.7) {
        // Cheekbone area (widest)
        widthMod = params.cheekboneWidth;
      } else if (normalizedY < 0.85) {
        // Temple area
        const t = (normalizedY - 0.7) / 0.15;
        widthMod = lerp(params.cheekboneWidth, params.foreheadWidth, t);
      } else {
        // Forehead to crown
        const t = (normalizedY - 0.85) / 0.15;
        widthMod = lerp(params.foreheadWidth, params.foreheadWidth * 0.9, t);
      }

      // Apply shape transformations
      px *= params.scaleX * widthMod;
      py *= params.scaleY;
      pz *= params.scaleZ * widthMod;

      // Offset so bottom is at y=0
      py += params.scaleY;

      positions.push(px, py, pz);

      // Normal (approximate - just normalized position for sphere-like shape)
      const normal = normalize([px, py - params.scaleY, pz]);
      normals.push(normal[0], normal[1], normal[2]);

      // UVs
      uvs.push(u, 1 - v);
    }
  }

  // Generate indices
  for (let y = 0; y < heightSegments; y++) {
    for (let x = 0; x < widthSegments; x++) {
      const a = y * (widthSegments + 1) + x;
      const b = a + widthSegments + 1;
      const c = a + 1;
      const d = b + 1;

      // Two triangles per quad
      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }

  return { positions, normals, uvs, indices };
}

// ============================================================================
// GLB File Generation
// ============================================================================

function createGLB(shapeId, params) {
  const segments = 32;
  const geometry = generateSphereGeometry(segments, segments, params);

  // Create buffers
  const positionBuffer = new Float32Array(geometry.positions);
  const normalBuffer = new Float32Array(geometry.normals);
  const uvBuffer = new Float32Array(geometry.uvs);
  const indexBuffer = new Uint16Array(geometry.indices);

  // Calculate bounding box for accessor min/max
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

  // Calculate byte lengths (with padding to 4-byte alignment)
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

  // Create the GLTF JSON
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
        name: `Head_${shapeId}`,
        mesh: 0,
      },
    ],
    meshes: [
      {
        name: `Head_${shapeId}`,
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
        name: 'Skin',
        pbrMetallicRoughness: {
          baseColorFactor: [0.831, 0.647, 0.455, 1.0], // Default skin tone
          metallicFactor: 0.0,
          roughnessFactor: 0.7,
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
        componentType: 5123, // UNSIGNED_SHORT
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

  // Create the binary buffer
  const binBuffer = Buffer.alloc(totalBufferLength);

  // Write position data
  Buffer.from(positionBuffer.buffer).copy(binBuffer, positionOffset);

  // Write normal data
  Buffer.from(normalBuffer.buffer).copy(binBuffer, normalOffset);

  // Write UV data
  Buffer.from(uvBuffer.buffer).copy(binBuffer, uvOffset);

  // Write index data
  Buffer.from(indexBuffer.buffer).copy(binBuffer, indexOffset);

  // Create GLB
  const jsonString = JSON.stringify(gltf);
  const jsonBuffer = Buffer.from(jsonString);

  // Pad JSON to 4-byte alignment
  const jsonPadding = (4 - (jsonBuffer.length % 4)) % 4;
  const paddedJsonBuffer = Buffer.concat([
    jsonBuffer,
    Buffer.alloc(jsonPadding, 0x20), // Space character for JSON padding
  ]);

  // GLB header (12 bytes)
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0); // magic: 'glTF'
  header.writeUInt32LE(2, 4); // version: 2
  header.writeUInt32LE(
    12 + 8 + paddedJsonBuffer.length + 8 + binBuffer.length,
    8
  ); // total length

  // JSON chunk header (8 bytes)
  const jsonChunkHeader = Buffer.alloc(8);
  jsonChunkHeader.writeUInt32LE(paddedJsonBuffer.length, 0); // chunk length
  jsonChunkHeader.writeUInt32LE(0x4e4f534a, 4); // chunk type: 'JSON'

  // BIN chunk header (8 bytes)
  const binChunkHeader = Buffer.alloc(8);
  binChunkHeader.writeUInt32LE(binBuffer.length, 0); // chunk length
  binChunkHeader.writeUInt32LE(0x004e4942, 4); // chunk type: 'BIN\0'

  // Combine all parts
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
  console.log('\n🎭 Generating Head Shape Models\n');
  console.log(`Output directory: ${OUTPUT_DIR}\n`);

  const results = [];

  for (const [shapeId, params] of Object.entries(HEAD_SHAPES)) {
    console.log(`Creating ${params.name}...`);

    const result = createGLB(shapeId, params);
    const filename = `${shapeId}.glb`;
    const outputPath = path.join(OUTPUT_DIR, filename);

    fs.writeFileSync(outputPath, result.buffer);

    const sizeKB = (result.buffer.length / 1024).toFixed(2);
    console.log(`  ✓ ${filename} (${sizeKB} KB, ${result.triangles} triangles)`);

    results.push({
      id: shapeId,
      name: params.name,
      file: filename,
      sizeKB: parseFloat(sizeKB),
      triangles: result.triangles,
      vertices: result.vertices,
    });
  }

  console.log('\n📊 Summary:\n');
  console.log('| Shape   | File        | Size (KB) | Triangles | Vertices |');
  console.log('|---------|-------------|-----------|-----------|----------|');

  for (const r of results) {
    console.log(
      `| ${r.id.padEnd(7)} | ${r.file.padEnd(11)} | ${r.sizeKB.toString().padStart(9)} | ${r.triangles.toString().padStart(9)} | ${r.vertices.toString().padStart(8)} |`
    );
  }

  const totalSize = results.reduce((sum, r) => sum + r.sizeKB, 0);
  console.log(`\nTotal size: ${totalSize.toFixed(2)} KB`);

  // Verify all files under 50KB limit
  const overLimit = results.filter((r) => r.sizeKB > 50);
  if (overLimit.length > 0) {
    console.warn('\n⚠️  Some files exceed 50KB limit:');
    overLimit.forEach((r) => console.warn(`  - ${r.file}: ${r.sizeKB} KB`));
  } else {
    console.log('\n✅ All files within 50KB limit');
  }

  console.log('\n✨ Head generation complete!\n');

  return results;
}

main().catch(console.error);
