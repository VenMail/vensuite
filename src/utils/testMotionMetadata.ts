/**
 * Test utilities for motion metadata round-trip editing
 */

import { parseSlidevMarkdown, slidesToMarkdown } from './slidevMarkdown';

// Test sample with full motion metadata
const testMarkdown = `---
theme: venmail-pitch
title: "Test Slide"
motion:
  slideVariant: "venmail3d"
  contentVariant: "staggered"
  items:
    - id: "title"
      variant: "fadeIn"
      delay: 0
    - id: "subtitle"
      variant: "slideLeft"
      delay: 200
  staggerGroups:
    - role: "bullet-points"
      delay: 100
background:
  gradient: "from-purple-900 via-purple-800 to-indigo-900"
  animated: true
  particles: true
layout:
  type: "cinematic"
  aspectRatio: "16:9"
---

# Test Title

This is a test slide with motion metadata.

- Bullet point 1
- Bullet point 2
- Bullet point 3
`;

export function testMotionMetadataRoundTrip() {
  console.log('🧪 Testing motion metadata round-trip...');
  
  try {
    // Parse markdown
    const presentation = parseSlidevMarkdown(testMarkdown);
    const slide = presentation.slides[0];
    
    console.log('✅ Parsed slide frontmatter:', slide.frontmatter);
    
    // Verify motion metadata
    const motion = slide.frontmatter?.motion;
    if (!motion) {
      throw new Error('Motion metadata not found');
    }
    
    // Check slide variant
    if (motion.slideVariant !== 'venmail3d') {
      throw new Error(`Expected slideVariant 'venmail3d', got '${motion.slideVariant}'`);
    }
    
    // Check content variant
    if (motion.contentVariant !== 'staggered') {
      throw new Error(`Expected contentVariant 'staggered', got '${motion.contentVariant}'`);
    }
    
    // Check items array
    if (!Array.isArray(motion.items) || motion.items.length !== 2) {
      throw new Error(`Expected 2 items, got ${motion.items?.length || 0}`);
    }
    
    // Check stagger groups
    if (!Array.isArray(motion.staggerGroups) || motion.staggerGroups.length !== 1) {
      throw new Error(`Expected 1 stagger group, got ${motion.staggerGroups?.length || 0}`);
    }
    
    // Check background config
    const background = slide.frontmatter?.background;
    if (!background || background.gradient !== 'from-purple-900 via-purple-800 to-indigo-900') {
      throw new Error('Background gradient not parsed correctly');
    }
    
    // Check layout config
    const layout = slide.frontmatter?.layout;
    if (!layout || layout.type !== 'cinematic') {
      throw new Error('Layout type not parsed correctly');
    }
    
    // Convert back to markdown
    const remarkdown = slidesToMarkdown(presentation);
    console.log('✅ Serialized markdown:', remarkdown);
    
    // Parse again to verify round-trip
    const reparsed = parseSlidevMarkdown(remarkdown);
    const reparsedSlide = reparsed.slides[0];
    
    // Compare key properties
    const originalMotion = slide.frontmatter?.motion;
    const reparsedMotion = reparsedSlide.frontmatter?.motion;
    
    if (JSON.stringify(originalMotion) !== JSON.stringify(reparsedMotion)) {
      throw new Error('Motion metadata changed during round-trip');
    }
    
    console.log('✅ Motion metadata round-trip test passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Motion metadata round-trip test failed:', error);
    return false;
  }
}

// Test legacy migration
export function testLegacyMigration() {
  console.log('🧪 Testing legacy data migration...');
  
  const legacyMarkdown = `---
theme: venmail-pitch
title: "Legacy Slide"
transition: "slideLeft"
background: "from-blue-900 to-purple-900"
layout: "cover"
---

# Legacy Title

This slide uses legacy frontmatter.
`;
  
  try {
    const presentation = parseSlidevMarkdown(legacyMarkdown);
    const slide = presentation.slides[0];
    
    console.log('✅ Parsed legacy slide frontmatter:', slide.frontmatter);
    
    // Check that legacy transition is preserved
    if (slide.frontmatter?.transition !== 'slideLeft') {
      throw new Error('Legacy transition not preserved');
    }
    
    // Check that motion.slideVariant was created
    if (slide.frontmatter?.motion?.slideVariant !== 'slideLeft') {
      throw new Error('Motion slideVariant not created from legacy transition');
    }
    
    console.log('✅ Legacy migration test passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Legacy migration test failed:', error);
    return false;
  }
}

// Run all tests
export function runMotionTests() {
  console.log('🚀 Running motion metadata tests...');
  
  const results = {
    roundTrip: testMotionMetadataRoundTrip(),
    legacyMigration: testLegacyMigration()
  };
  
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  
  console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All motion metadata tests passed!');
  } else {
    console.log('⚠️ Some tests failed. Check the logs above.');
  }
  
  return results;
}
