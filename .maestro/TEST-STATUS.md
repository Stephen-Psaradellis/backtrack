# Maestro E2E Test Status

## Test Files Created

### Post Creation Flow (3-Moment)
- `.maestro/flows/posts/create-post-3-moments.yaml` - Full flow test
- `.maestro/flows/posts/scene-step.yaml` - Scene step (Moment 1) isolation test
- `.maestro/flows/posts/moment-step.yaml` - Moment step (Moment 2) isolation test
- `.maestro/flows/posts/seal-step.yaml` - Seal step (Moment 3) isolation test

### Config Updates
- Updated `config.yaml` with new test tags under `posts:` section

## Known Limitations

### Favorites Section Interaction
The tests have a known limitation with the HomeScreen favorites section expand/collapse interaction:

1. **Issue**: Maestro's `tapOn` with testID `home-favorites-header` doesn't reliably expand the favorites section
2. **Manual testing works**: MCP mobile tools (coordinate-based tap) successfully expands the section
3. **Root cause**: Likely related to how Maestro interacts with React Native's collapsible sections

### Current Test Flow Requirement
The post creation tests require:
1. User logged in
2. At least one favorite location
3. Favorites section expanded
4. Favorite card tapped to show "Post Here" button

## TestIDs Verified

These testIDs are correctly implemented in the components:

### SceneStep.tsx
- `create-post-day-{today|yesterday|this-week|earlier}`
- `create-post-period-{morning|afternoon|evening}`
- `create-post-add-time`
- `create-post-skip-time`
- `create-post-scene-next`
- `create-post-scene-back`

### MomentStep.tsx
- `create-post-avatar-preview`
- `create-post-customize-avatar`
- `create-post-note-input`
- `create-post-moment-next`
- `create-post-moment-back`

### SealStep.tsx
- `create-post-edit-scene`
- `create-post-edit-moment`
- `create-post-submit`
- `create-post-seal-back`

### HomeScreen.tsx
- `home-screen`
- `home-map-container`
- `home-favorites-section`
- `home-favorites-header`

## Running Tests

```bash
# Run all post tests
maestro test .maestro/flows/posts/

# Run individual test
maestro test .maestro/flows/posts/scene-step.yaml
```
