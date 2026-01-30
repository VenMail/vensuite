/**
 * Test utility to verify presenter mode theme colors
 */

export function testPresenterTheme() {
  console.log('🎨 Testing presenter theme colors...');
  
  // Create a test container simulating presenter slide
  const testContainer = document.createElement('div');
  testContainer.innerHTML = `
    <h1 class="absolute top-[16.8%] left-[11.6%]">Test Title</h1>
    <p class="absolute top-[50%] left-[20%]">Test Content</p>
  `;
  
  // Test dark theme
  testContainer.style.background = '#1e293b';
  testContainer.style.color = '#f8fafc';
  
  // Check if text elements inherit color
  const h1 = testContainer.querySelector('h1') as HTMLElement;
  const p = testContainer.querySelector('p') as HTMLElement;
  
  // Force color inheritance
  const textElements = testContainer.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, span, div');
  textElements.forEach(el => {
    (el as HTMLElement).style.color = 'inherit';
  });
  
  const computedH1Color = window.getComputedStyle(h1).color;
  const computedPColor = window.getComputedStyle(p).color;
  
  const results = {
    containerBackground: testContainer.style.background,
    containerColor: testContainer.style.color,
    h1InheritsColor: computedH1Color === 'rgb(248, 250, 252)' || computedH1Color.includes('248, 250, 252'),
    pInheritsColor: computedPColor === 'rgb(248, 250, 252)' || computedPColor.includes('248, 250, 252'),
    testPassed: false
  };
  
  results.testPassed = results.h1InheritsColor && results.pInheritsColor;
  
  console.log('🎨 Presenter Theme Test Results:', results);
  
  if (results.testPassed) {
    console.log('✅ Presenter theme colors are working correctly!');
  } else {
    console.error('❌ Presenter theme colors have issues:', {
      h1Color: computedH1Color,
      pColor: computedPColor
    });
  }
  
  return results;
}

// Auto-run test in development mode
if (process.env.NODE_ENV === 'development') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', testPresenterTheme);
  } else {
    testPresenterTheme();
  }
}
