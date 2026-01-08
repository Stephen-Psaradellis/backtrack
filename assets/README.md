# Avatar Asset Development Directory

This directory contains source files for creating avatar 3D models.

## Directory Structure

```
assets/
├── source-models/      # Raw FBX files from Mixamo
│   ├── ybot-tpose.fbx  # Primary base character
│   └── xbot-tpose.fbx  # Alternative base character
├── blender/            # Blender project files
│   └── avatar-template.blend  # Pre-configured template
└── README.md           # This file
```

## Workflow

### 1. Download Base Characters from Mixamo

1. Go to [mixamo.com](https://www.mixamo.com) (free Adobe account)
2. Download **Y Bot** and **X Bot** in T-pose
3. Settings: FBX Binary, With Skin, 30 FPS
4. Save to `source-models/`

### 2. Create Assets in Blender

1. Open `blender/avatar-template.blend`
2. Import Mixamo FBX (scale 0.01)
3. Create/modify parts following specs in `docs/ASSET_REQUIREMENTS.md`
4. Export as GLB per `docs/BLENDER_EXPORT_GUIDE.md`

### 3. Add to WebGL Avatar

1. Place GLB in appropriate `webgl-avatar/public/models/` subfolder
2. Update the category's `manifest.json`
3. Test in WebGL preview

### 4. Upload to Supabase

```bash
npx supabase storage cp webgl-avatar/public/models/hair/short.glb \
  supabase://avatar-models/hair/short.glb
```

## Asset Sources

| Priority | Source | License | URL |
|----------|--------|---------|-----|
| 1 | Quaternius | CC0 | quaternius.com |
| 2 | Mixamo | Free | mixamo.com |
| 3 | Sketchfab CC0 | CC0 | sketchfab.com |
| 4 | OpenGameArt | CC0 | opengameart.org |

## Documentation

- `docs/ASSET_REQUIREMENTS.md` - Technical specifications
- `docs/MIXAMO_BONE_HIERARCHY.md` - Skeleton reference
- `docs/BLENDER_EXPORT_GUIDE.md` - Export workflow
