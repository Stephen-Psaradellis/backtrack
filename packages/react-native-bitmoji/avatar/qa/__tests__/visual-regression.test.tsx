/**
 * Visual Regression Tests
 *
 * Automated snapshot tests for all avatar style variants.
 * These tests capture SVG output and compare against baselines.
 */

import React from 'react';
import { render as rtlRender } from '@testing-library/react';
import renderer from 'react-test-renderer';
import { Avatar } from '../../Avatar';
import { FullBodyAvatar } from '../../FullBodyAvatar';
import {
  DEFAULT_MALE_CONFIG,
  DEFAULT_FEMALE_CONFIG,
  FaceShape,
  EyeStyle,
  EyelashStyle,
  EyebrowStyle,
  NoseStyle,
  MouthStyle,
  HairStyle,
  FacialHairStyle,
  AccessoryStyle,
  ClothingStyle,
  FreckleStyle,
  WrinkleStyle,
  CheekStyle,
  EyeBagsStyle,
  EyeshadowStyle,
  EyelinerStyle,
  LipstickStyle,
  BlushStyle,
  AvatarConfig,
  BodyType,
  ArmPose,
  LegPose,
  ShoeStyle,
} from '../../types';

// ============================================================================
// TEST UTILITIES
// ============================================================================

function render(ui: React.ReactElement) {
  const result = rtlRender(ui);
  return {
    ...result,
    toJSON: () => result.container.innerHTML,
  };
}

function renderAvatar(config: Partial<AvatarConfig>) {
  const fullConfig = { ...DEFAULT_MALE_CONFIG, ...config };
  return render(<Avatar config={fullConfig} customSize={100} />);
}

// ============================================================================
// FACE SHAPE TESTS
// ============================================================================

describe('Avatar FaceShape Visual Regression', () => {
  Object.values(FaceShape).forEach(shape => {
    it(`renders FaceShape.${shape} correctly`, () => {
      const { toJSON } = renderAvatar({ faceShape: shape });
      expect(toJSON()).toMatchSnapshot();
    });
  });
});

// ============================================================================
// EYE STYLE TESTS
// ============================================================================

describe('Avatar EyeStyle Visual Regression', () => {
  Object.values(EyeStyle).forEach(style => {
    it(`renders EyeStyle.${style} correctly`, () => {
      const { toJSON } = renderAvatar({ eyeStyle: style });
      expect(toJSON()).toMatchSnapshot();
    });
  });
});

// ============================================================================
// EYELASH STYLE TESTS
// ============================================================================

describe('Avatar EyelashStyle Visual Regression', () => {
  Object.values(EyelashStyle).forEach(style => {
    it(`renders EyelashStyle.${style} correctly`, () => {
      const { toJSON } = renderAvatar({ eyelashStyle: style });
      expect(toJSON()).toMatchSnapshot();
    });
  });
});

// ============================================================================
// EYEBROW STYLE TESTS
// ============================================================================

describe('Avatar EyebrowStyle Visual Regression', () => {
  Object.values(EyebrowStyle).forEach(style => {
    it(`renders EyebrowStyle.${style} correctly`, () => {
      const { toJSON } = renderAvatar({ eyebrowStyle: style });
      expect(toJSON()).toMatchSnapshot();
    });
  });
});

// ============================================================================
// NOSE STYLE TESTS
// ============================================================================

describe('Avatar NoseStyle Visual Regression', () => {
  Object.values(NoseStyle).forEach(style => {
    it(`renders NoseStyle.${style} correctly`, () => {
      const { toJSON } = renderAvatar({ noseStyle: style });
      expect(toJSON()).toMatchSnapshot();
    });
  });
});

// ============================================================================
// MOUTH STYLE TESTS
// ============================================================================

describe('Avatar MouthStyle Visual Regression', () => {
  Object.values(MouthStyle).forEach(style => {
    it(`renders MouthStyle.${style} correctly`, () => {
      const { toJSON } = renderAvatar({ mouthStyle: style });
      expect(toJSON()).toMatchSnapshot();
    });
  });
});

// ============================================================================
// HAIR STYLE TESTS (Grouped by category for manageability)
// ============================================================================

describe('Avatar HairStyle Visual Regression - Short', () => {
  const shortStyles = Object.values(HairStyle).filter(s => s.startsWith('short_'));
  shortStyles.forEach(style => {
    it(`renders HairStyle.${style} correctly`, () => {
      const { toJSON } = renderAvatar({ hairStyle: style });
      expect(toJSON()).toMatchSnapshot();
    });
  });
});

describe('Avatar HairStyle Visual Regression - Medium', () => {
  const mediumStyles = Object.values(HairStyle).filter(s => s.startsWith('medium_'));
  mediumStyles.forEach(style => {
    it(`renders HairStyle.${style} correctly`, () => {
      const { toJSON } = renderAvatar({ hairStyle: style });
      expect(toJSON()).toMatchSnapshot();
    });
  });
});

describe('Avatar HairStyle Visual Regression - Long', () => {
  const longStyles = Object.values(HairStyle).filter(s => s.startsWith('long_'));
  longStyles.forEach(style => {
    it(`renders HairStyle.${style} correctly`, () => {
      const { toJSON } = renderAvatar({ hairStyle: style });
      expect(toJSON()).toMatchSnapshot();
    });
  });
});

describe('Avatar HairStyle Visual Regression - Special', () => {
  const specialStyles = Object.values(HairStyle).filter(
    s => !s.startsWith('short_') && !s.startsWith('medium_') && !s.startsWith('long_')
  );
  specialStyles.forEach(style => {
    it(`renders HairStyle.${style} correctly`, () => {
      const { toJSON } = renderAvatar({ hairStyle: style });
      expect(toJSON()).toMatchSnapshot();
    });
  });
});

// ============================================================================
// FACIAL HAIR TESTS
// ============================================================================

describe('Avatar FacialHairStyle Visual Regression', () => {
  Object.values(FacialHairStyle).forEach(style => {
    it(`renders FacialHairStyle.${style} correctly`, () => {
      const { toJSON } = renderAvatar({ facialHair: style });
      expect(toJSON()).toMatchSnapshot();
    });
  });
});

// ============================================================================
// FACE DETAILS TESTS
// ============================================================================

describe('Avatar FreckleStyle Visual Regression', () => {
  Object.values(FreckleStyle).forEach(style => {
    it(`renders FreckleStyle.${style} correctly`, () => {
      const { toJSON } = renderAvatar({ freckles: style });
      expect(toJSON()).toMatchSnapshot();
    });
  });
});

describe('Avatar WrinkleStyle Visual Regression', () => {
  Object.values(WrinkleStyle).forEach(style => {
    it(`renders WrinkleStyle.${style} correctly`, () => {
      const { toJSON } = renderAvatar({ wrinkles: style });
      expect(toJSON()).toMatchSnapshot();
    });
  });
});

describe('Avatar CheekStyle Visual Regression', () => {
  Object.values(CheekStyle).forEach(style => {
    it(`renders CheekStyle.${style} correctly`, () => {
      const { toJSON } = renderAvatar({ cheekStyle: style });
      expect(toJSON()).toMatchSnapshot();
    });
  });
});

describe('Avatar EyeBagsStyle Visual Regression', () => {
  Object.values(EyeBagsStyle).forEach(style => {
    it(`renders EyeBagsStyle.${style} correctly`, () => {
      const { toJSON } = renderAvatar({ eyeBags: style });
      expect(toJSON()).toMatchSnapshot();
    });
  });
});

// ============================================================================
// MAKEUP TESTS
// ============================================================================

describe('Avatar EyeshadowStyle Visual Regression', () => {
  Object.values(EyeshadowStyle).forEach(style => {
    it(`renders EyeshadowStyle.${style} correctly`, () => {
      const { toJSON } = renderAvatar({ eyeshadowStyle: style });
      expect(toJSON()).toMatchSnapshot();
    });
  });
});

describe('Avatar EyelinerStyle Visual Regression', () => {
  Object.values(EyelinerStyle).forEach(style => {
    it(`renders EyelinerStyle.${style} correctly`, () => {
      const { toJSON } = renderAvatar({ eyelinerStyle: style });
      expect(toJSON()).toMatchSnapshot();
    });
  });
});

describe('Avatar LipstickStyle Visual Regression', () => {
  Object.values(LipstickStyle).forEach(style => {
    it(`renders LipstickStyle.${style} correctly`, () => {
      const { toJSON } = renderAvatar({ lipstickStyle: style });
      expect(toJSON()).toMatchSnapshot();
    });
  });
});

describe('Avatar BlushStyle Visual Regression', () => {
  Object.values(BlushStyle).forEach(style => {
    it(`renders BlushStyle.${style} correctly`, () => {
      const { toJSON } = renderAvatar({ blushStyle: style });
      expect(toJSON()).toMatchSnapshot();
    });
  });
});

// ============================================================================
// ACCESSORY TESTS (Grouped)
// ============================================================================

describe('Avatar AccessoryStyle Visual Regression - Eyewear', () => {
  const eyewearStyles = Object.values(AccessoryStyle).filter(
    s => s.includes('glasses') || s.includes('sunglasses') || s === 'monocle' || s === 'eyepatch'
  );
  eyewearStyles.forEach(style => {
    it(`renders AccessoryStyle.${style} correctly`, () => {
      const { toJSON } = renderAvatar({ accessory: style });
      expect(toJSON()).toMatchSnapshot();
    });
  });
});

describe('Avatar AccessoryStyle Visual Regression - Earrings', () => {
  const earringStyles = Object.values(AccessoryStyle).filter(s => s.includes('earring'));
  earringStyles.forEach(style => {
    it(`renders AccessoryStyle.${style} correctly`, () => {
      const { toJSON } = renderAvatar({ accessory: style });
      expect(toJSON()).toMatchSnapshot();
    });
  });
});

describe('Avatar AccessoryStyle Visual Regression - Headwear', () => {
  const headwearStyles = Object.values(AccessoryStyle).filter(
    s => s.includes('hat') || s.includes('beanie') || s.includes('headband')
  );
  headwearStyles.forEach(style => {
    it(`renders AccessoryStyle.${style} correctly`, () => {
      const { toJSON } = renderAvatar({ accessory: style });
      expect(toJSON()).toMatchSnapshot();
    });
  });
});

// ============================================================================
// CLOTHING TESTS (Grouped)
// ============================================================================

describe('Avatar ClothingStyle Visual Regression - T-Shirts', () => {
  const tshirtStyles = Object.values(ClothingStyle).filter(s => s.includes('tshirt') || s === 'vneck');
  tshirtStyles.forEach(style => {
    it(`renders ClothingStyle.${style} correctly`, () => {
      const { toJSON } = renderAvatar({ clothing: style });
      expect(toJSON()).toMatchSnapshot();
    });
  });
});

describe('Avatar ClothingStyle Visual Regression - Formal', () => {
  const formalStyles = Object.values(ClothingStyle).filter(
    s => s.includes('blazer') || s.includes('suit') || s.includes('dress_shirt')
  );
  formalStyles.forEach(style => {
    it(`renders ClothingStyle.${style} correctly`, () => {
      const { toJSON } = renderAvatar({ clothing: style });
      expect(toJSON()).toMatchSnapshot();
    });
  });
});

describe('Avatar ClothingStyle Visual Regression - Casual', () => {
  const casualStyles = Object.values(ClothingStyle).filter(
    s => s.includes('hoodie') || s.includes('sweater') || s.includes('cardigan')
  );
  casualStyles.forEach(style => {
    it(`renders ClothingStyle.${style} correctly`, () => {
      const { toJSON } = renderAvatar({ clothing: style });
      expect(toJSON()).toMatchSnapshot();
    });
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Avatar Layer Order Integration', () => {
  it('renders hair on top of face correctly', () => {
    const { toJSON } = renderAvatar({
      faceShape: FaceShape.OVAL,
      hairStyle: HairStyle.SHORT_TEXTURED_CROP,
    });
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders glasses on top of everything', () => {
    const { toJSON } = renderAvatar({
      hairStyle: HairStyle.LONG_STRAIGHT,
      accessory: AccessoryStyle.GLASSES_ROUND,
    });
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders beard below hair correctly', () => {
    const { toJSON } = renderAvatar({
      hairStyle: HairStyle.SHORT_SIDE_PART,
      facialHair: FacialHairStyle.FULL_BEARD,
    });
    expect(toJSON()).toMatchSnapshot();
  });
});

describe('Avatar Proportion Combinations', () => {
  it('renders max proportions without clipping', () => {
    const { toJSON } = renderAvatar({
      facialProportions: {
        eyeSpacing: 1,
        eyeHeight: 1,
        eyeSize: 1,
        eyebrowHeight: 1,
        eyebrowSpacing: 1,
        eyebrowThickness: 1,
        eyebrowArch: 1,
        eyebrowLength: 1,
        eyebrowTilt: 1,
        nosePosition: 1,
        noseSize: 1,
        mouthPosition: 1,
        mouthSize: 1,
        faceWidth: 1,
        jawWidth: 1,
        foreheadHeight: 1,
        chinShape: 1,
      },
    });
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders min proportions without clipping', () => {
    const { toJSON } = renderAvatar({
      facialProportions: {
        eyeSpacing: -1,
        eyeHeight: -1,
        eyeSize: -1,
        eyebrowHeight: -1,
        eyebrowSpacing: -1,
        eyebrowThickness: -1,
        eyebrowArch: -1,
        eyebrowLength: -1,
        eyebrowTilt: -1,
        nosePosition: -1,
        noseSize: -1,
        mouthPosition: -1,
        mouthSize: -1,
        faceWidth: -1,
        jawWidth: -1,
        foreheadHeight: -1,
        chinShape: -1,
      },
    });
    expect(toJSON()).toMatchSnapshot();
  });
});

describe('Avatar Size Variants', () => {
  const sizes = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'] as const;

  sizes.forEach(size => {
    it(`renders at size ${size} correctly`, () => {
      const { toJSON } = render(<Avatar config={DEFAULT_MALE_CONFIG} size={size} />);
      expect(toJSON()).toMatchSnapshot();
    });
  });
});

// ============================================================================
// EDGE CASE TESTS
// ============================================================================

describe('Avatar Edge Cases', () => {
  it('renders with null config (uses defaults)', () => {
    const { toJSON } = render(<Avatar config={null} />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders with undefined config (uses defaults)', () => {
    const { toJSON } = render(<Avatar config={undefined} />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders with empty partial config', () => {
    const { toJSON } = render(<Avatar config={{} as AvatarConfig} />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders female default config', () => {
    const { toJSON } = render(<Avatar config={DEFAULT_FEMALE_CONFIG} />);
    expect(toJSON()).toMatchSnapshot();
  });
});

// ============================================================================
// FULL BODY AVATAR SNAPSHOT TESTS
// ============================================================================

describe('FullBodyAvatar snapshots', () => {
  // Test each body type renders without error
  Object.values(BodyType).forEach(bodyType => {
    it(`renders ${bodyType} body type`, () => {
      const config = { ...DEFAULT_MALE_CONFIG, bodyType };
      const tree = renderer.create(<FullBodyAvatar config={config} size="md" />);
      expect(tree.toJSON()).toBeTruthy();
    });
  });

  // Test each clothing style with each body type
  Object.values(ClothingStyle).forEach(clothing => {
    Object.values(BodyType).forEach(bodyType => {
      it(`renders ${clothing} on ${bodyType}`, () => {
        const config = { ...DEFAULT_MALE_CONFIG, bodyType, clothing };
        const tree = renderer.create(<FullBodyAvatar config={config} size="md" />);
        expect(tree.toJSON()).toBeTruthy();
      });
    });
  });

  // Test each arm pose
  Object.values(ArmPose).forEach(armPose => {
    it(`renders ${armPose} arm pose`, () => {
      const config = { ...DEFAULT_MALE_CONFIG, armPose };
      const tree = renderer.create(<FullBodyAvatar config={config} size="md" />);
      expect(tree.toJSON()).toBeTruthy();
    });
  });

  // Test each leg pose
  Object.values(LegPose).forEach(legPose => {
    it(`renders ${legPose} leg pose`, () => {
      const config = { ...DEFAULT_MALE_CONFIG, legPose };
      const tree = renderer.create(<FullBodyAvatar config={config} size="md" />);
      expect(tree.toJSON()).toBeTruthy();
    });
  });

  // Test shoe styles
  Object.values(ShoeStyle).forEach(shoeStyle => {
    it(`renders ${shoeStyle} shoe style`, () => {
      const config = { ...DEFAULT_MALE_CONFIG, shoeStyle };
      const tree = renderer.create(<FullBodyAvatar config={config} size="md" />);
      expect(tree.toJSON()).toBeTruthy();
    });
  });
});
