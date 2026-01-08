-- ============================================================================
-- Avatar Models Storage Bucket Migration
-- ============================================================================
-- Creates the 'avatar-models' storage bucket for hosting GLTF/GLB 3D model
-- files used by the WebGL avatar renderer.
--
-- Task 19 - Fix GLTF model loading in WebView
--
-- Key features:
-- - PUBLIC bucket for fast, cacheable 3D model assets
-- - Read-only for public (no uploads via client)
-- - Models uploaded via CLI/admin only
-- ============================================================================

-- ============================================================================
-- CREATE AVATAR MODELS STORAGE BUCKET
-- ============================================================================
-- The bucket is PUBLIC because models are static assets that need to be
-- loaded by the WebView without authentication.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatar-models',
    'avatar-models',
    true,  -- Public bucket for fast asset loading
    5242880,  -- 5MB max file size (GLB models are typically <100KB)
    ARRAY['model/gltf-binary', 'model/gltf+json', 'application/octet-stream']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- STORAGE OBJECT POLICIES FOR AVATAR-MODELS BUCKET
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SELECT (Download) Policy - Public Read
-- ----------------------------------------------------------------------------
-- Anyone can read avatar models (public assets).
-- This enables the WebView to load models without authentication.

DROP POLICY IF EXISTS "avatar_models_public_read" ON storage.objects;
CREATE POLICY "avatar_models_public_read"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'avatar-models');

-- Note: No INSERT/UPDATE/DELETE policies for public users.
-- Models should only be uploaded via service role (CLI, admin).

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these queries to verify the migration:
--
-- Check bucket exists:
-- SELECT * FROM storage.buckets WHERE id = 'avatar-models';
--
-- Check policies exist:
-- SELECT policyname, cmd FROM pg_policies
-- WHERE schemaname = 'storage' AND tablename = 'objects'
-- AND policyname LIKE 'avatar_models%';
--
-- ============================================================================
-- EXPECTED STORAGE STRUCTURE
-- ============================================================================
--
-- avatar-models/
-- ├── base/
-- │   └── manifest.json
-- ├── heads/
-- │   ├── oval.glb
-- │   ├── round.glb
-- │   ├── square.glb
-- │   ├── heart.glb
-- │   ├── oblong.glb
-- │   ├── diamond.glb
-- │   └── manifest.json
-- ├── bodies/
-- │   ├── slim.glb
-- │   ├── average.glb
-- │   ├── athletic.glb
-- │   ├── plus.glb
-- │   ├── muscular.glb
-- │   └── manifest.json
-- ├── hair/
-- │   ├── short.glb
-- │   ├── medium.glb
-- │   ├── long.glb
-- │   ├── curly.glb
-- │   ├── wavy.glb
-- │   ├── ponytail.glb
-- │   ├── bun.glb
-- │   ├── afro.glb
-- │   ├── buzz.glb
-- │   ├── bald.glb
-- │   └── manifest.json
-- ├── eyes/
-- │   ├── almond.glb
-- │   ├── round.glb
-- │   ├── monolid.glb
-- │   ├── hooded.glb
-- │   └── manifest.json
-- ├── eyebrows/
-- │   ├── natural.glb
-- │   ├── arched.glb
-- │   ├── thick.glb
-- │   ├── thin.glb
-- │   └── manifest.json
-- ├── noses/
-- │   ├── straight.glb
-- │   ├── roman.glb
-- │   ├── button.glb
-- │   ├── wide.glb
-- │   └── manifest.json
-- ├── mouths/
-- │   ├── neutral.glb
-- │   ├── smile.glb
-- │   ├── slight.glb
-- │   ├── serious.glb
-- │   └── manifest.json
-- ├── facial-hair/
-- │   ├── none.glb
-- │   ├── stubble.glb
-- │   ├── goatee.glb
-- │   ├── beard.glb
-- │   └── manifest.json
-- ├── clothing/
-- │   ├── tops/
-- │   │   ├── tshirt.glb
-- │   │   ├── polo.glb
-- │   │   ├── buttonUp.glb
-- │   │   ├── hoodie.glb
-- │   │   ├── jacket.glb
-- │   │   └── manifest.json
-- │   └── bottoms/
-- │       ├── jeans.glb
-- │       ├── shorts.glb
-- │       ├── skirt.glb
-- │       ├── pants.glb
-- │       └── manifest.json
-- └── accessories/
--     ├── glasses-round.glb
--     ├── glasses-square.glb
--     ├── glasses-aviator.glb
--     ├── cap.glb
--     ├── beanie.glb
--     ├── fedora.glb
--     └── manifest.json
--
-- ============================================================================
