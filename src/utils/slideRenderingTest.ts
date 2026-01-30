/**
 * Test utility to verify slide rendering consistency
 * between preview and presenter modes
 */

import { useSharedSlideRenderer } from '@/composables/useSharedSlideRenderer';

export function testSlideRendering() {
  console.log('🧪 Testing slide rendering consistency...');
  
  // Create a test container
  const testContainer = document.createElement('div');
  testContainer.innerHTML = `
    <h1 class="absolute top-[16.8%] left-[11.6%]">Test Title</h1>
    <p class="absolute top-[50%] left-[20%]">Test Content</p>
  `;
  
  // Initialize shared renderer
  const renderer = useSharedSlideRenderer();
  
  // Apply positioning
  renderer.applyPositionsWithZoom(testContainer, 100);
  
  // Check results
  const h1 = testContainer.querySelector('h1') as HTMLElement;
  const p = testContainer.querySelector('p') as HTMLElement;
  
  const results = {
    h1Positioned: h1.style.position === 'absolute' && h1.style.top === '16.8%' && h1.style.left === '11.6%',
    pPositioned: p.style.position === 'absolute' && p.style.top === '50%' && p.style.left === '20%',
    testPassed: false
  };
  
  results.testPassed = results.h1Positioned && results.pPositioned;
  
  console.log('🧪 Test Results:', results);
  
  if (results.testPassed) {
    console.log('✅ Slide rendering is consistent!');
  } else {
    console.error('❌ Slide rendering has inconsistencies');
  }
  
  return results;
}

// Auto-run test in development mode
if (process.env.NODE_ENV === 'development') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', testSlideRendering);
  } else {
    testSlideRendering();
  }
}
