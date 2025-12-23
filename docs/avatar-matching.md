# Avatar Matching Algorithm

## Overview

The Avatar Matching Algorithm is a weighted scoring system that calculates similarity between two avatar configurations. It enables features like finding similar users, detecting duplicate avatars, and recommending avatar customizations based on preferences.

### Purpose

The matching algorithm serves several key use cases:

- **User Discovery**: Find users with similar avatar appearances for community features
- **Duplicate Detection**: Identify near-identical avatars for moderation purposes
- **Recommendation Systems**: Suggest avatar customizations based on user preferences
- **Analytics**: Analyze avatar trends and patterns across user populations

### Key Features

- **Weighted Scoring**: Configurable weights prioritize different avatar attributes
- **Semantic Similarity**: Groups similar attributes (e.g., all long hair styles) for meaningful comparisons
- **Quality Tiers**: Classifies matches into excellent, good, fair, and poor categories
- **Conditional Attributes**: Handles context-dependent attributes like facial hair color
- **Full Customization**: Weights and thresholds can be tuned for different use cases

---

## Architecture

### Component Diagram

```
                            ┌──────────────────────────────────────────────────┐
                            │            Avatar Matching System                │
                            └──────────────────────────────────────────────────┘
                                                  │
                 ┌────────────────────────────────┼────────────────────────────────┐
                 │                                │                                │
                 ▼                                ▼                                ▼
    ┌────────────────────────┐    ┌────────────────────────┐    ┌────────────────────────┐
    │    Input Processing    │    │    Scoring Engine      │    │   Output Generation    │
    │                        │    │                        │    │                        │
    │  • AvatarConfig A      │    │  • Weight Application  │    │  • MatchResult         │
    │  • AvatarConfig B      │    │  • Score Normalization │    │  • Quality Tier        │
    │  • MatchConfig         │    │  • Threshold Eval      │    │  • Breakdown           │
    └────────────────────────┘    └────────────────────────┘    └────────────────────────┘
                 │                                │
                 │                                │
                 │        ┌───────────────────────┴───────────────────────┐
                 │        │                                               │
                 ▼        ▼                                               ▼
    ┌─────────────────────────────────────────┐           ┌─────────────────────────────┐
    │     Similarity Calculators              │           │     Configuration Layer     │
    │                                         │           │                             │
    │  ┌─────────────┐  ┌─────────────┐       │           │  • MatchWeights             │
    │  │   Primary   │  │  Secondary  │       │           │  • MatchThresholds          │
    │  │ Attributes  │  │ Attributes  │       │           │  • Preset Configs           │
    │  │             │  │             │       │           │    - STRICT                 │
    │  │ • skinColor │  │ • eyeType   │       │           │    - RELAXED                │
    │  │ • hairColor │  │ • mouthType │       │           │    - APPEARANCE_FOCUSED     │
    │  │ • topType   │  │ • eyebrowT. │       │           │    - STYLE_FOCUSED          │
    │  │ • facialH.  │  │ • clotheT.  │       │           │                             │
    │  │ • facialHC. │  │ • clotheC.  │       │           └─────────────────────────────┘
    │  │             │  │ • accessor. │       │
    │  └─────────────┘  │ • graphicT. │       │
    │                   └─────────────┘       │
    └─────────────────────────────────────────┘
```

### Module Descriptions

#### 1. Input Processing

Handles the initial processing of avatar configurations and matching parameters:

- **AvatarConfig**: The avatar attributes to compare (skin color, hair color, clothing, etc.)
- **MatchConfig**: Optional configuration for weights and thresholds
- **Default Handling**: Fills in missing attributes with default values

#### 2. Similarity Calculators

Specialized functions that calculate similarity scores (0.0 to 1.0) for each attribute:

| Calculator | Attribute | Strategy |
|------------|-----------|----------|
| `calculateSkinColorSimilarity` | Skin color | Tone family grouping (light/medium/dark) |
| `calculateHairColorSimilarity` | Hair color | Color family grouping (dark/brown/blonde/vibrant/gray) |
| `calculateTopTypeSimilarity` | Hair style | Category matching (long/short/no hair/covering) |
| `calculateFacialHairSimilarity` | Facial hair | Presence + category matching |
| `calculateFacialHairColorSimilarity` | Facial hair color | Color proximity (conditional) |
| `calculateEyeTypeSimilarity` | Eye expression | Expression category matching |
| `calculateMouthTypeSimilarity` | Mouth expression | Expression category matching |
| `calculateEyebrowTypeSimilarity` | Eyebrow expression | Expression category matching |
| `calculateClotheTypeSimilarity` | Clothing type | Formality-based matching |
| `calculateClotheColorSimilarity` | Clothing color | Color family proximity |
| `calculateAccessoriesSimilarity` | Accessories | Presence + category matching |
| `calculateGraphicTypeSimilarity` | Shirt graphic | Exact match (conditional) |

#### 3. Scoring Engine

The core matching logic that combines individual similarity scores:

- **Weight Application**: Multiplies each similarity score by its configured weight
- **Conditional Handling**: Excludes non-applicable attributes from calculation
- **Score Normalization**: Adjusts for excluded weights to maintain accuracy
- **Scale Conversion**: Converts 0.0-1.0 range to 0-100 for readability

#### 4. Configuration Layer

Provides customization options for matching behavior:

- **MatchWeights**: Configurable weight for each attribute (should sum to 1.0)
- **MatchThresholds**: Configurable thresholds for quality tier classification
- **Preset Configs**: Pre-built configurations for common use cases

#### 5. Output Generation

Produces the final match result with comprehensive details:

- **score**: Overall match percentage (0-100)
- **quality**: Match tier classification (excellent/good/fair/poor)
- **breakdown**: Per-attribute similarity scores and contributions
- **isMatch**: Boolean indicating if minimum threshold was met

---

## Data Flow

### Matching Process Flowchart

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                    START                                            │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                             INPUT: Avatar A + Avatar B                              │
│                              Optional: MatchConfig                                  │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           MERGE WITH DEFAULTS                                       │
│  • Fill missing avatar attributes with DEFAULT_AVATAR_CONFIG                        │
│  • Use DEFAULT_MATCH_CONFIG if no config provided                                   │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                     CALCULATE PRIMARY ATTRIBUTE SIMILARITIES                        │
│                                                                                     │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│   │  skinColor   │  │  hairColor   │  │   topType    │  │ facialHair   │            │
│   │  (25% wt)    │  │  (15% wt)    │  │  (12% wt)    │  │   (5% wt)    │            │
│   │              │  │              │  │              │  │              │            │
│   │  Group-based │  │ Color family │  │  Category    │  │  Presence +  │            │
│   │  proximity   │  │  proximity   │  │   match      │  │   category   │            │
│   └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘            │
│                                                                                     │
│   ┌──────────────────────────────────────────────────────────────────────────┐      │
│   │  facialHairColor (3% wt) - CONDITIONAL                                   │      │
│   │  Only calculated when BOTH avatars have facial hair (not 'Blank')        │      │
│   └──────────────────────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                    CALCULATE SECONDARY ATTRIBUTE SIMILARITIES                       │
│                                                                                     │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│   │   eyeType    │  │  mouthType   │  │ eyebrowType  │  │  clotheType  │            │
│   │   (8% wt)    │  │  (7% wt)     │  │   (5% wt)    │  │   (8% wt)    │            │
│   │              │  │              │  │              │  │              │            │
│   │  Expression  │  │  Expression  │  │  Expression  │  │  Formality   │            │
│   │   category   │  │   category   │  │   category   │  │    match     │            │
│   └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘            │
│                                                                                     │
│   ┌──────────────┐  ┌──────────────┐                                                │
│   │ clotheColor  │  │ accessories  │                                                │
│   │   (5% wt)    │  │   (5% wt)    │                                                │
│   │              │  │              │                                                │
│   │ Color family │  │  Presence +  │                                                │
│   │  proximity   │  │   category   │                                                │
│   └──────────────┘  └──────────────┘                                                │
│                                                                                     │
│   ┌──────────────────────────────────────────────────────────────────────────┐      │
│   │  graphicType (2% wt) - CONDITIONAL                                       │      │
│   │  Only calculated when BOTH avatars have clotheType === 'GraphicShirt'    │      │
│   └──────────────────────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           APPLY WEIGHTS & NORMALIZE                                 │
│                                                                                     │
│   For each attribute:                                                               │
│     contribution = similarity × weight                                              │
│                                                                                     │
│   totalWeight = sum of all applicable weights                                       │
│   weightedSum = sum of all contributions                                            │
│                                                                                     │
│   normalizedScore = weightedSum / totalWeight                                       │
│   finalScore = round(normalizedScore × 100)                                         │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                        EVALUATE AGAINST THRESHOLDS                                  │
│                                                                                     │
│   score >= 85 (excellent threshold) → quality = 'excellent'                         │
│   score >= 70 (good threshold)      → quality = 'good'                              │
│   score >= 50 (fair threshold)      → quality = 'fair'                              │
│   score < 50                        → quality = 'poor'                              │
│                                                                                     │
│   isMatch = score >= fair threshold                                                 │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              BUILD MATCH RESULT                                     │
│                                                                                     │
│   MatchResult {                                                                     │
│     score: 82,                    // Overall match percentage                       │
│     quality: 'good',              // Quality tier                                   │
│     isMatch: true,                // Meets minimum threshold                        │
│     minThreshold: 50,             // Fair threshold value                           │
│     breakdown: {                  // Per-attribute details                          │
│       skinColor: { similarity: 1.0, weight: 0.25, contribution: 0.25 },             │
│       hairColor: { similarity: 0.8, weight: 0.15, contribution: 0.12 },             │
│       ...                                                                           │
│     }                                                                               │
│   }                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                      END                                            │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Sequence Diagram

```
┌──────────┐     ┌──────────────────┐     ┌────────────────┐     ┌─────────────────┐
│  Caller  │     │calculateAvatar   │     │ Similarity     │     │  Threshold      │
│          │     │MatchScore()      │     │ Calculators    │     │  Evaluator      │
└────┬─────┘     └────────┬─────────┘     └───────┬────────┘     └────────┬────────┘
     │                    │                       │                       │
     │ avatarA, avatarB,  │                       │                       │
     │ config (optional)  │                       │                       │
     │───────────────────>│                       │                       │
     │                    │                       │                       │
     │                    │ Fill defaults         │                       │
     │                    │──────────────────────>│                       │
     │                    │                       │                       │
     │                    │ Calculate similarity  │                       │
     │                    │ for each attribute    │                       │
     │                    │──────────────────────>│                       │
     │                    │                       │                       │
     │                    │      similarity       │                       │
     │                    │<──────────────────────│                       │
     │                    │                       │                       │
     │                    │ Apply weights         │                       │
     │                    │ & normalize           │                       │
     │                    │──────────────>        │                       │
     │                    │                       │                       │
     │                    │ Evaluate score        │                       │
     │                    │ against thresholds    │                       │
     │                    │──────────────────────────────────────────────>│
     │                    │                       │                       │
     │                    │                       │   quality tier        │
     │                    │<──────────────────────────────────────────────│
     │                    │                       │                       │
     │   MatchResult      │                       │                       │
     │<───────────────────│                       │                       │
     │                    │                       │                       │
```

---

## Core Concepts

### Primary vs Secondary Attributes

The algorithm distinguishes between two categories of avatar attributes:

#### Primary Attributes (60% default weight)

Physical characteristics that define core appearance:

| Attribute | Default Weight | Description |
|-----------|----------------|-------------|
| `skinColor` | 25% | Skin tone (Pale, Light, Tanned, Yellow, Brown, DarkBrown, Black) |
| `hairColor` | 15% | Hair color (11 options including natural and vibrant colors) |
| `topType` | 12% | Hair style or head covering (37 options) |
| `facialHairType` | 5% | Facial hair presence and style (6 options) |
| `facialHairColor` | 3% | Facial hair color (conditional - only when present) |

#### Secondary Attributes (40% default weight)

Style preferences and expressions:

| Attribute | Default Weight | Description |
|-----------|----------------|-------------|
| `eyeType` | 8% | Eye expression (12 options) |
| `mouthType` | 7% | Mouth expression (12 options) |
| `eyebrowType` | 5% | Eyebrow expression (12 options) |
| `clotheType` | 8% | Clothing style (9 options) |
| `clotheColor` | 5% | Clothing color (15 options) |
| `accessoriesType` | 5% | Glasses/accessories (7 options) |
| `graphicType` | 2% | Shirt graphic (conditional - only for GraphicShirt) |

### Similarity Scoring

Each attribute uses a specialized similarity function that returns a score from 0.0 to 1.0:

| Score | Meaning |
|-------|---------|
| 1.0 | Perfect match (identical values) |
| 0.7-0.8 | Same category/group (e.g., both long hair styles) |
| 0.3-0.5 | Related but different (e.g., long hair vs short hair) |
| 0.0-0.2 | Significantly different (e.g., hair vs no hair) |

### Quality Tiers

Match scores are classified into quality tiers:

| Tier | Default Threshold | Description |
|------|-------------------|-------------|
| Excellent | >= 85 | Near-identical avatars with only minor differences |
| Good | >= 70 | Similar appearance with the same general look |
| Fair | >= 50 | Some similarities but with notable differences |
| Poor | < 50 | Significantly different avatars |

### Conditional Weights

Some attributes are only included in the calculation when applicable:

- **`facialHairColor`**: Only calculated when **both** avatars have facial hair (not 'Blank')
- **`graphicType`**: Only calculated when **both** avatars wear a GraphicShirt

When a conditional attribute is excluded, its weight is redistributed proportionally among the other attributes through normalization.

---

## Quick Start

### Basic Usage

```typescript
import { calculateAvatarMatchScore } from '@/lib/matching'

const avatarA = {
  skinColor: 'Light',
  hairColor: 'Brown',
  topType: 'ShortHairShortFlat',
  eyeType: 'Default',
  mouthType: 'Smile',
  // ... other attributes
}

const avatarB = {
  skinColor: 'Light',
  hairColor: 'BrownDark',
  topType: 'ShortHairShortCurly',
  eyeType: 'Happy',
  mouthType: 'Smile',
  // ... other attributes
}

const result = calculateAvatarMatchScore(avatarA, avatarB)

console.log(`Match Score: ${result.score}%`)      // e.g., "Match Score: 82%"
console.log(`Quality: ${result.quality}`)          // e.g., "Quality: good"
console.log(`Is Match: ${result.isMatch}`)         // e.g., "Is Match: true"
```

### Using Preset Configurations

```typescript
import {
  calculateAvatarMatchScore,
  STRICT_MATCH_CONFIG,
  RELAXED_MATCH_CONFIG,
  APPEARANCE_FOCUSED_CONFIG,
  STYLE_FOCUSED_CONFIG,
} from '@/lib/matching'

// Strict matching for near-exact duplicates
const strictResult = calculateAvatarMatchScore(avatarA, avatarB, STRICT_MATCH_CONFIG)

// Relaxed matching for loose similarity
const relaxedResult = calculateAvatarMatchScore(avatarA, avatarB, RELAXED_MATCH_CONFIG)

// Focus on physical appearance, ignore clothing
const appearanceResult = calculateAvatarMatchScore(avatarA, avatarB, APPEARANCE_FOCUSED_CONFIG)

// Focus on style/fashion choices
const styleResult = calculateAvatarMatchScore(avatarA, avatarB, STYLE_FOCUSED_CONFIG)
```

---

## Weighted Scoring System

The weighted scoring system is the heart of the avatar matching algorithm. It combines individual attribute similarity scores into a single match percentage using configurable weights.

### Understanding Weights

**Weights determine how much each avatar attribute contributes to the final match score.**

Think of weights as "importance multipliers" for each attribute. An attribute with a 25% weight contributes up to 25 points to the final score (if it's a perfect match), while an attribute with only 2% weight contributes at most 2 points.

#### Key Weight Properties

| Property | Description |
|----------|-------------|
| **Range** | Each weight is a decimal from 0.0 to 1.0 (representing 0% to 100%) |
| **Sum** | All weights should sum to 1.0 (100%) for proper normalization |
| **Distribution** | Default is 60% primary attributes, 40% secondary attributes |
| **Flexibility** | Weights can be customized for different matching use cases |

### Default Weight Distribution

The algorithm uses a **60/40 split** between primary and secondary attributes by default:

#### Primary Attributes (60% total)

Core physical characteristics that define appearance identity:

| Attribute | Weight | Visual Impact | Description |
|-----------|--------|---------------|-------------|
| `skinColor` | **25%** | ★★★★★ | Skin tone (7 options: Pale → Black). Most immediately visible trait. |
| `hairColor` | **15%** | ★★★★☆ | Hair color (11 options including natural and vibrant colors). |
| `topType` | **12%** | ★★★★☆ | Hair style or head covering (37 options). Defines silhouette. |
| `facialHairType` | **5%** | ★★★☆☆ | Facial hair presence and style (6 options). Notable when present. |
| `facialHairColor` | **3%** | ★★☆☆☆ | Facial hair color (conditional - only counted when both have facial hair). |

#### Secondary Attributes (40% total)

Style choices and expressions that represent personality:

| Attribute | Weight | Visual Impact | Description |
|-----------|--------|---------------|-------------|
| `eyeType` | **8%** | ★★★☆☆ | Eye expression (12 options). Conveys mood and personality. |
| `clotheType` | **8%** | ★★★☆☆ | Clothing style (9 options). Major style indicator. |
| `mouthType` | **7%** | ★★★☆☆ | Mouth expression (12 options). Affects perceived emotion. |
| `clotheColor` | **5%** | ★★☆☆☆ | Clothing color (15 options). Secondary style element. |
| `eyebrowType` | **5%** | ★★☆☆☆ | Eyebrow expression (12 options). Subtle expression element. |
| `accessoriesType` | **5%** | ★★☆☆☆ | Glasses/accessories (7 options). Notable when present. |
| `graphicType` | **2%** | ★☆☆☆☆ | Shirt graphic (conditional - only counted when both wear GraphicShirt). |

### Score Calculation Formula

The final match score is calculated using a weighted average formula:

```
Final Score = (Σ (similarity_i × weight_i) / totalApplicableWeight) × 100
```

#### Step-by-Step Calculation

1. **Calculate Similarity**: For each attribute, compute a similarity score between 0.0 and 1.0
2. **Apply Weight**: Multiply each similarity by its configured weight
3. **Sum Contributions**: Add all weighted contributions together
4. **Normalize**: Divide by the total weight of applicable attributes (handles conditional weights)
5. **Scale**: Multiply by 100 to get a percentage score (0-100)

### Worked Example

Let's walk through a complete matching calculation:

#### Avatar A
```typescript
{
  skinColor: 'Light',
  hairColor: 'Brown',
  topType: 'ShortHairShortFlat',
  facialHairType: 'Blank',        // No facial hair
  eyeType: 'Default',
  mouthType: 'Smile',
  eyebrowType: 'Default',
  clotheType: 'Hoodie',
  clotheColor: 'Blue01',
  accessoriesType: 'Prescription01',
  graphicType: 'Bat',              // Ignored (not wearing GraphicShirt)
}
```

#### Avatar B
```typescript
{
  skinColor: 'Light',              // Same
  hairColor: 'BrownDark',          // Similar (same color family)
  topType: 'ShortHairShortCurly',  // Similar (same category)
  facialHairType: 'Blank',         // Same (no facial hair)
  eyeType: 'Happy',                // Different category
  mouthType: 'Smile',              // Same
  eyebrowType: 'DefaultNatural',   // Same category
  clotheType: 'ShirtCrewNeck',     // Same formality (casual)
  clotheColor: 'Gray01',           // Different color family
  accessoriesType: 'Prescription02', // Same category
  graphicType: 'Skull',            // Ignored (not wearing GraphicShirt)
}
```

#### Step-by-Step Calculation

| Attribute | Similarity | Weight | Contribution | Notes |
|-----------|------------|--------|--------------|-------|
| skinColor | 1.0 | 0.25 | 0.250 | Exact match |
| hairColor | 0.5 | 0.15 | 0.075 | Adjacent color families (brown ↔ dark) |
| topType | 0.7 | 0.12 | 0.084 | Same category (short hair) |
| facialHairType | 1.0 | 0.05 | 0.050 | Both no facial hair |
| facialHairColor | — | — | — | **Not applicable** (neither has facial hair) |
| eyeType | 0.2 | 0.08 | 0.016 | Different categories (neutral vs happy) |
| mouthType | 1.0 | 0.07 | 0.070 | Exact match |
| eyebrowType | 0.6 | 0.05 | 0.030 | Same category (neutral) |
| clotheType | 0.7 | 0.08 | 0.056 | Same formality (both casual) |
| clotheColor | 0.3 | 0.05 | 0.015 | Different color families |
| accessoriesType | 0.8 | 0.05 | 0.040 | Same category (prescription glasses) |
| graphicType | — | — | — | **Not applicable** (neither has GraphicShirt) |

**Calculation:**
```
weightedSum = 0.250 + 0.075 + 0.084 + 0.050 + 0.016 + 0.070 + 0.030 + 0.056 + 0.015 + 0.040
            = 0.686

totalApplicableWeight = 1.00 - 0.03 (facialHairColor) - 0.02 (graphicType)
                      = 0.95

normalizedScore = 0.686 / 0.95 = 0.722

finalScore = round(0.722 × 100) = 72
```

**Result**: Score of **72** → Quality tier: **"good"**

### Interpreting Score Breakdowns

The `MatchResult.breakdown` object provides transparency into how each attribute contributed to the final score. This is invaluable for debugging, tuning, and explaining match results to users.

#### Breakdown Structure

```typescript
interface AttributeBreakdown {
  [attribute: string]: {
    similarity: number    // Raw similarity (0.0 - 1.0)
    weight: number        // Configured weight (0.0 - 1.0)
    contribution: number  // similarity × weight
    applicable?: boolean  // For conditional attributes only
  }
}
```

#### Reading the Breakdown

| Field | Meaning | Example Value |
|-------|---------|---------------|
| `similarity` | How similar the two values are (0 = different, 1 = identical) | `0.7` |
| `weight` | How much this attribute matters to the total score | `0.15` |
| `contribution` | Actual points contributed to the score | `0.105` |
| `applicable` | Whether this conditional attribute was counted | `true`/`false` |

#### Example Breakdown Analysis

```typescript
const result = calculateAvatarMatchScore(avatarA, avatarB)

// Overall result
console.log(`Score: ${result.score}%`)     // "Score: 72%"
console.log(`Quality: ${result.quality}`)   // "Quality: good"

// Analyze what matched well
const breakdown = result.breakdown

// Perfect matches (similarity = 1.0)
if (breakdown.skinColor.similarity === 1.0) {
  console.log('✅ Skin color: Perfect match!')
}

// Partial matches (0.5 - 0.9)
if (breakdown.hairColor.similarity >= 0.5 && breakdown.hairColor.similarity < 1.0) {
  console.log(`⚠️ Hair color: Similar but not exact (${breakdown.hairColor.similarity})`)
}

// Poor matches (< 0.5)
if (breakdown.eyeType.similarity < 0.5) {
  console.log(`❌ Eye type: Significantly different (${breakdown.eyeType.similarity})`)
}

// Check conditional attributes
if (!breakdown.facialHairColor.applicable) {
  console.log('ℹ️ Facial hair color: Not applicable (one or both have no facial hair)')
}
```

### Understanding Attribute Categories

Each attribute type uses a specialized similarity calculation strategy. Understanding these categories helps you predict and interpret match scores.

#### Exact Match Attributes

Some attributes use simple equality comparison:

```
similarity = (valueA === valueB) ? 1.0 : 0.0
```

**Example**: `graphicType` - Either the graphics match exactly (1.0) or they don't (0.0).

#### Group-Based Similarity

Most attributes use grouped matching where similar values belong to the same category:

```
Exact match:      1.0   (identical values)
Same group:       0.6-0.8 (values in same category)
Different group:  0.0-0.3 (values in different categories)
```

**Example attribute groups:**

| Attribute | Groups | Example |
|-----------|--------|---------|
| `skinColor` | light, medium, dark | "Pale" and "Light" both in 'light' group |
| `hairColor` | dark, brown, blonde, vibrant, gray | "Brown" and "Auburn" both in 'brown' group |
| `topType` | noHair, longHair, shortHair, headCovering, accessory | All "ShortHair*" styles in same group |
| `facialHairType` | none, beard, moustache | "BeardLight" and "BeardMedium" both 'beard' |
| `eyeType` | neutral, happy, unusual | "Wink" and "Hearts" both 'happy' |
| `mouthType` | neutral, happy, unusual | "Smile" and "Twinkle" both 'happy' |
| `eyebrowType` | neutral, expressive | "Default" types all in 'neutral' |
| `clotheType` | formal, casual | "Hoodie" and "ShirtCrewNeck" both 'casual' |
| `clotheColor` | blues, neutrals, pastels, vibrant | "Blue01/02/03" all in 'blues' group |
| `accessoriesType` | none, prescription, sunglasses | All "Prescription*" in same group |

#### Adjacency-Based Similarity

Some attributes consider "adjacency" between groups for intermediate scores:

**Skin Color Example:**
```
Light ↔ Pale:        0.7 (same 'light' group)
Light ↔ Tanned:      0.3 (adjacent: light ↔ medium)
Light ↔ Black:       0.0 (opposite: light ↔ dark)
```

**Hair Color Example:**
```
Brown ↔ Auburn:      0.8 (same 'brown' group)
Brown ↔ Black:       0.5 (adjacent: brown ↔ dark)
Brown ↔ Blonde:      0.5 (adjacent: brown ↔ blonde)
Brown ↔ Blue:        0.0 (natural vs vibrant)
```

### Conditional Weights

Two attributes are **conditional** - they're only counted when applicable to both avatars:

#### Facial Hair Color (`facialHairColor`)

| Avatar A | Avatar B | Applicable? | Reason |
|----------|----------|-------------|--------|
| BeardMedium | BeardLight | ✅ Yes | Both have facial hair |
| BeardMedium | Blank | ❌ No | B has no facial hair |
| Blank | Blank | ❌ No | Neither has facial hair |

When not applicable:
- The 3% weight is **excluded** from the calculation
- Total weight becomes 97% instead of 100%
- Score is normalized accordingly (divided by 0.97)

#### Graphic Type (`graphicType`)

| Avatar A Clothing | Avatar B Clothing | Applicable? | Reason |
|-------------------|-------------------|-------------|--------|
| GraphicShirt | GraphicShirt | ✅ Yes | Both wearing graphic shirts |
| GraphicShirt | Hoodie | ❌ No | B not wearing graphic shirt |
| Hoodie | ShirtCrewNeck | ❌ No | Neither wearing graphic shirt |

When not applicable:
- The 2% weight is **excluded** from the calculation
- Total weight becomes 98% instead of 100%
- Score is normalized accordingly

**Important**: When **both** conditional attributes are excluded, the total applicable weight becomes 95% (1.00 - 0.03 - 0.02), and all contributions are divided by 0.95 to maintain the 0-100 scale.

### Impact of Weight Distribution

Different weight distributions dramatically affect matching behavior. Here's how the same avatar pair scores with different presets:

#### Example Comparison

| Configuration | Primary/Secondary | skinColor Weight | Score Impact |
|---------------|-------------------|------------------|--------------|
| **Default** | 60% / 40% | 25% | Balanced matching |
| **Appearance-Focused** | 80% / 20% | 35% | Physical traits dominate |
| **Style-Focused** | 40% / 60% | 15% | Clothing/expression dominate |

**Scenario**: Avatar A and B have identical skin/hair but completely different clothing.

| Configuration | Likely Score | Why |
|---------------|--------------|-----|
| Default | ~65-75 | 60% from matching skin/hair, penalized for clothing |
| Appearance-Focused | ~80-90 | 80% from matching skin/hair, clothing barely matters |
| Style-Focused | ~40-50 | Only 40% from skin/hair, heavily penalized for clothing |

### Best Practices for Weight Tuning

1. **Keep weights balanced**: Extreme weights (e.g., 90% on one attribute) create brittle matching
2. **Consider your use case**:
   - Identity matching → boost primary attributes
   - Style matching → boost secondary attributes
   - General similarity → use defaults
3. **Test with real data**: Run your weight configuration against representative avatar pairs
4. **Use presets as starting points**: `APPEARANCE_FOCUSED_CONFIG`, `STYLE_FOCUSED_CONFIG`, etc.
5. **Document custom configurations**: Explain why you chose specific weight distributions

---

## Threshold Customization Guide

Thresholds control how match scores are classified into quality tiers. By customizing thresholds, you can make matching more strict or more lenient depending on your use case.

### Understanding the Tier System

The matching algorithm classifies every match score (0-100) into one of four quality tiers:

| Tier | Default Range | Description | Use When... |
|------|---------------|-------------|-------------|
| **Excellent** | 85 - 100 | Near-identical avatars | You need very high confidence matches |
| **Good** | 70 - 84 | Similar appearance | You want solid matches with minor differences |
| **Fair** | 50 - 69 | Some similarities | You're okay with loose matches |
| **Poor** | 0 - 49 | Significantly different | Avatars don't really match |

The thresholds define the **minimum score** needed to reach each tier:

```typescript
interface MatchThresholds {
  excellent: number  // Minimum score for "excellent" tier
  good: number       // Minimum score for "good" tier
  fair: number       // Minimum score for "fair" tier
  // "poor" is implicit: anything below fair
}
```

### Threshold Configuration Options

#### Using Preset Configurations

The easiest way to customize thresholds is to use one of the built-in presets:

```typescript
import {
  calculateAvatarMatchScore,
  DEFAULT_MATCH_CONFIG,   // Balanced (default)
  STRICT_MATCH_CONFIG,    // Higher thresholds
  RELAXED_MATCH_CONFIG,   // Lower thresholds
} from '@/lib/matching'

// Strict: Only very similar avatars qualify as "good" or "excellent"
const strictResult = calculateAvatarMatchScore(avatarA, avatarB, STRICT_MATCH_CONFIG)

// Relaxed: More avatars qualify for higher tiers
const relaxedResult = calculateAvatarMatchScore(avatarA, avatarB, RELAXED_MATCH_CONFIG)
```

**Preset Threshold Comparison:**

| Threshold | Default | Strict | Relaxed |
|-----------|---------|--------|---------|
| `excellent` | 85 | 95 | 75 |
| `good` | 70 | 85 | 55 |
| `fair` | 50 | 70 | 35 |

#### Creating Custom Thresholds

For fine-grained control, create your own threshold configuration:

```typescript
import { calculateAvatarMatchScore, DEFAULT_MATCH_WEIGHTS } from '@/lib/matching'
import type { MatchConfig, MatchThresholds } from '@/lib/matching'

// Custom thresholds for your specific use case
const myThresholds: MatchThresholds = {
  excellent: 90,  // Very high bar for excellence
  good: 75,       // Slightly above default
  fair: 60,       // More selective than default
}

const myConfig: MatchConfig = {
  weights: DEFAULT_MATCH_WEIGHTS,  // Keep default weights
  thresholds: myThresholds,
}

const result = calculateAvatarMatchScore(avatarA, avatarB, myConfig)
```

### How Thresholds Affect Results

The same match score produces different quality classifications depending on thresholds:

```
Score: 78

With DEFAULT thresholds (excellent: 85, good: 70, fair: 50):
  → Quality: "good" ✅ (78 >= 70, but 78 < 85)

With STRICT thresholds (excellent: 95, good: 85, fair: 70):
  → Quality: "fair" ⚠️ (78 >= 70, but 78 < 85)

With RELAXED thresholds (excellent: 75, good: 55, fair: 35):
  → Quality: "excellent" ⭐ (78 >= 75)
```

#### Visual Score Range Comparison

```
Score:      0    10    20    30    40    50    60    70    80    90   100
            |-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|

DEFAULT:    [--------POOR--------][--FAIR--][--GOOD--][--EXCELLENT--]
                                  50        70        85            100

STRICT:     [----------POOR----------][----FAIR----][GOOD][EXCELLENT]
                                      70            85    95        100

RELAXED:    [--POOR--][---FAIR---][---GOOD---][-----EXCELLENT-----]
                      35          55          75                   100
```

### Guidelines for Choosing Threshold Values

#### Consider Your Use Case

Different applications need different threshold strategies:

| Use Case | Recommended Preset | Why |
|----------|-------------------|-----|
| **Duplicate Detection** | STRICT | Only near-identical avatars should match |
| **User Suggestions** | RELAXED | Cast a wider net, show more options |
| **Identity Verification** | STRICT | False positives are costly |
| **Community Features** | DEFAULT or RELAXED | More matches = more engagement |
| **QA / Testing** | STRICT | Ensure consistency |
| **Analytics Clustering** | RELAXED | Group loosely similar avatars |

#### Match the User Experience

Think about what each tier means for your users:

**Strict Thresholds** (higher values):
- ✅ Fewer matches, but higher confidence
- ✅ Users trust "excellent" and "good" labels more
- ❌ May return empty results for some queries
- ❌ Users might think nothing matches

**Relaxed Thresholds** (lower values):
- ✅ More matches to choose from
- ✅ Better for discovery and suggestions
- ❌ "Excellent" doesn't feel excellent
- ❌ Users may see irrelevant matches

#### Threshold Selection Matrix

Use this matrix to guide your threshold decisions:

| Factor | Lower Thresholds | Higher Thresholds |
|--------|------------------|-------------------|
| **Result Quantity** | More matches | Fewer matches |
| **Result Quality** | Mixed relevance | High relevance |
| **User Expectations** | Discovery mode | Precision mode |
| **False Positives** | More likely | Less likely |
| **False Negatives** | Less likely | More likely |
| **Empty Results** | Rare | More common |

#### The 80/60/40 Rule

A practical starting point for custom thresholds:

```typescript
// Conservative but effective for most use cases
const balancedThresholds: MatchThresholds = {
  excellent: 80,  // ~80% match for "excellent"
  good: 60,       // ~60% match for "good"
  fair: 40,       // ~40% match for "fair"
}
```

Adjust from there:
- **Need stricter matching?** → Add 10-15 to each threshold
- **Need more results?** → Subtract 10-15 from each threshold

### Threshold Validation

The algorithm expects thresholds to be in descending order:

```typescript
// ✅ VALID: excellent > good > fair
{ excellent: 85, good: 70, fair: 50 }

// ❌ INVALID: good > excellent
{ excellent: 70, good: 85, fair: 50 }

// ❌ INVALID: fair > good
{ excellent: 85, good: 50, fair: 70 }
```

Use the built-in validation function:

```typescript
import { validateThresholdsOrder } from '@/lib/matching'

const myThresholds = { excellent: 85, good: 70, fair: 50 }

if (validateThresholdsOrder(myThresholds)) {
  console.log('✅ Thresholds are valid')
} else {
  console.log('❌ Thresholds are invalid - must be in descending order')
}
```

### Examples: Different Threshold Scenarios

#### Scenario 1: Dating App - Finding Similar Avatars

Goal: Show users avatars that look similar to their own, but don't be too picky.

```typescript
// Relaxed thresholds to show more potential matches
const datingThresholds: MatchThresholds = {
  excellent: 75,  // "Great match!" badge
  good: 55,       // "Similar style"
  fair: 35,       // Still shows in results
}

const config: MatchConfig = {
  weights: DEFAULT_MATCH_WEIGHTS,
  thresholds: datingThresholds,
}

// Find similar avatars
const matches = users
  .map(user => ({
    user,
    result: calculateAvatarMatchScore(myAvatar, user.avatar, config)
  }))
  .filter(m => m.result.isMatch)  // Filters out "poor" matches
  .sort((a, b) => b.result.score - a.result.score)
```

#### Scenario 2: Admin Tool - Detecting Duplicate Accounts

Goal: Find accounts with nearly identical avatars for fraud detection.

```typescript
// Very strict thresholds to minimize false positives
const fraudDetectionThresholds: MatchThresholds = {
  excellent: 98,  // Almost identical
  good: 95,       // Very similar (suspicious)
  fair: 90,       // Worth investigating
}

const config: MatchConfig = {
  weights: DEFAULT_MATCH_WEIGHTS,
  thresholds: fraudDetectionThresholds,
}

// Only flag "good" or better matches for review
const suspiciousMatches = allUsers
  .flatMap(userA => allUsers
    .filter(userB => userA.id < userB.id)  // Avoid duplicates
    .map(userB => ({
      userA,
      userB,
      result: calculateAvatarMatchScore(userA.avatar, userB.avatar, config)
    }))
  )
  .filter(m => m.result.quality === 'excellent' || m.result.quality === 'good')
```

#### Scenario 3: Avatar Gallery - Categorizing Similar Styles

Goal: Group avatars into clusters for browsing, with clear quality distinctions.

```typescript
// Standard thresholds with slightly lower fair threshold for better grouping
const galleryThresholds: MatchThresholds = {
  excellent: 85,
  good: 70,
  fair: 45,  // Lower to include more "related" avatars
}

const config: MatchConfig = {
  weights: STYLE_FOCUSED_WEIGHTS,  // Focus on style, not appearance
  thresholds: galleryThresholds,
}

// Create quality-based sections
function categorizeMatches(baseAvatar, candidateAvatars) {
  const results = candidateAvatars.map(avatar => ({
    avatar,
    result: calculateAvatarMatchScore(baseAvatar, avatar, config)
  }))

  return {
    perfect: results.filter(r => r.result.quality === 'excellent'),
    similar: results.filter(r => r.result.quality === 'good'),
    related: results.filter(r => r.result.quality === 'fair'),
    // Don't show "poor" matches in UI
  }
}
```

#### Scenario 4: A/B Testing Match Quality

Goal: Test whether stricter or more relaxed matching improves user engagement.

```typescript
// Variant A: Standard thresholds
const variantA: MatchConfig = {
  weights: DEFAULT_MATCH_WEIGHTS,
  thresholds: { excellent: 85, good: 70, fair: 50 },
}

// Variant B: Stricter thresholds
const variantB: MatchConfig = {
  weights: DEFAULT_MATCH_WEIGHTS,
  thresholds: { excellent: 90, good: 80, fair: 65 },
}

// Variant C: More relaxed thresholds
const variantC: MatchConfig = {
  weights: DEFAULT_MATCH_WEIGHTS,
  thresholds: { excellent: 80, good: 60, fair: 40 },
}

// Use feature flag to select variant
const config = getABTestVariant('avatar-matching-thresholds', {
  A: variantA,
  B: variantB,
  C: variantC,
})
```

### Working with the isMatch Flag

The `isMatch` flag in `MatchResult` is tied to the `fair` threshold:

```typescript
const result = calculateAvatarMatchScore(avatarA, avatarB, config)

// isMatch is true when: score >= thresholds.fair
console.log(result.isMatch)      // true or false
console.log(result.minThreshold) // The fair threshold value used
```

**Customizing the minimum match threshold:**

The `isMatch` helper function lets you use any minimum:

```typescript
import { isMatch, calculateAvatarMatchScore } from '@/lib/matching'

const result = calculateAvatarMatchScore(avatarA, avatarB)

// Using different minimums for different purposes
const isGoodEnough = isMatch(result.score, 70)  // Custom: must be "good" or better
const isAcceptable = isMatch(result.score, 50)  // Default: "fair" or better
const isAnyMatch = isMatch(result.score, 30)    // Very lenient
```

### Utility Functions for Thresholds

#### Get Score Range for a Tier

```typescript
import { getQualityScoreRange } from '@/lib/matching'

// With default thresholds
const excellentRange = getQualityScoreRange('excellent')
console.log(excellentRange) // { min: 85, max: 100 }

const goodRange = getQualityScoreRange('good')
console.log(goodRange)      // { min: 70, max: 84 }

// With custom thresholds
const strictThresholds = { excellent: 95, good: 85, fair: 70 }
const strictExcellent = getQualityScoreRange('excellent', strictThresholds)
console.log(strictExcellent) // { min: 95, max: 100 }
```

#### Evaluate a Score Directly

```typescript
import { evaluateMatch, DEFAULT_MATCH_THRESHOLDS } from '@/lib/matching'

// Evaluate a raw score without running the full matching algorithm
const quality = evaluateMatch(78)
console.log(quality) // 'good'

// With custom thresholds
const strictQuality = evaluateMatch(78, { excellent: 95, good: 85, fair: 70 })
console.log(strictQuality) // 'fair'
```

### Best Practices

1. **Start with defaults** - Only customize when you have a specific reason
2. **Test with real data** - Run your thresholds against representative avatar pairs
3. **Monitor quality distributions** - Track how many results fall into each tier
4. **Avoid extreme values** - Thresholds below 20 or above 95 often cause problems
5. **Document your choices** - Explain why you chose specific threshold values
6. **Consider edge cases** - What happens when no avatars match? When all match?
7. **Keep consistent** - Use the same thresholds throughout your application

---

## Tuning Guide

This guide provides practical step-by-step instructions for customizing the avatar matching algorithm to fit your specific use case. Whether you need strict matching for duplicate detection or relaxed matching for user suggestions, this guide will help you tune the algorithm effectively.

### Step-by-Step Tuning Workflow

Follow this systematic approach when customizing matching behavior:

#### Step 1: Define Your Matching Goals

Before writing any code, clearly define what you're trying to achieve:

| Question | Example Answers |
|----------|-----------------|
| **What is the purpose?** | Finding duplicates, suggesting similar users, grouping by style |
| **What matters most?** | Physical appearance, fashion sense, overall similarity |
| **False positives or negatives?** | Which is worse for your use case? |
| **Expected result count?** | Many results (discovery) or few results (precision)? |

#### Step 2: Choose a Starting Configuration

Based on your goals, select the most appropriate preset as your starting point:

```typescript
import {
  DEFAULT_MATCH_CONFIG,
  STRICT_MATCH_CONFIG,
  RELAXED_MATCH_CONFIG,
  APPEARANCE_FOCUSED_CONFIG,
  STYLE_FOCUSED_CONFIG,
} from '@/lib/matching'

// Decision matrix:
// - Need precision (few matches, high confidence) → STRICT_MATCH_CONFIG
// - Need discovery (many matches, broader net) → RELAXED_MATCH_CONFIG
// - Focus on physical traits → APPEARANCE_FOCUSED_CONFIG
// - Focus on fashion/style → STYLE_FOCUSED_CONFIG
// - Balanced approach → DEFAULT_MATCH_CONFIG
```

#### Step 3: Test with Representative Data

Run your chosen configuration against real avatar pairs to understand its behavior:

```typescript
import { calculateAvatarMatchScore } from '@/lib/matching'

// Create test pairs that represent your expected data
const testPairs = [
  { a: userAvatarA, b: userAvatarB, expected: 'should match' },
  { a: userAvatarC, b: userAvatarD, expected: 'should not match' },
  // Add more representative pairs
]

// Test each pair
testPairs.forEach(({ a, b, expected }) => {
  const result = calculateAvatarMatchScore(a, b, STRICT_MATCH_CONFIG)
  console.log({
    expected,
    actual: result.quality,
    score: result.score,
    isMatch: result.isMatch,
  })
})
```

#### Step 4: Analyze and Iterate

Use the breakdown to understand which attributes are causing unexpected results:

```typescript
const result = calculateAvatarMatchScore(avatarA, avatarB, config)

// Find attributes with low similarity
const lowScoring = Object.entries(result.breakdown)
  .filter(([_, detail]) => detail.similarity < 0.5)
  .map(([attr, detail]) => ({
    attribute: attr,
    similarity: detail.similarity,
    impact: detail.contribution,
  }))

console.log('Low-scoring attributes:', lowScoring)

// Find attributes with high impact
const highImpact = Object.entries(result.breakdown)
  .sort((a, b) => b[1].contribution - a[1].contribution)
  .slice(0, 3)

console.log('Highest impact attributes:', highImpact)
```

#### Step 5: Fine-Tune Configuration

Based on your analysis, adjust weights or thresholds:

```typescript
import { DEFAULT_MATCH_WEIGHTS, DEFAULT_MATCH_THRESHOLDS } from '@/lib/matching'
import type { MatchConfig } from '@/lib/matching'

// Start with defaults and modify specific values
const myConfig: MatchConfig = {
  weights: {
    ...DEFAULT_MATCH_WEIGHTS,
    // Increase skin color importance
    skinColor: 0.30,  // was 0.25
    // Decrease clothing importance to compensate
    clotheType: 0.05, // was 0.08
    clotheColor: 0.02, // was 0.05
  },
  thresholds: {
    ...DEFAULT_MATCH_THRESHOLDS,
    // Raise the bar for "good" matches
    good: 75,  // was 70
  },
}
```

#### Step 6: Validate Changes

Re-run your test pairs to verify the changes produce desired results:

```typescript
// Compare before and after
testPairs.forEach(({ a, b, expected }) => {
  const before = calculateAvatarMatchScore(a, b, DEFAULT_MATCH_CONFIG)
  const after = calculateAvatarMatchScore(a, b, myConfig)

  console.log({
    expected,
    before: { score: before.score, quality: before.quality },
    after: { score: after.score, quality: after.quality },
    improved: /* check if result is closer to expected */
  })
})
```

---

### Common Customization Patterns

#### Pattern 1: Adjusting a Single Attribute Weight

When one attribute is over- or under-contributing to match scores:

```typescript
import { DEFAULT_MATCH_WEIGHTS } from '@/lib/matching'
import type { MatchWeights, MatchConfig } from '@/lib/matching'

// Increase one weight, decrease another to keep sum at 1.0
const tweakedWeights: MatchWeights = {
  ...DEFAULT_MATCH_WEIGHTS,
  skinColor: 0.30,       // +0.05 (from 0.25)
  clotheColor: 0.00,     // -0.05 (from 0.05) - effectively ignored
}

const config: MatchConfig = {
  weights: tweakedWeights,
  thresholds: DEFAULT_MATCH_THRESHOLDS,
}
```

#### Pattern 2: Ignoring Specific Attributes

Set an attribute's weight to 0 to exclude it from matching entirely:

```typescript
// Ignore all expression-related attributes
const noExpressionsWeights: MatchWeights = {
  ...DEFAULT_MATCH_WEIGHTS,

  // Set expression weights to 0
  eyeType: 0,      // was 0.08
  mouthType: 0,    // was 0.07
  eyebrowType: 0,  // was 0.05

  // Redistribute 20% to other attributes
  skinColor: 0.35,    // +0.10
  hairColor: 0.20,    // +0.05
  topType: 0.17,      // +0.05
}
```

#### Pattern 3: Creating Feature-Specific Matching

Sometimes you need different configurations for different features:

```typescript
// User profile matching - focus on appearance
const profileMatchConfig: MatchConfig = {
  weights: APPEARANCE_FOCUSED_WEIGHTS,
  thresholds: { excellent: 90, good: 75, fair: 60 },
}

// Style gallery browsing - focus on fashion
const galleryMatchConfig: MatchConfig = {
  weights: STYLE_FOCUSED_WEIGHTS,
  thresholds: { excellent: 80, good: 60, fair: 40 },
}

// Duplicate detection - very strict
const duplicateDetectionConfig: MatchConfig = {
  weights: DEFAULT_MATCH_WEIGHTS,
  thresholds: { excellent: 98, good: 95, fair: 90 },
}

// Use the appropriate config based on context
function findMatches(avatar: AvatarConfig, context: 'profile' | 'gallery' | 'duplicates') {
  const configs = {
    profile: profileMatchConfig,
    gallery: galleryMatchConfig,
    duplicates: duplicateDetectionConfig,
  }
  return calculateAvatarMatchScore(avatar, otherAvatar, configs[context])
}
```

#### Pattern 4: Dynamic Threshold Adjustment

Adjust thresholds based on the number of available matches:

```typescript
function findMatchesWithDynamicThresholds(
  targetAvatar: AvatarConfig,
  candidates: AvatarConfig[],
  targetCount: number = 10
): MatchResult[] {
  // Start with default thresholds
  let thresholds = { ...DEFAULT_MATCH_THRESHOLDS }

  // Calculate all scores
  let results = candidates.map(candidate => ({
    candidate,
    result: calculateAvatarMatchScore(targetAvatar, candidate, {
      weights: DEFAULT_MATCH_WEIGHTS,
      thresholds
    })
  }))

  // Filter to matches
  let matches = results.filter(r => r.result.isMatch)

  // If too few matches, relax thresholds
  if (matches.length < targetCount) {
    const relaxedConfig: MatchConfig = {
      weights: DEFAULT_MATCH_WEIGHTS,
      thresholds: { excellent: 70, good: 50, fair: 30 }
    }
    results = candidates.map(candidate => ({
      candidate,
      result: calculateAvatarMatchScore(targetAvatar, candidate, relaxedConfig)
    }))
    matches = results.filter(r => r.result.isMatch)
  }

  return matches
    .sort((a, b) => b.result.score - a.result.score)
    .slice(0, targetCount)
    .map(m => m.result)
}
```

---

### Example: Strict Appearance Matching

**Use Case**: Finding users who look very similar to a target user, ignoring fashion choices. Perfect for "look-alike" features or identity-based matching.

```typescript
import {
  calculateAvatarMatchScore,
  DEFAULT_MATCH_THRESHOLDS,
} from '@/lib/matching'
import type { MatchConfig, MatchWeights, AvatarConfig } from '@/lib/matching'

/**
 * Strict Appearance Matching Configuration
 *
 * Characteristics:
 * - 90% weight on physical attributes (skin, hair, facial features)
 * - Only 10% weight on style elements
 * - Higher thresholds for quality tiers
 * - Effectively ignores clothing choices
 */
const STRICT_APPEARANCE_WEIGHTS: MatchWeights = {
  // Physical attributes boosted to ~90%
  skinColor: 0.40,        // Major boost - most important physical trait
  hairColor: 0.22,        // Significant boost
  topType: 0.18,          // Hair style is important for appearance
  facialHairType: 0.07,   // Notable when present
  facialHairColor: 0.03,  // Minor but contributes to look

  // Style attributes minimized to ~10%
  eyeType: 0.02,          // Minimal impact
  mouthType: 0.02,        // Minimal impact
  eyebrowType: 0.02,      // Minimal impact
  clotheType: 0.02,       // Nearly ignored
  clotheColor: 0.01,      // Nearly ignored
  accessoriesType: 0.01,  // Nearly ignored
  graphicType: 0.00,      // Completely ignored
}

const STRICT_APPEARANCE_CONFIG: MatchConfig = {
  weights: STRICT_APPEARANCE_WEIGHTS,
  thresholds: {
    excellent: 92,  // Only near-perfect physical matches
    good: 80,       // Very similar appearance required
    fair: 65,       // Higher bar than default
  },
}

/**
 * Find avatars that look like the target avatar, ignoring style choices.
 */
function findLookalikes(
  targetAvatar: AvatarConfig,
  candidateAvatars: AvatarConfig[],
  minQuality: 'excellent' | 'good' | 'fair' = 'good'
): Array<{ avatar: AvatarConfig; score: number; quality: string }> {
  const qualityOrder = ['poor', 'fair', 'good', 'excellent']
  const minQualityIndex = qualityOrder.indexOf(minQuality)

  return candidateAvatars
    .map(avatar => {
      const result = calculateAvatarMatchScore(
        targetAvatar,
        avatar,
        STRICT_APPEARANCE_CONFIG
      )
      return { avatar, score: result.score, quality: result.quality }
    })
    .filter(match => qualityOrder.indexOf(match.quality) >= minQualityIndex)
    .sort((a, b) => b.score - a.score)
}

// Usage Example
const myAvatar: AvatarConfig = {
  skinColor: 'Light',
  hairColor: 'Brown',
  topType: 'ShortHairShortFlat',
  facialHairType: 'Blank',
  eyeType: 'Default',
  mouthType: 'Smile',
  eyebrowType: 'Default',
  clotheType: 'Hoodie',           // Will be mostly ignored
  clotheColor: 'Blue01',          // Will be mostly ignored
  accessoriesType: 'Prescription01',
  graphicType: 'Bat',
}

const allUsers = [/* array of user avatars */]
const lookalikes = findLookalikes(myAvatar, allUsers, 'good')

console.log(`Found ${lookalikes.length} look-alike avatars`)
lookalikes.forEach(match => {
  console.log(`Score: ${match.score}, Quality: ${match.quality}`)
})
```

**Why this configuration works:**
- Skin color at 40% ensures avatars with different skin tones never score well
- Hair (color + style) at 40% combined ensures similar hairstyles are required
- Facial hair at 10% catches facial hair presence differences
- Clothing and expressions at 10% combined means style choices barely affect the score
- High thresholds ensure only truly similar-looking avatars qualify

---

### Example: Relaxed Style Matching

**Use Case**: Finding users with similar fashion sense, regardless of physical appearance. Perfect for style-based recommendations, fashion communities, or "dress similar" features.

```typescript
import {
  calculateAvatarMatchScore,
} from '@/lib/matching'
import type { MatchConfig, MatchWeights, AvatarConfig, MatchResult } from '@/lib/matching'

/**
 * Relaxed Style Matching Configuration
 *
 * Characteristics:
 * - 70% weight on style elements (clothing, accessories, expressions)
 * - Only 30% weight on physical attributes
 * - Lower thresholds to cast a wider net
 * - Physical appearance has minimal impact
 */
const RELAXED_STYLE_WEIGHTS: MatchWeights = {
  // Physical attributes reduced to ~30%
  skinColor: 0.10,        // Minimal - don't discriminate by appearance
  hairColor: 0.08,        // Low impact
  topType: 0.05,          // Hair style slightly relevant to overall style
  facialHairType: 0.04,   // Minor
  facialHairColor: 0.03,  // Very minor

  // Style attributes boosted to ~70%
  eyeType: 0.08,          // Expression contributes to style vibe
  mouthType: 0.08,        // Expression contributes to style vibe
  eyebrowType: 0.06,      // Expression contributes to style vibe
  clotheType: 0.20,       // Major factor - clothing style
  clotheColor: 0.12,      // Important - color preferences
  accessoriesType: 0.12,  // Important - glasses choice
  graphicType: 0.04,      // Relevant when applicable
}

const RELAXED_STYLE_CONFIG: MatchConfig = {
  weights: RELAXED_STYLE_WEIGHTS,
  thresholds: {
    excellent: 75,  // Lower bar - more avatars qualify
    good: 55,       // Moderate similarity is "good"
    fair: 35,       // Very permissive for "fair"
  },
}

/**
 * Find avatars with similar style preferences.
 * Returns more matches than appearance-based matching.
 */
function findStyleMatches(
  targetAvatar: AvatarConfig,
  candidateAvatars: AvatarConfig[]
): Array<{
  avatar: AvatarConfig
  result: MatchResult
  styleScore: number  // Derived score focusing only on style
}> {
  return candidateAvatars
    .map(avatar => {
      const result = calculateAvatarMatchScore(
        targetAvatar,
        avatar,
        RELAXED_STYLE_CONFIG
      )

      // Calculate a derived "pure style" score from the breakdown
      const { breakdown } = result
      const styleScore = Math.round(
        (breakdown.clotheType.similarity * 0.30 +
         breakdown.clotheColor.similarity * 0.20 +
         breakdown.accessoriesType.similarity * 0.20 +
         breakdown.eyeType.similarity * 0.15 +
         breakdown.mouthType.similarity * 0.15) * 100
      )

      return { avatar, result, styleScore }
    })
    .filter(match => match.result.isMatch)
    .sort((a, b) => b.styleScore - a.styleScore)
}

/**
 * Group avatars by style categories.
 */
function groupByStyle(
  avatars: AvatarConfig[]
): Record<string, AvatarConfig[]> {
  const groups: Record<string, AvatarConfig[]> = {
    formal: [],
    casual: [],
    expressive: [],
    neutral: [],
  }

  avatars.forEach(avatar => {
    // Categorize by dominant traits
    const isFormal = ['BlazerShirt', 'BlazerSweater', 'CollarSweater']
      .includes(avatar.clotheType || '')
    const isExpressive = ['Happy', 'Wink', 'Hearts'].includes(avatar.eyeType || '') ||
                        ['Smile', 'Twinkle'].includes(avatar.mouthType || '')

    if (isFormal) {
      groups.formal.push(avatar)
    } else if (isExpressive) {
      groups.expressive.push(avatar)
    } else if (['Default', 'Serious'].includes(avatar.mouthType || '')) {
      groups.neutral.push(avatar)
    } else {
      groups.casual.push(avatar)
    }
  })

  return groups
}

// Usage Example
const myAvatar: AvatarConfig = {
  skinColor: 'Brown',             // Will have minimal impact
  hairColor: 'Black',             // Will have minimal impact
  topType: 'ShortHairShortFlat',  // Slightly relevant
  facialHairType: 'Blank',
  eyeType: 'Happy',               // Important for style matching
  mouthType: 'Smile',             // Important for style matching
  eyebrowType: 'DefaultNatural',
  clotheType: 'Hoodie',           // Very important
  clotheColor: 'Blue01',          // Very important
  accessoriesType: 'Sunglasses',  // Very important
  graphicType: 'Bat',
}

const allUsers = [/* array of user avatars */]
const styleMatches = findStyleMatches(myAvatar, allUsers)

console.log(`Found ${styleMatches.length} style-similar avatars`)
styleMatches.slice(0, 5).forEach(match => {
  console.log(`
    Overall Score: ${match.result.score}
    Style Score: ${match.styleScore}
    Quality: ${match.result.quality}
    Clothing Match: ${match.result.breakdown.clotheType.similarity * 100}%
  `)
})
```

**Why this configuration works:**
- Clothing type and color at 32% combined ensures fashion choices dominate
- Accessories at 12% catches similar glasses preferences
- Expressions at 22% combined allows matching by avatar "mood"
- Physical traits at 30% prevent complete mismatch but don't dominate
- Low thresholds (35% for fair) ensure plenty of results for discovery

---

### Troubleshooting Common Tuning Issues

#### Issue: Too Few Matches

**Symptoms**: Your matching returns very few or no results.

**Possible Causes & Solutions**:

1. **Thresholds too high**
   ```typescript
   // Problem: Default thresholds with strict requirements
   const config = {
     weights: DEFAULT_MATCH_WEIGHTS,
     thresholds: { excellent: 95, good: 90, fair: 85 }  // Too strict
   }

   // Solution: Lower thresholds
   const fixedConfig = {
     weights: DEFAULT_MATCH_WEIGHTS,
     thresholds: { excellent: 80, good: 65, fair: 50 }
   }
   ```

2. **Critical attribute mismatches**
   ```typescript
   // Check which attributes are causing low scores
   const result = calculateAvatarMatchScore(avatarA, avatarB, config)

   const culprits = Object.entries(result.breakdown)
     .filter(([_, d]) => d.similarity < 0.3 && d.weight > 0.1)
     .map(([attr, d]) => `${attr}: ${d.similarity} similarity, ${d.weight} weight`)

   console.log('Low-scoring high-weight attributes:', culprits)
   // If skinColor is always 0, diverse user base won't match well
   // Solution: Reduce skinColor weight for more inclusive matching
   ```

3. **Not enough candidates**
   ```typescript
   // Make sure you're searching enough candidates
   console.log(`Searching ${candidates.length} candidates`)

   // Try with relaxed config first to establish baseline
   const relaxedMatches = candidates.filter(c =>
     calculateAvatarMatchScore(target, c, RELAXED_MATCH_CONFIG).isMatch
   )
   console.log(`Relaxed matching found ${relaxedMatches.length} results`)
   ```

#### Issue: Too Many False Positives

**Symptoms**: Matching returns avatars that clearly don't look similar.

**Possible Causes & Solutions**:

1. **Thresholds too low**
   ```typescript
   // Problem: Very permissive thresholds
   const config = {
     weights: DEFAULT_MATCH_WEIGHTS,
     thresholds: { excellent: 60, good: 40, fair: 20 }  // Too permissive
   }

   // Solution: Raise thresholds
   const fixedConfig = {
     weights: DEFAULT_MATCH_WEIGHTS,
     thresholds: { excellent: 85, good: 70, fair: 55 }
   }
   ```

2. **Important attributes under-weighted**
   ```typescript
   // Problem: Skin color ignored but should matter for your use case
   const badWeights = {
     ...DEFAULT_MATCH_WEIGHTS,
     skinColor: 0.05,  // Too low for appearance matching
   }

   // Solution: Boost important attributes
   const fixedWeights = {
     ...DEFAULT_MATCH_WEIGHTS,
     skinColor: 0.30,  // Appropriately weighted
     clotheType: 0.03, // Reduce something else to compensate
   }
   ```

3. **Too many attributes contributing small amounts**
   ```typescript
   // Analyze score composition
   const result = calculateAvatarMatchScore(avatarA, avatarB, config)

   // Check how much of the score comes from "partial" matches
   const partialContributions = Object.entries(result.breakdown)
     .filter(([_, d]) => d.similarity >= 0.3 && d.similarity <= 0.7)
     .reduce((sum, [_, d]) => sum + d.contribution, 0)

   console.log(`${partialContributions * 100}% of score from partial matches`)
   // If this is high, many low-similarity attributes are adding up
   // Solution: Focus weight on fewer attributes or raise thresholds
   ```

#### Issue: Inconsistent Results Across Different Avatars

**Symptoms**: The algorithm works well for some avatars but poorly for others.

**Possible Causes & Solutions**:

1. **Conditional attributes causing weight shifts**
   ```typescript
   // Problem: facialHairColor (3%) excluded for some comparisons
   // This shifts other weights slightly when normalized

   // Solution: Be aware of conditional behavior and test edge cases
   const testCases = [
     { a: { facialHairType: 'Blank' }, b: { facialHairType: 'Blank' } },
     { a: { facialHairType: 'BeardMedium' }, b: { facialHairType: 'BeardMedium' } },
     // Test both scenarios
   ]

   testCases.forEach(({ a, b }) => {
     const result = calculateAvatarMatchScore(
       { ...DEFAULT_AVATAR, ...a },
       { ...DEFAULT_AVATAR, ...b },
       config
     )
     console.log(`Facial hair applicable: ${result.breakdown.facialHairColor.applicable}`)
   })
   ```

2. **Category-based matching variations**
   ```typescript
   // Some attribute values fall into different categories
   // "LongHairBob" matches other long hair at 0.7
   // But "LongHairBob" matches short hair at only 0.3

   // Understand the category mappings for your use case
   // See the similarity function documentation for groupings
   ```

3. **Missing avatar attributes defaulting**
   ```typescript
   // Problem: Some avatars missing attributes, defaulting silently
   const incompleteAvatar = {
     skinColor: 'Light',
     hairColor: 'Brown',
     // Missing: topType, eyeType, etc.
   }

   // Solution: Ensure avatars are complete or handle defaults explicitly
   import { DEFAULT_AVATAR_CONFIG } from '@/types/avatar'

   const completeAvatar = { ...DEFAULT_AVATAR_CONFIG, ...incompleteAvatar }
   ```

#### Issue: Weights Don't Sum to 1.0

**Symptoms**: Validation fails or scores seem off.

**Solution**:

```typescript
import { validateWeightsSum } from '@/lib/matching'
import type { MatchWeights } from '@/lib/matching'

const myWeights: MatchWeights = {
  skinColor: 0.30,
  hairColor: 0.20,
  topType: 0.15,
  facialHairType: 0.08,
  facialHairColor: 0.02,
  eyeType: 0.05,
  mouthType: 0.05,
  eyebrowType: 0.03,
  clotheType: 0.05,
  clotheColor: 0.03,
  accessoriesType: 0.03,
  graphicType: 0.01,
}

// Validate weights
if (!validateWeightsSum(myWeights)) {
  const sum = Object.values(myWeights).reduce((a, b) => a + b, 0)
  console.error(`Weights sum to ${sum}, should be 1.0`)

  // Fix by normalizing
  const normalized = Object.fromEntries(
    Object.entries(myWeights).map(([key, value]) => [key, value / sum])
  ) as MatchWeights

  console.log('Normalized weights:', normalized)
}
```

#### Issue: Thresholds in Wrong Order

**Symptoms**: Quality tiers overlap or make no sense.

**Solution**:

```typescript
import { validateThresholdsOrder } from '@/lib/matching'
import type { MatchThresholds } from '@/lib/matching'

const myThresholds: MatchThresholds = {
  excellent: 85,
  good: 70,
  fair: 50,
}

if (!validateThresholdsOrder(myThresholds)) {
  console.error('Thresholds must be: excellent > good > fair')

  // Auto-fix by sorting
  const values = [myThresholds.excellent, myThresholds.good, myThresholds.fair]
  values.sort((a, b) => b - a)  // Descending

  const fixed: MatchThresholds = {
    excellent: values[0],
    good: values[1],
    fair: values[2],
  }
  console.log('Fixed thresholds:', fixed)
}
```

---

### Best Practices Summary

1. **Start with presets** - Don't build from scratch; modify existing configurations
2. **Test incrementally** - Change one thing at a time and measure the impact
3. **Use representative data** - Test with real avatar pairs that represent your use case
4. **Document your choices** - Explain why you chose specific weights and thresholds
5. **Validate configurations** - Always check that weights sum to 1.0 and thresholds are ordered
6. **Handle edge cases** - Test with incomplete avatars, conditional attributes, and extreme values
7. **Monitor in production** - Track match quality metrics over time and adjust as needed
8. **Consider user feedback** - If users report bad matches, investigate with the breakdown

---

## Related Documentation

- **[Weighted Scoring System](#weighted-scoring-system)**: How attribute weights affect matching
- **[Threshold Customization Guide](#threshold-customization-guide)**: How to customize quality tier thresholds
- **[API Reference](#api-reference)**: Complete function and interface documentation

---

## API Reference

This section provides complete documentation for all exported functions, interfaces, types, and constants from the avatar matching module.

### Source Files

- **Implementation**: `lib/matching.ts`
- **Avatar Types**: `types/avatar.ts`

---

### Interfaces

#### MatchWeights

Configurable weights for each avatar attribute in the matching algorithm.

```typescript
interface MatchWeights {
  // Primary attributes (recommended total: 60%)
  skinColor: number      // Default: 0.25 - Core physical identifier
  hairColor: number      // Default: 0.15 - Major visual trait
  topType: number        // Default: 0.12 - Hair style/head covering
  facialHairType: number // Default: 0.05 - Notable when present
  facialHairColor: number // Default: 0.03 - Conditional: only when both have facial hair

  // Secondary attributes (recommended total: 40%)
  eyeType: number        // Default: 0.08 - Expression preference
  mouthType: number      // Default: 0.07 - Expression preference
  eyebrowType: number    // Default: 0.05 - Minor expression element
  clotheType: number     // Default: 0.08 - Style preference indicator
  clotheColor: number    // Default: 0.05 - Color preference in clothing
  accessoriesType: number // Default: 0.05 - Notable visual element (glasses)
  graphicType: number    // Default: 0.02 - Conditional: only when both have GraphicShirt
}
```

**Usage Example:**

```typescript
import type { MatchWeights } from '@/lib/matching'

// Custom weights focusing on physical appearance
const appearanceWeights: MatchWeights = {
  skinColor: 0.35,
  hairColor: 0.20,
  topType: 0.15,
  facialHairType: 0.08,
  facialHairColor: 0.02,
  eyeType: 0.04,
  mouthType: 0.04,
  eyebrowType: 0.02,
  clotheType: 0.04,
  clotheColor: 0.02,
  accessoriesType: 0.03,
  graphicType: 0.01,
}
```

**Notes:**
- All weights should sum to 1.0 (100%) for proper normalization
- Use `validateWeightsSum()` to verify weight configuration
- Conditional weights are excluded from calculation when not applicable

---

#### MatchThresholds

Configurable thresholds for match quality tier classification.

```typescript
interface MatchThresholds {
  excellent: number  // Default: 85 - Minimum score for "excellent" tier
  good: number       // Default: 70 - Minimum score for "good" tier
  fair: number       // Default: 50 - Minimum score for "fair" tier
  // "poor" is implicit: any score below fair threshold
}
```

**Usage Example:**

```typescript
import type { MatchThresholds } from '@/lib/matching'

// Strict thresholds for high-quality matching
const strictThresholds: MatchThresholds = {
  excellent: 95,  // Only near-perfect matches
  good: 85,       // High similarity required
  fair: 70,       // Moderate bar for "fair"
}

// Relaxed thresholds for discovery
const relaxedThresholds: MatchThresholds = {
  excellent: 75,
  good: 55,
  fair: 35,
}
```

**Notes:**
- Thresholds must be in descending order: excellent > good > fair
- Scores are on a 0-100 scale
- Use `validateThresholdsOrder()` to verify threshold configuration

---

#### MatchConfig

Complete matching configuration combining weights and thresholds.

```typescript
interface MatchConfig {
  weights: MatchWeights     // Attribute weights for score calculation
  thresholds: MatchThresholds // Quality tier thresholds for classification
}
```

**Usage Example:**

```typescript
import type { MatchConfig } from '@/lib/matching'
import { DEFAULT_MATCH_WEIGHTS, DEFAULT_MATCH_THRESHOLDS } from '@/lib/matching'

const customConfig: MatchConfig = {
  weights: {
    ...DEFAULT_MATCH_WEIGHTS,
    skinColor: 0.30,  // Boost skin color importance
    clotheType: 0.03, // Reduce clothing importance
  },
  thresholds: {
    excellent: 90,
    good: 75,
    fair: 55,
  },
}
```

---

#### MatchResult

Complete result from an avatar matching calculation.

```typescript
interface MatchResult {
  score: number             // Overall match score (0-100)
  quality: MatchQuality     // Quality tier classification
  breakdown: AttributeBreakdown // Per-attribute contribution details
  isMatch: boolean          // Whether score meets minimum threshold
  minThreshold: number      // The threshold value used for isMatch
}
```

**Usage Example:**

```typescript
import { calculateAvatarMatchScore } from '@/lib/matching'

const result = calculateAvatarMatchScore(avatarA, avatarB)

console.log(`Score: ${result.score}%`)           // "Score: 82%"
console.log(`Quality: ${result.quality}`)         // "Quality: good"
console.log(`Is Match: ${result.isMatch}`)        // "Is Match: true"
console.log(`Threshold: ${result.minThreshold}`)  // "Threshold: 50"

// Access breakdown for specific attribute
console.log(`Skin color similarity: ${result.breakdown.skinColor.similarity}`)
console.log(`Skin color contribution: ${result.breakdown.skinColor.contribution}`)
```

---

#### AttributeScoreDetail

Detailed similarity score for a single attribute.

```typescript
interface AttributeScoreDetail {
  similarity: number   // Raw similarity score (0.0 to 1.0)
  weight: number       // Weight assigned to this attribute (0.0 to 1.0)
  contribution: number // Actual contribution (similarity × weight)
}
```

**Usage Example:**

```typescript
const result = calculateAvatarMatchScore(avatarA, avatarB)

// Analyze skin color contribution
const skinColor = result.breakdown.skinColor
console.log(`Similarity: ${skinColor.similarity}`)     // e.g., 0.7
console.log(`Weight: ${skinColor.weight}`)             // e.g., 0.25
console.log(`Contribution: ${skinColor.contribution}`) // e.g., 0.175
```

---

#### ConditionalAttributeScoreDetail

Extended attribute score detail for conditional attributes (facialHairColor, graphicType).

```typescript
interface ConditionalAttributeScoreDetail extends AttributeScoreDetail {
  applicable: boolean // Whether this attribute was included in calculation
}
```

**Usage Example:**

```typescript
const result = calculateAvatarMatchScore(avatarA, avatarB)

// Check if facial hair color was applicable
const facialHairColor = result.breakdown.facialHairColor
if (facialHairColor.applicable) {
  console.log(`Facial hair color matched at ${facialHairColor.similarity * 100}%`)
} else {
  console.log('Facial hair color not applicable (one or both lack facial hair)')
}

// Check if graphic type was applicable
const graphicType = result.breakdown.graphicType
if (graphicType.applicable) {
  console.log(`Graphic type matched at ${graphicType.similarity * 100}%`)
} else {
  console.log('Graphic type not applicable (one or both not wearing GraphicShirt)')
}
```

---

#### AttributeBreakdown

Complete breakdown of similarity scores by attribute.

```typescript
interface AttributeBreakdown {
  // Primary attributes
  skinColor: AttributeScoreDetail
  hairColor: AttributeScoreDetail
  topType: AttributeScoreDetail
  facialHairType: AttributeScoreDetail
  facialHairColor: ConditionalAttributeScoreDetail

  // Secondary attributes
  eyeType: AttributeScoreDetail
  eyebrowType: AttributeScoreDetail
  mouthType: AttributeScoreDetail
  clotheType: AttributeScoreDetail
  clotheColor: AttributeScoreDetail
  accessoriesType: AttributeScoreDetail
  graphicType: ConditionalAttributeScoreDetail
}
```

**Usage Example:**

```typescript
const result = calculateAvatarMatchScore(avatarA, avatarB)

// Find best-matching attributes
const bestMatches = Object.entries(result.breakdown)
  .filter(([_, detail]) => detail.similarity >= 0.8)
  .map(([attr, detail]) => `${attr}: ${detail.similarity * 100}%`)

console.log('Best matches:', bestMatches)

// Find attributes dragging down the score
const worstMatches = Object.entries(result.breakdown)
  .filter(([_, detail]) => detail.similarity < 0.3 && detail.weight > 0.05)
  .map(([attr, detail]) => `${attr}: ${detail.similarity * 100}%`)

console.log('Worst matches:', worstMatches)
```

---

#### GraphicTypeSimilarityResult

Result of graphic type similarity calculation with applicability flag.

```typescript
interface GraphicTypeSimilarityResult {
  score: number      // Similarity score (0.0 or 1.0 for exact match only)
  applicable: boolean // Whether this comparison was applicable
}
```

**Usage Example:**

```typescript
import { calculateGraphicTypeSimilarity } from '@/lib/matching'

// Both wearing graphic shirts
const result1 = calculateGraphicTypeSimilarity(
  'Pizza', 'Pizza', 'GraphicShirt', 'GraphicShirt'
)
console.log(result1) // { score: 1.0, applicable: true }

// Different graphics
const result2 = calculateGraphicTypeSimilarity(
  'Pizza', 'Skull', 'GraphicShirt', 'GraphicShirt'
)
console.log(result2) // { score: 0.0, applicable: true }

// One not wearing graphic shirt
const result3 = calculateGraphicTypeSimilarity(
  'Pizza', 'Skull', 'GraphicShirt', 'Hoodie'
)
console.log(result3) // { score: 0, applicable: false }
```

---

### Types

#### MatchQuality

Match quality tier classification.

```typescript
type MatchQuality = 'excellent' | 'good' | 'fair' | 'poor'
```

**Usage Example:**

```typescript
import type { MatchQuality } from '@/lib/matching'

const quality: MatchQuality = 'good'

// Use in conditionals
if (quality === 'excellent' || quality === 'good') {
  console.log('This is a strong match!')
}

// Use in switch statements
switch (quality) {
  case 'excellent': return '⭐⭐⭐'
  case 'good': return '⭐⭐'
  case 'fair': return '⭐'
  case 'poor': return ''
}
```

---

### Functions

#### calculateAvatarMatchScore

The main matching function that calculates similarity between two avatar configurations.

```typescript
function calculateAvatarMatchScore(
  avatarA: AvatarConfig,
  avatarB: AvatarConfig,
  config?: Partial<MatchConfig>
): MatchResult
```

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `avatarA` | `AvatarConfig` | Yes | First avatar configuration to compare |
| `avatarB` | `AvatarConfig` | Yes | Second avatar configuration to compare |
| `config` | `Partial<MatchConfig>` | No | Optional match configuration (uses defaults if not provided) |

**Returns:** `MatchResult` - Complete match result with score, quality tier, and breakdown

**Usage Example:**

```typescript
import { calculateAvatarMatchScore, STRICT_MATCH_CONFIG } from '@/lib/matching'

const avatarA = {
  skinColor: 'Light',
  hairColor: 'Brown',
  topType: 'ShortHairShortFlat',
  facialHairType: 'Blank',
  eyeType: 'Default',
  mouthType: 'Smile',
  eyebrowType: 'Default',
  clotheType: 'Hoodie',
  clotheColor: 'Blue01',
  accessoriesType: 'Prescription01',
  graphicType: 'Bat',
}

const avatarB = {
  skinColor: 'Light',
  hairColor: 'BrownDark',
  topType: 'ShortHairShortCurly',
  facialHairType: 'Blank',
  eyeType: 'Happy',
  mouthType: 'Smile',
  eyebrowType: 'DefaultNatural',
  clotheType: 'ShirtCrewNeck',
  clotheColor: 'Gray01',
  accessoriesType: 'Prescription02',
  graphicType: 'Skull',
}

// With default config
const result1 = calculateAvatarMatchScore(avatarA, avatarB)
console.log(result1.score, result1.quality) // e.g., 72, "good"

// With strict config
const result2 = calculateAvatarMatchScore(avatarA, avatarB, STRICT_MATCH_CONFIG)
console.log(result2.score, result2.quality) // e.g., 72, "fair" (higher thresholds)

// With partial config (only overriding thresholds)
const result3 = calculateAvatarMatchScore(avatarA, avatarB, {
  thresholds: { excellent: 90, good: 80, fair: 60 }
})
```

---

#### evaluateMatch

Evaluates a match score and returns the corresponding quality tier.

```typescript
function evaluateMatch(
  score: number,
  thresholds?: MatchThresholds
): MatchQuality
```

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `score` | `number` | Yes | The match score to evaluate (0-100 scale) |
| `thresholds` | `MatchThresholds` | No | Custom thresholds (uses defaults if not provided) |

**Returns:** `MatchQuality` - The quality tier classification ('excellent', 'good', 'fair', or 'poor')

**Usage Example:**

```typescript
import { evaluateMatch } from '@/lib/matching'

// Using default thresholds
evaluateMatch(92)  // Returns 'excellent'
evaluateMatch(75)  // Returns 'good'
evaluateMatch(55)  // Returns 'fair'
evaluateMatch(30)  // Returns 'poor'

// Using custom thresholds
const strictThresholds = { excellent: 95, good: 85, fair: 70 }
evaluateMatch(92, strictThresholds)  // Returns 'good' (not excellent with strict config)
evaluateMatch(70, strictThresholds)  // Returns 'fair'
```

---

#### isMatch

Determines if a match score meets or exceeds a minimum threshold.

```typescript
function isMatch(
  score: number,
  minimumThreshold?: number
): boolean
```

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `score` | `number` | Yes | — | The match score to evaluate (0-100 scale) |
| `minimumThreshold` | `number` | No | 50 | The minimum score required to be considered a match |

**Returns:** `boolean` - true if the score meets or exceeds the minimum threshold

**Usage Example:**

```typescript
import { isMatch } from '@/lib/matching'

// Using default minimum (50 - "fair" threshold)
isMatch(75)  // Returns true
isMatch(45)  // Returns false

// Using custom minimum for strict matching
isMatch(75, 80)  // Returns false (75 < 80)
isMatch(85, 80)  // Returns true (85 >= 80)

// Using custom minimum for relaxed matching
isMatch(35, 30)  // Returns true (35 >= 30)

// Common pattern: filter results
const matches = allResults.filter(r => isMatch(r.score, 70))
```

---

#### getMatchQuality

Returns a human-readable string for a match quality tier. Alias for `getMatchQualityDescription(quality, 'full')`.

```typescript
function getMatchQuality(quality: MatchQuality): string
```

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `quality` | `MatchQuality` | Yes | The quality tier to describe |

**Returns:** `string` - A human-readable description string

**Usage Example:**

```typescript
import { getMatchQuality } from '@/lib/matching'

getMatchQuality('excellent')
// Returns: "Excellent match - near-identical avatars with only minor differences"

getMatchQuality('good')
// Returns: "Good match - similar appearance with the same general look"

getMatchQuality('fair')
// Returns: "Fair match - some similarities but with notable differences"

getMatchQuality('poor')
// Returns: "Poor match - significantly different avatars"
```

---

#### getMatchQualityDescription

Returns a human-readable description of a match quality tier with format options.

```typescript
function getMatchQualityDescription(
  quality: MatchQuality,
  format?: 'full' | 'short'
): string
```

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `quality` | `MatchQuality` | Yes | — | The quality tier to describe |
| `format` | `'full' \| 'short'` | No | 'full' | The description format |

**Returns:** `string` - A human-readable description string

**Usage Example:**

```typescript
import { getMatchQualityDescription } from '@/lib/matching'

// Full descriptions (default)
getMatchQualityDescription('excellent')
// Returns: "Excellent match - near-identical avatars with only minor differences"

getMatchQualityDescription('good', 'full')
// Returns: "Good match - similar appearance with the same general look"

// Short descriptions
getMatchQualityDescription('excellent', 'short')
// Returns: "Near-identical"

getMatchQualityDescription('good', 'short')
// Returns: "Similar appearance"

getMatchQualityDescription('fair', 'short')
// Returns: "Some similarities"

getMatchQualityDescription('poor', 'short')
// Returns: "Significantly different"
```

---

#### getQualityScoreRange

Gets the score range for a given quality tier based on thresholds.

```typescript
function getQualityScoreRange(
  quality: MatchQuality,
  thresholds?: MatchThresholds
): { min: number; max: number }
```

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `quality` | `MatchQuality` | Yes | The quality tier to get the range for |
| `thresholds` | `MatchThresholds` | No | Custom thresholds (uses defaults if not provided) |

**Returns:** `{ min: number; max: number }` - Object with min and max score boundaries

**Usage Example:**

```typescript
import { getQualityScoreRange } from '@/lib/matching'

// Using default thresholds
getQualityScoreRange('excellent')  // { min: 85, max: 100 }
getQualityScoreRange('good')       // { min: 70, max: 84 }
getQualityScoreRange('fair')       // { min: 50, max: 69 }
getQualityScoreRange('poor')       // { min: 0, max: 49 }

// Using custom thresholds
const strictThresholds = { excellent: 95, good: 85, fair: 70 }
getQualityScoreRange('excellent', strictThresholds)  // { min: 95, max: 100 }
getQualityScoreRange('good', strictThresholds)       // { min: 85, max: 94 }

// Display ranges to users
const range = getQualityScoreRange('good')
console.log(`Good matches have scores between ${range.min} and ${range.max}`)
```

---

#### isMatchQuality

Type guard to check if a value is a valid MatchQuality.

```typescript
function isMatchQuality(value: unknown): value is MatchQuality
```

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `value` | `unknown` | Yes | The value to check |

**Returns:** `boolean` - true if the value is a valid MatchQuality

**Usage Example:**

```typescript
import { isMatchQuality } from '@/lib/matching'

isMatchQuality('excellent')  // true
isMatchQuality('good')       // true
isMatchQuality('fair')       // true
isMatchQuality('poor')       // true
isMatchQuality('amazing')    // false
isMatchQuality(42)           // false
isMatchQuality(null)         // false

// Use in type guards
function processQuality(quality: unknown) {
  if (isMatchQuality(quality)) {
    // TypeScript knows quality is MatchQuality here
    console.log(getMatchQuality(quality))
  } else {
    console.log('Invalid quality value')
  }
}
```

---

#### validateWeightsSum

Validates that weights sum to approximately 1.0 (within tolerance).

```typescript
function validateWeightsSum(
  weights: MatchWeights,
  tolerance?: number
): boolean
```

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `weights` | `MatchWeights` | Yes | — | The weights to validate |
| `tolerance` | `number` | No | 0.01 | Acceptable deviation from 1.0 |

**Returns:** `boolean` - true if weights sum to 1.0 within tolerance

**Usage Example:**

```typescript
import { validateWeightsSum, DEFAULT_MATCH_WEIGHTS } from '@/lib/matching'

// Validate default weights
validateWeightsSum(DEFAULT_MATCH_WEIGHTS)  // true

// Validate custom weights
const customWeights = {
  ...DEFAULT_MATCH_WEIGHTS,
  skinColor: 0.30,
  clotheType: 0.03, // Reduced to compensate
}
validateWeightsSum(customWeights)  // true

// Invalid weights (sum != 1.0)
const badWeights = {
  ...DEFAULT_MATCH_WEIGHTS,
  skinColor: 0.50, // Increased without reducing others
}
validateWeightsSum(badWeights)  // false

// With custom tolerance
validateWeightsSum(customWeights, 0.001)  // More strict tolerance
```

---

#### validateThresholdsOrder

Validates that thresholds are in descending order and within valid bounds.

```typescript
function validateThresholdsOrder(thresholds: MatchThresholds): boolean
```

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `thresholds` | `MatchThresholds` | Yes | The thresholds to validate |

**Returns:** `boolean` - true if excellent > good > fair and all values are in valid range

**Usage Example:**

```typescript
import { validateThresholdsOrder } from '@/lib/matching'

// Valid thresholds
validateThresholdsOrder({ excellent: 85, good: 70, fair: 50 })  // true
validateThresholdsOrder({ excellent: 95, good: 85, fair: 70 })  // true

// Invalid: out of order
validateThresholdsOrder({ excellent: 70, good: 85, fair: 50 })  // false (good > excellent)
validateThresholdsOrder({ excellent: 85, good: 50, fair: 70 })  // false (fair > good)

// Invalid: out of bounds
validateThresholdsOrder({ excellent: 110, good: 70, fair: 50 }) // false (excellent > 100)
validateThresholdsOrder({ excellent: 85, good: 70, fair: -5 })  // false (fair < 0)

// Validate before using custom config
const myThresholds = { excellent: 90, good: 75, fair: 60 }
if (!validateThresholdsOrder(myThresholds)) {
  throw new Error('Invalid thresholds configuration')
}
```

---

### Similarity Functions

These functions calculate similarity scores (0.0 to 1.0) for individual avatar attributes.

#### calculateSkinColorSimilarity

Calculates similarity between two skin colors using grouped proximity matching.

```typescript
function calculateSkinColorSimilarity(a: SkinColor, b: SkinColor): number
```

**Skin Color Groups:**
- **Light**: Pale, Light
- **Medium**: Tanned, Yellow, Brown
- **Dark**: DarkBrown, Black

**Scoring:**
| Match Type | Score |
|------------|-------|
| Exact match | 1.0 |
| Same group | 0.7 |
| Adjacent groups | 0.3 |
| Opposite groups (light ↔ dark) | 0.0 |

**Usage Example:**

```typescript
import { calculateSkinColorSimilarity } from '@/lib/matching'

calculateSkinColorSimilarity('Light', 'Light')   // 1.0 (exact)
calculateSkinColorSimilarity('Light', 'Pale')    // 0.7 (same group)
calculateSkinColorSimilarity('Light', 'Brown')   // 0.3 (adjacent)
calculateSkinColorSimilarity('Pale', 'Black')    // 0.0 (opposite)
```

---

#### calculateHairColorSimilarity

Calculates similarity between two hair colors using color family proximity.

```typescript
function calculateHairColorSimilarity(a: HairColor, b: HairColor): number
```

**Hair Color Groups:**
- **Dark**: Black, BrownDark
- **Brown**: Brown, Auburn
- **Blonde**: Blonde, BlondeGolden, Platinum
- **Vibrant**: PastelPink, Blue, Red
- **Gray**: SilverGray

**Scoring:**
| Match Type | Score |
|------------|-------|
| Exact match | 1.0 |
| Same group | 0.8 |
| Adjacent natural groups | 0.5 |
| Gray with natural | 0.3 |
| Vibrant with natural | 0.0 |
| Different natural groups | 0.2 |

**Usage Example:**

```typescript
import { calculateHairColorSimilarity } from '@/lib/matching'

calculateHairColorSimilarity('Brown', 'Brown')      // 1.0 (exact)
calculateHairColorSimilarity('Brown', 'Auburn')     // 0.8 (same group)
calculateHairColorSimilarity('Brown', 'Black')      // 0.5 (adjacent)
calculateHairColorSimilarity('Brown', 'SilverGray') // 0.3 (gray is neutral)
calculateHairColorSimilarity('Brown', 'Blue')       // 0.0 (natural vs vibrant)
```

---

#### calculateTopTypeSimilarity

Calculates similarity between two top types (hair styles/head coverings).

```typescript
function calculateTopTypeSimilarity(a: TopType, b: TopType): number
```

**Top Type Categories:**
- **noHair**: NoHair
- **longHair**: LongHairBigHair, LongHairBob, LongHairBun, etc. (15 styles)
- **shortHair**: ShortHairDreads01, ShortHairFrizzle, etc. (11 styles)
- **headCovering**: Hat, Hijab, Turban, WinterHat1-4
- **accessory**: Eyepatch

**Usage Example:**

```typescript
import { calculateTopTypeSimilarity } from '@/lib/matching'

calculateTopTypeSimilarity('LongHairBob', 'LongHairBob')    // 1.0 (exact)
calculateTopTypeSimilarity('LongHairBob', 'LongHairCurly')  // 0.7 (same category)
calculateTopTypeSimilarity('LongHairBob', 'ShortHairFlat')  // 0.3 (both hair)
calculateTopTypeSimilarity('LongHairBob', 'NoHair')         // 0.1 (hair vs no hair)
```

---

#### calculateFacialHairSimilarity

Calculates similarity between two facial hair types.

```typescript
function calculateFacialHairSimilarity(a: FacialHairType, b: FacialHairType): number
```

**Facial Hair Categories:**
- **none**: Blank
- **beard**: BeardLight, BeardMedium, BeardMajestic
- **moustache**: MoustacheFancy, MoustacheMagnum

**Usage Example:**

```typescript
import { calculateFacialHairSimilarity } from '@/lib/matching'

calculateFacialHairSimilarity('BeardMedium', 'BeardMedium')    // 1.0 (exact)
calculateFacialHairSimilarity('BeardMedium', 'BeardLight')     // 0.8 (same category)
calculateFacialHairSimilarity('BeardMedium', 'MoustacheFancy') // 0.5 (both have facial hair)
calculateFacialHairSimilarity('BeardMedium', 'Blank')          // 0.0 (has vs doesn't have)
```

---

#### calculateFacialHairColorSimilarity

Calculates similarity between two facial hair colors. Only applicable when both avatars have facial hair.

```typescript
function calculateFacialHairColorSimilarity(a: FacialHairColor, b: FacialHairColor): number
```

**Facial Hair Color Groups:**
- **Dark**: Black, BrownDark
- **Brown**: Brown, Auburn, Red
- **Blonde**: Blonde, BlondeGolden, Platinum

**Usage Example:**

```typescript
import { calculateFacialHairColorSimilarity } from '@/lib/matching'

calculateFacialHairColorSimilarity('Brown', 'Brown')   // 1.0 (exact)
calculateFacialHairColorSimilarity('Brown', 'Auburn')  // 0.8 (same group)
calculateFacialHairColorSimilarity('Brown', 'Black')   // 0.5 (adjacent)
calculateFacialHairColorSimilarity('Brown', 'Blonde')  // 0.2 (opposite)
```

---

#### calculateEyeTypeSimilarity

Calculates similarity between two eye types based on expression category.

```typescript
function calculateEyeTypeSimilarity(a: EyeType, b: EyeType): number
```

**Eye Expression Categories:**
- **neutral**: Default, Side, Squint
- **happy**: Happy, Hearts, Wink, WinkWacky
- **unusual**: Close, Cry, Dizzy, EyeRoll, Surprised

**Usage Example:**

```typescript
import { calculateEyeTypeSimilarity } from '@/lib/matching'

calculateEyeTypeSimilarity('Happy', 'Happy')    // 1.0 (exact)
calculateEyeTypeSimilarity('Happy', 'Wink')     // 0.6 (same category)
calculateEyeTypeSimilarity('Happy', 'Default')  // 0.2 (different category)
```

---

#### calculateMouthTypeSimilarity

Calculates similarity between two mouth types based on expression category.

```typescript
function calculateMouthTypeSimilarity(a: MouthType, b: MouthType): number
```

**Mouth Expression Categories:**
- **neutral**: Default, Serious
- **happy**: Smile, Twinkle
- **unusual**: Concerned, Disbelief, Eating, Grimace, Sad, ScreamOpen, Tongue, Vomit

**Usage Example:**

```typescript
import { calculateMouthTypeSimilarity } from '@/lib/matching'

calculateMouthTypeSimilarity('Smile', 'Smile')    // 1.0 (exact)
calculateMouthTypeSimilarity('Smile', 'Twinkle')  // 0.6 (same category)
calculateMouthTypeSimilarity('Smile', 'Default')  // 0.2 (different category)
```

---

#### calculateEyebrowTypeSimilarity

Calculates similarity between two eyebrow types.

```typescript
function calculateEyebrowTypeSimilarity(a: EyebrowType, b: EyebrowType): number
```

**Eyebrow Categories:**
- **neutral**: Default, DefaultNatural, FlatNatural
- **expressive**: Angry, AngryNatural, RaisedExcited, RaisedExcitedNatural, SadConcerned, SadConcernedNatural, UnibrowNatural, UpDown, UpDownNatural

**Usage Example:**

```typescript
import { calculateEyebrowTypeSimilarity } from '@/lib/matching'

calculateEyebrowTypeSimilarity('Default', 'Default')          // 1.0 (exact)
calculateEyebrowTypeSimilarity('Default', 'DefaultNatural')   // 0.6 (same category)
calculateEyebrowTypeSimilarity('Default', 'Angry')            // 0.2 (different category)
```

---

#### calculateClotheTypeSimilarity

Calculates similarity between two clothing types based on formality.

```typescript
function calculateClotheTypeSimilarity(a: ClotheType, b: ClotheType): number
```

**Clothing Formality Categories:**
- **formal**: BlazerShirt, BlazerSweater, CollarSweater
- **casual**: GraphicShirt, Hoodie, Overall, ShirtCrewNeck, ShirtScoopNeck, ShirtVNeck

**Usage Example:**

```typescript
import { calculateClotheTypeSimilarity } from '@/lib/matching'

calculateClotheTypeSimilarity('Hoodie', 'Hoodie')          // 1.0 (exact)
calculateClotheTypeSimilarity('Hoodie', 'ShirtCrewNeck')   // 0.7 (same formality)
calculateClotheTypeSimilarity('Hoodie', 'BlazerShirt')     // 0.3 (different formality)
```

---

#### calculateClotheColorSimilarity

Calculates similarity between two clothing colors based on color family.

```typescript
function calculateClotheColorSimilarity(a: ClotheColor, b: ClotheColor): number
```

**Clothing Color Groups:**
- **blues**: Blue01, Blue02, Blue03
- **pastels**: PastelBlue, PastelGreen, PastelOrange, PastelRed, PastelYellow
- **neutrals**: Black, Gray01, Gray02, Heather, White
- **vibrant**: Pink, Red

**Usage Example:**

```typescript
import { calculateClotheColorSimilarity } from '@/lib/matching'

calculateClotheColorSimilarity('Blue01', 'Blue01')  // 1.0 (exact)
calculateClotheColorSimilarity('Blue01', 'Blue02')  // 0.7 (same group)
calculateClotheColorSimilarity('Blue01', 'Red')     // 0.3 (different group)
```

---

#### calculateAccessoriesSimilarity

Calculates similarity between two accessories types.

```typescript
function calculateAccessoriesSimilarity(a: AccessoriesType, b: AccessoriesType): number
```

**Accessories Categories:**
- **none**: Blank
- **prescription**: Kurt, Prescription01, Prescription02, Round
- **sunglasses**: Sunglasses, Wayfarers

**Usage Example:**

```typescript
import { calculateAccessoriesSimilarity } from '@/lib/matching'

calculateAccessoriesSimilarity('Prescription01', 'Prescription01')  // 1.0 (exact)
calculateAccessoriesSimilarity('Prescription01', 'Round')           // 0.8 (same category)
calculateAccessoriesSimilarity('Prescription01', 'Sunglasses')      // 0.5 (both have glasses)
calculateAccessoriesSimilarity('Prescription01', 'Blank')           // 0.2 (has vs doesn't have)
```

---

#### calculateGraphicTypeSimilarity

Calculates similarity between two graphic types. Only applicable when both avatars wear GraphicShirt.

```typescript
function calculateGraphicTypeSimilarity(
  a: GraphicType,
  b: GraphicType,
  clotheA: ClotheType,
  clotheB: ClotheType
): GraphicTypeSimilarityResult
```

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `a` | `GraphicType` | First graphic type |
| `b` | `GraphicType` | Second graphic type |
| `clotheA` | `ClotheType` | Clothing type of first avatar |
| `clotheB` | `ClotheType` | Clothing type of second avatar |

**Returns:** `GraphicTypeSimilarityResult` - Object with score and applicability flag

**Usage Example:**

```typescript
import { calculateGraphicTypeSimilarity } from '@/lib/matching'

// Both wearing graphic shirts with same graphic
calculateGraphicTypeSimilarity('Pizza', 'Pizza', 'GraphicShirt', 'GraphicShirt')
// { score: 1.0, applicable: true }

// Both wearing graphic shirts with different graphics
calculateGraphicTypeSimilarity('Pizza', 'Skull', 'GraphicShirt', 'GraphicShirt')
// { score: 0.0, applicable: true }

// One not wearing graphic shirt - not applicable
calculateGraphicTypeSimilarity('Pizza', 'Skull', 'GraphicShirt', 'Hoodie')
// { score: 0, applicable: false }
```

---

### Constants

#### DEFAULT_MATCH_WEIGHTS

Default weights for avatar matching with 60/40 primary/secondary split.

```typescript
const DEFAULT_MATCH_WEIGHTS: MatchWeights = {
  // Primary attributes (60%)
  skinColor: 0.25,
  hairColor: 0.15,
  topType: 0.12,
  facialHairType: 0.05,
  facialHairColor: 0.03,

  // Secondary attributes (40%)
  eyeType: 0.08,
  mouthType: 0.07,
  eyebrowType: 0.05,
  clotheType: 0.08,
  clotheColor: 0.05,
  accessoriesType: 0.05,
  graphicType: 0.02,
}
```

**Usage:**

```typescript
import { DEFAULT_MATCH_WEIGHTS } from '@/lib/matching'

// Use as base for custom weights
const myWeights = {
  ...DEFAULT_MATCH_WEIGHTS,
  skinColor: 0.30,  // Increase skin color importance
  clotheType: 0.03, // Decrease to maintain sum of 1.0
}
```

---

#### DEFAULT_MATCH_THRESHOLDS

Default thresholds for match quality tiers.

```typescript
const DEFAULT_MATCH_THRESHOLDS: MatchThresholds = {
  excellent: 85,  // Near-identical avatars
  good: 70,       // Similar appearance
  fair: 50,       // Some similarities
}
```

**Usage:**

```typescript
import { DEFAULT_MATCH_THRESHOLDS } from '@/lib/matching'

// Use as base for custom thresholds
const myThresholds = {
  ...DEFAULT_MATCH_THRESHOLDS,
  good: 75, // Raise the bar for "good"
}
```

---

#### DEFAULT_MATCH_CONFIG

Default match configuration combining weights and thresholds.

```typescript
const DEFAULT_MATCH_CONFIG: MatchConfig = {
  weights: DEFAULT_MATCH_WEIGHTS,
  thresholds: DEFAULT_MATCH_THRESHOLDS,
}
```

**Usage:**

```typescript
import { DEFAULT_MATCH_CONFIG, calculateAvatarMatchScore } from '@/lib/matching'

// Explicitly use default config
const result = calculateAvatarMatchScore(avatarA, avatarB, DEFAULT_MATCH_CONFIG)

// Or simply omit the config parameter (same result)
const result2 = calculateAvatarMatchScore(avatarA, avatarB)
```

---

#### STRICT_MATCH_CONFIG

Preset configuration with higher thresholds for near-exact matching.

```typescript
const STRICT_MATCH_CONFIG: MatchConfig = {
  weights: DEFAULT_MATCH_WEIGHTS,
  thresholds: {
    excellent: 95,  // Only near-perfect matches
    good: 85,       // Very high similarity required
    fair: 70,       // Higher bar for "acceptable"
  },
}
```

**Use Cases:**
- Finding duplicate or very similar avatars
- High-security identity verification
- Quality assurance for avatar consistency

**Usage:**

```typescript
import { STRICT_MATCH_CONFIG, calculateAvatarMatchScore } from '@/lib/matching'

const result = calculateAvatarMatchScore(avatarA, avatarB, STRICT_MATCH_CONFIG)
// With strict config, a score of 80 would be "fair" instead of "good"
```

---

#### RELAXED_MATCH_CONFIG

Preset configuration with lower thresholds for loose matching.

```typescript
const RELAXED_MATCH_CONFIG: MatchConfig = {
  weights: DEFAULT_MATCH_WEIGHTS,
  thresholds: {
    excellent: 75,  // Good matches qualify as excellent
    good: 55,       // Moderate similarity is "good"
    fair: 35,       // Low bar for basic matching
  },
}
```

**Use Cases:**
- Finding avatars with any visual similarity
- Suggestion systems with broader recommendations
- Community features where loose matching is acceptable
- Initial filtering before manual review

**Usage:**

```typescript
import { RELAXED_MATCH_CONFIG, calculateAvatarMatchScore } from '@/lib/matching'

const result = calculateAvatarMatchScore(avatarA, avatarB, RELAXED_MATCH_CONFIG)
// With relaxed config, a score of 60 would be "good" instead of "fair"
```

---

#### APPEARANCE_FOCUSED_WEIGHTS

Weights optimized for appearance-focused matching (80% primary / 20% secondary).

```typescript
const APPEARANCE_FOCUSED_WEIGHTS: MatchWeights = {
  // Primary attributes boosted to 80%
  skinColor: 0.35,
  hairColor: 0.20,
  topType: 0.15,
  facialHairType: 0.08,
  facialHairColor: 0.02,

  // Secondary attributes reduced to 20%
  eyeType: 0.04,
  mouthType: 0.04,
  eyebrowType: 0.02,
  clotheType: 0.04,
  clotheColor: 0.02,
  accessoriesType: 0.03,
  graphicType: 0.01,
}
```

**Usage:**

```typescript
import { APPEARANCE_FOCUSED_WEIGHTS } from '@/lib/matching'

const myConfig = {
  weights: APPEARANCE_FOCUSED_WEIGHTS,
  thresholds: { excellent: 90, good: 75, fair: 60 },
}
```

---

#### APPEARANCE_FOCUSED_CONFIG

Preset configuration prioritizing physical appearance over style.

```typescript
const APPEARANCE_FOCUSED_CONFIG: MatchConfig = {
  weights: APPEARANCE_FOCUSED_WEIGHTS,
  thresholds: DEFAULT_MATCH_THRESHOLDS,
}
```

**Use Cases:**
- Matching avatars based on physical representation
- Finding "look-alikes" regardless of clothing choices
- Identity-based matching where style is irrelevant
- Demographic analysis or research

**Usage:**

```typescript
import { APPEARANCE_FOCUSED_CONFIG, calculateAvatarMatchScore } from '@/lib/matching'

// Two avatars with same skin/hair but different clothes
const result = calculateAvatarMatchScore(avatarA, avatarB, APPEARANCE_FOCUSED_CONFIG)
// Will score higher than with default config because clothes matter less
```

---

#### STYLE_FOCUSED_WEIGHTS

Weights optimized for style-focused matching (40% primary / 60% secondary).

```typescript
const STYLE_FOCUSED_WEIGHTS: MatchWeights = {
  // Primary attributes reduced to 40%
  skinColor: 0.15,
  hairColor: 0.10,
  topType: 0.08,
  facialHairType: 0.04,
  facialHairColor: 0.03,

  // Secondary attributes boosted to 60%
  eyeType: 0.10,
  mouthType: 0.08,
  eyebrowType: 0.06,
  clotheType: 0.15,
  clotheColor: 0.10,
  accessoriesType: 0.08,
  graphicType: 0.03,
}
```

**Usage:**

```typescript
import { STYLE_FOCUSED_WEIGHTS } from '@/lib/matching'

const myConfig = {
  weights: STYLE_FOCUSED_WEIGHTS,
  thresholds: { excellent: 80, good: 60, fair: 40 },
}
```

---

#### STYLE_FOCUSED_CONFIG

Preset configuration prioritizing fashion and style over physical appearance.

```typescript
const STYLE_FOCUSED_CONFIG: MatchConfig = {
  weights: STYLE_FOCUSED_WEIGHTS,
  thresholds: DEFAULT_MATCH_THRESHOLDS,
}
```

**Use Cases:**
- Finding avatars with similar style/fashion sense
- Matching by personality expression (clothing, expressions)
- Community features based on style preferences
- Fashion recommendation systems

**Usage:**

```typescript
import { STYLE_FOCUSED_CONFIG, calculateAvatarMatchScore } from '@/lib/matching'

// Two avatars with different skin/hair but same outfit and expression
const result = calculateAvatarMatchScore(avatarA, avatarB, STYLE_FOCUSED_CONFIG)
// Will score higher than with default config because style matters more
```

---

### Quick Reference: All Exports

```typescript
// Main matching function
export function calculateAvatarMatchScore(avatarA, avatarB, config?): MatchResult

// Threshold evaluation
export function evaluateMatch(score, thresholds?): MatchQuality
export function isMatch(score, minimumThreshold?): boolean
export function getMatchQuality(quality): string
export function getMatchQualityDescription(quality, format?): string
export function getQualityScoreRange(quality, thresholds?): { min, max }

// Validation utilities
export function isMatchQuality(value): value is MatchQuality
export function validateWeightsSum(weights, tolerance?): boolean
export function validateThresholdsOrder(thresholds): boolean

// Similarity calculators
export function calculateSkinColorSimilarity(a, b): number
export function calculateHairColorSimilarity(a, b): number
export function calculateTopTypeSimilarity(a, b): number
export function calculateFacialHairSimilarity(a, b): number
export function calculateFacialHairColorSimilarity(a, b): number
export function calculateEyeTypeSimilarity(a, b): number
export function calculateMouthTypeSimilarity(a, b): number
export function calculateEyebrowTypeSimilarity(a, b): number
export function calculateClotheTypeSimilarity(a, b): number
export function calculateClotheColorSimilarity(a, b): number
export function calculateAccessoriesSimilarity(a, b): number
export function calculateGraphicTypeSimilarity(a, b, clotheA, clotheB): GraphicTypeSimilarityResult

// Interfaces
export interface MatchWeights { /* 12 attribute weights */ }
export interface MatchThresholds { excellent, good, fair }
export interface MatchConfig { weights, thresholds }
export interface MatchResult { score, quality, breakdown, isMatch, minThreshold }
export interface AttributeScoreDetail { similarity, weight, contribution }
export interface ConditionalAttributeScoreDetail extends AttributeScoreDetail { applicable }
export interface AttributeBreakdown { /* 12 attribute details */ }
export interface GraphicTypeSimilarityResult { score, applicable }

// Types
export type MatchQuality = 'excellent' | 'good' | 'fair' | 'poor'

// Default configurations
export const DEFAULT_MATCH_WEIGHTS: MatchWeights
export const DEFAULT_MATCH_THRESHOLDS: MatchThresholds
export const DEFAULT_MATCH_CONFIG: MatchConfig

// Preset configurations
export const STRICT_MATCH_CONFIG: MatchConfig
export const RELAXED_MATCH_CONFIG: MatchConfig
export const APPEARANCE_FOCUSED_WEIGHTS: MatchWeights
export const APPEARANCE_FOCUSED_CONFIG: MatchConfig
export const STYLE_FOCUSED_WEIGHTS: MatchWeights
export const STYLE_FOCUSED_CONFIG: MatchConfig
```
