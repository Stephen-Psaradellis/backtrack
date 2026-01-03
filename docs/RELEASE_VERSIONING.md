# Release Versioning Strategy

This document outlines the versioning strategy and release process for Backtrack.

## Versioning Scheme

Backtrack follows [Semantic Versioning 2.0.0](https://semver.org/):

```
MAJOR.MINOR.PATCH
```

### Version Components

| Component | When to Increment | Examples |
|-----------|-------------------|----------|
| **MAJOR** | Breaking changes, major rewrites | 1.0.0 -> 2.0.0 |
| **MINOR** | New features (backward compatible) | 1.0.0 -> 1.1.0 |
| **PATCH** | Bug fixes, minor improvements | 1.0.0 -> 1.0.1 |

### Build Numbers

In addition to the semantic version, each build has a unique build number:

- **iOS**: CFBundleVersion (auto-incremented by EAS)
- **Android**: versionCode (auto-incremented by EAS)

## Version Locations

Version is defined in `app.json`:

```json
{
  "expo": {
    "version": "1.0.0"
  }
}
```

Build numbers are managed automatically by EAS when using `autoIncrement: true`.

## Release Types

### Production Releases

Full releases to App Store and Google Play.

**Naming**: `v1.0.0`
**Branch**: `main`
**Frequency**: Every 2-4 weeks

### Hotfix Releases

Critical bug fixes that can't wait for the next regular release.

**Naming**: `v1.0.1`
**Branch**: `hotfix/description` -> `main`
**Frequency**: As needed

### Beta Releases

Pre-release versions for testing.

**Naming**: `v1.1.0-beta.1`
**Track**: TestFlight (iOS), Internal Testing (Android)
**Frequency**: Weekly during active development

## Release Process

### 1. Prepare Release

```bash
# Create release branch
git checkout -b release/v1.1.0

# Update version in app.json
# "version": "1.1.0"

# Update CHANGELOG.md
# Add release notes

# Commit changes
git add .
git commit -m "chore: prepare release v1.1.0"
```

### 2. Build and Test

```bash
# Run all tests
npm run test:run

# Type check
npm run typecheck

# Lint
npm run lint

# Build preview for testing
eas build --platform all --profile preview
```

### 3. Merge and Tag

```bash
# Merge to main
git checkout main
git merge release/v1.1.0

# Create tag
git tag -a v1.1.0 -m "Release v1.1.0"
git push origin main --tags
```

### 4. Build and Submit

```bash
# Production build
eas build --platform all --profile production

# Submit to stores
eas submit --platform all
```

### 5. Post-Release

- Monitor crash reports
- Check user feedback
- Prepare hotfix if critical issues found

## Changelog

Maintain a `CHANGELOG.md` file with the following format:

```markdown
# Changelog

## [1.1.0] - 2025-01-15

### Added
- New feature X
- New feature Y

### Changed
- Improved performance of Z

### Fixed
- Bug fix A (#123)
- Bug fix B (#124)

### Security
- Updated dependencies

## [1.0.1] - 2025-01-08

### Fixed
- Critical bug fix (#120)
```

## Branch Strategy

### Main Branches

- `main` - Production-ready code
- `develop` - Integration branch for features

### Supporting Branches

- `feature/description` - New features
- `bugfix/description` - Bug fixes
- `hotfix/description` - Critical production fixes
- `release/vX.X.X` - Release preparation

### Branch Flow

```
feature/new-feature
         |
         v
     develop
         |
         v
  release/v1.1.0
         |
         v
       main
         |
         v
      v1.1.0 (tag)
```

## Hotfix Process

For critical production issues:

```bash
# Create hotfix branch from main
git checkout main
git checkout -b hotfix/critical-fix

# Make fix and commit
git add .
git commit -m "fix: critical issue description"

# Update version (patch)
# "version": "1.0.1"
git commit -am "chore: bump version to 1.0.1"

# Merge to main and develop
git checkout main
git merge hotfix/critical-fix

git checkout develop
git merge hotfix/critical-fix

# Tag and push
git checkout main
git tag -a v1.0.1 -m "Hotfix: critical issue"
git push origin main develop --tags

# Build and submit with expedited review
eas build --platform all --profile production
```

## App Store Considerations

### iOS (App Store Connect)

- Can request expedited review for critical fixes
- Review typically takes 1-3 days
- Phased release available (gradual rollout)

### Android (Google Play Console)

- Review typically takes hours to 1 day
- Staged rollout available (5%, 10%, 50%, 100%)
- Can halt rollout if issues found

## Version History Tracking

### Git Tags

```bash
# List all versions
git tag -l "v*"

# Show version details
git show v1.0.0
```

### App Store Versions

Track in a spreadsheet or database:

| Version | iOS Build | Android Build | Release Date | Notes |
|---------|-----------|---------------|--------------|-------|
| 1.0.0 | 1 | 1 | 2025-01-01 | Initial release |
| 1.0.1 | 2 | 2 | 2025-01-08 | Hotfix |
| 1.1.0 | 3 | 3 | 2025-01-15 | Feature release |

## Deprecation Policy

When removing features or changing APIs:

1. **Minor Version**: Mark as deprecated
2. **Next Minor Version**: Show deprecation warning
3. **Next Major Version**: Remove feature

Example timeline:
- v1.5.0: Feature X deprecated (still works)
- v1.6.0: Deprecation warning shown
- v2.0.0: Feature X removed

## Communication

### Release Notes

Write user-friendly release notes for app stores:

**Good:**
```
What's New in v1.1.0:

- Find matches faster with improved search
- Share photos in conversations
- Bug fixes and performance improvements
```

**Avoid:**
```
- Fixed null pointer exception in ChatListScreen
- Refactored database queries
- Updated dependencies
```

### Internal Communication

Before release:
- Notify support team of new features
- Prepare FAQ for common questions
- Update documentation

After release:
- Share release notes internally
- Monitor feedback channels
- Prepare for potential hotfixes

## Automation

### GitHub Actions

Automate version tagging and releases:

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Create GitHub Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref }}
          release_name: Release ${{ github.ref }}
          body_path: CHANGELOG.md
          draft: false
          prerelease: false
```

### Version Bump Script

```bash
#!/bin/bash
# scripts/bump-version.sh

VERSION=$1
if [ -z "$VERSION" ]; then
  echo "Usage: ./bump-version.sh <version>"
  exit 1
fi

# Update app.json
sed -i "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" app.json

# Commit
git add app.json
git commit -m "chore: bump version to $VERSION"

echo "Version bumped to $VERSION"
```

## Rollback Procedure

If a release has critical issues:

### iOS

1. Go to App Store Connect
2. Select the app
3. Navigate to App Store > Pricing and Availability
4. Remove from sale (if critical)
5. Submit previous version for re-review

### Android

1. Go to Google Play Console
2. Select the app
3. Release > Production
4. Halt rollout
5. Create new release with previous APK

### Database

If database migrations need rollback:

1. Identify problematic migration
2. Create rollback migration
3. Apply to production
4. Deploy previous app version
