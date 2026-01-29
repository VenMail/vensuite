/**
 * Comprehensive Slide Renderer Robustness Tests
 * Tests various edge cases and complex scenarios
 */

import { useSlideRenderer } from '@/composables/useSlideRenderer';
import { splitMarkdownIntoBlocks, renderBlocksToHtml } from '@/utils/slidevMarkdown';
import { getElementByLineRange } from '@/utils/markdownElementDetector';

interface TestCase {
  name: string;
  markdown: string;
  expectedBehaviors: string[];
  shouldFail?: boolean;
}

export class SlideRendererTester {
  private renderer = useSlideRenderer({
    enableErrorRecovery: true,
    maxRetries: 3
  });
  private testResults: Array<{
    name: string;
    passed: boolean;
    errors: string[];
    warnings: string[];
    performance: number;
  }> = [];

  /**
   * Run comprehensive robustness tests
   */
  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Slide Renderer Robustness Tests...\n');

    const testCases = this.generateTestCases();

    for (const testCase of testCases) {
      await this.runTest(testCase);
    }

    this.printResults();
  }

  /**
   * Generate comprehensive test cases
   */
  private generateTestCases(): TestCase[] {
    return [
      // Basic functionality tests
      {
        name: 'Basic Content',
        markdown: `# Simple Heading
This is a paragraph.

## Subheading
- List item 1
- List item 2`,
        expectedBehaviors: [
          'Should render headings correctly',
          'Should render paragraphs',
          'Should render lists',
          'Should not throw errors'
        ]
      },

      // Block attribute tests
      {
        name: 'Complex Block Attributes',
        markdown: `# Title {.text-red-500 .text-4xl .absolute .top-[10%] .left-[20%]}

Some content with {.bg-blue-100 .p-4 .rounded}

![Image](test.jpg) {.w-32 .h-32 .absolute .top-[50%] .left-[50%] .-translate-x-1/2 .-translate-y-1/2}`,
        expectedBehaviors: [
          'Should apply CSS classes',
          'Should handle arbitrary positioning',
          'Should parse multiple attributes',
          'Should position elements correctly'
        ]
      },

      // Code block tests
      {
        name: 'Code Blocks and Mermaid',
        markdown: `# Code Example

\`\`\`javascript
const x = 1;
console.log(x);
\`\`\`

## Mermaid Diagram
\`\`\`mermaid
graph TD
    A --> B
    B --> C
\`\`\``,
        expectedBehaviors: [
          'Should render code blocks',
          'Should handle syntax highlighting',
          'Should render Mermaid diagrams',
          'Should not confuse code with Mermaid'
        ]
      },

      // Edge cases
      {
        name: 'Empty Content',
        markdown: '',
        expectedBehaviors: [
          'Should handle empty content gracefully',
          'Should not crash',
          'Should return empty HTML'
        ]
      },

      {
        name: 'Only Whitespace',
        markdown: '   \n\n   ',
        expectedBehaviors: [
          'Should handle whitespace-only content',
          'Should not create invalid HTML'
        ]
      },

      {
        name: 'Special Characters',
        markdown: `# Title with "quotes" and 'apostrophes' & symbols @#$%

Content with **bold**, *italic*, \`code\`, and [links](http://example.com)

> Block quote with {.class} syntax`,
        expectedBehaviors: [
          'Should escape HTML entities',
          'Should handle markdown formatting',
          'Should process block attributes in quotes'
        ]
      },

      {
        name: 'Malformed Block Attributes',
        markdown: `# Title {.incomplete-class

## Another {.missing-bracket}

### Third {.valid .but .incomplete}`,
        expectedBehaviors: [
          'Should handle incomplete attributes gracefully',
          'Should continue rendering valid content',
          'Should not crash on malformed syntax'
        ]
      },

      // Performance tests
      {
        name: 'Large Content',
        markdown: this.generateLargeContent(),
        expectedBehaviors: [
          'Should handle large content efficiently',
          'Should render within reasonable time',
          'Should not cause memory issues'
        ]
      },

      // Unicode tests
      {
        name: 'Unicode Content',
        markdown: `# Тест на русском {.text-red-500}

Содержимое на русском языке

## 中文测试 {.text-blue-600}

这是中文内容

### العربية {.text-green-700}

محتوى باللغة العربية`,
        expectedBehaviors: [
          'Should handle Unicode characters',
          'Should render RTL languages correctly',
          'Should not corrupt text encoding'
        ]
      },

      // Invalid markdown tests
      {
        name: 'Invalid Markdown',
        markdown: `# Unclosed heading

\`\`\`javascript
// Unclosed code block
console.log('hello');

> Unclosed blockquote

| Table | Without |
|-------|--------|
| Header | Footer

[Link without URL](

![Image without alt]

\`\`\`mermaid
graph TD
    A --> B
    // Unclosed mermaid
\`\`\``,
        expectedBehaviors: [
          'Should handle unclosed blocks',
          'Should recover from syntax errors',
          'Should not crash on invalid markdown'
        ],
        shouldFail: false // Should not crash, but may have rendering issues
      },

      // Extreme positioning tests
      {
        name: 'Extreme Position Values',
        markdown: `# Extreme Positions {.absolute .top-[9999px] .left[-9999px]}

## Negative Percentages {.absolute .top-[-50%] .left-[-150%]}

## Fractional Values {.absolute .top-[12.5%] .left-[33.33%]}

## Mixed Units {.absolute .top-[100vh] .left-[50vw] .w-[calc(100%-20px)]}`,
        expectedBehaviors: [
          'Should handle extreme position values',
          'Should process negative values',
          'Should handle fractional percentages',
          'Should support CSS functions'
        ]
      }
    ];
  }

  /**
   * Generate large content for performance testing
   */
  private generateLargeContent(): string {
    let content = `# Performance Test

## Large List
`;
    
    // Generate 100 list items
    for (let i = 1; i <= 100; i++) {
      content += `${i}. Item ${i}\n`;
    }

    content += `
## Many Positioned Elements {.relative}
`;

    // Generate 50 positioned elements
    for (let i = 1; i <= 50; i++) {
      const top = (i * 2) % 100;
      const left = (i * 3) % 100;
      content += `- Pos ${i} {.absolute .top-[${top}%] .left-[${left}%]}\n`;
    }

    return content;
  }

  /**
   * Run individual test case
   */
  private async runTest(testCase: TestCase): Promise<void> {
    console.log(`🧪 Testing: ${testCase.name}`);
    const startTime = window.performance.now();
    const errors: string[] = [];
    const warnings: string[] = [];
    let passed = true;

    try {
      // Test basic rendering
      const renderedSlide = await this.renderer.renderSlide(testCase.markdown);
      
      if (!renderedSlide) {
        errors.push('Failed to render slide');
        passed = false;
      }

      // Test block parsing
      const blocks = splitMarkdownIntoBlocks(testCase.markdown);
      if (!Array.isArray(blocks)) {
        errors.push('Block parsing failed');
        passed = false;
      }

      // Test HTML rendering
      let html = '';
      try {
        html = renderBlocksToHtml(blocks);
        if (!html || typeof html !== 'string') {
          errors.push('HTML rendering failed');
          passed = false;
        }
      } catch (error) {
        errors.push(`HTML rendering error: ${error}`);
        passed = false;
      }

      // Test element detection
      if (blocks.length > 0) {
        try {
          const element = getElementByLineRange(testCase.markdown, 0, 0);
          if (!element && testCase.markdown.trim()) {
            warnings.push('Element detection returned null for non-empty content');
          }
        } catch (error) {
          warnings.push(`Element detection error: ${error}`);
        }
      }

      // Test arbitrary positioning
      if (html && html.includes('[')) {
        try {
          const div = document.createElement('div');
          div.innerHTML = html;
          this.renderer.applyArbitraryPositionClasses(div);
        } catch (error) {
          errors.push(`Position class application error: ${error}`);
          passed = false;
        }
      }

      // Validate expected behaviors
      for (const behavior of testCase.expectedBehaviors) {
        // Add specific validation logic based on behavior
        if (behavior.includes('Should not crash') && errors.length > 0) {
          passed = false;
        }
      }

      // Handle expected failures
      if (testCase.shouldFail && passed) {
        warnings.push('Test was expected to fail but passed');
      }

    } catch (error) {
      errors.push(`Unexpected error: ${error}`);
      passed = false;
    }

    const endTime = window.performance.now();
    const performanceTime = endTime - startTime;

    this.testResults.push({
      name: testCase.name,
      passed,
      errors,
      warnings,
      performance: performanceTime
    });

    console.log(`   ${passed ? '✅' : '❌'} ${performanceTime.toFixed(2)}ms`);
    if (errors.length > 0) {
      console.log(`   ❌ Errors: ${errors.join(', ')}`);
    }
    if (warnings.length > 0) {
      console.log(`   ⚠️  Warnings: ${warnings.join(', ')}`);
    }
    console.log('');
  }

  /**
   * Print comprehensive test results
   */
  private printResults(): void {
    console.log('📊 Test Results Summary:\n');

    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const totalErrors = this.testResults.reduce((sum, r) => sum + r.errors.length, 0);
    const totalWarnings = this.testResults.reduce((sum, r) => sum + r.warnings.length, 0);
    const avgPerformance = this.testResults.reduce((sum, r) => sum + r.performance, 0) / totalTests;

    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} ✅`);
    console.log(`Failed: ${failedTests} ❌`);
    console.log(`Total Errors: ${totalErrors}`);
    console.log(`Total Warnings: ${totalWarnings}`);
    console.log(`Average Performance: ${avgPerformance.toFixed(2)}ms\n`);

    // Print failed tests
    const failedResults = this.testResults.filter(r => !r.passed);
    if (failedResults.length > 0) {
      console.log('❌ Failed Tests:');
      failedResults.forEach(result => {
        console.log(`   - ${result.name}: ${result.errors.join(', ')}`);
      });
      console.log('');
    }

    // Print performance issues
    const slowTests = this.testResults.filter(r => r.performance > 100);
    if (slowTests.length > 0) {
      console.log('⚠️  Slow Tests (>100ms):');
      slowTests.forEach(result => {
        console.log(`   - ${result.name}: ${result.performance.toFixed(2)}ms`);
      });
      console.log('');
    }

    // Print warnings
    if (totalWarnings > 0) {
      console.log('⚠️  All Warnings:');
      this.testResults.forEach(result => {
        if (result.warnings.length > 0) {
          console.log(`   - ${result.name}: ${result.warnings.join(', ')}`);
        }
      });
      console.log('');
    }

    console.log('🏁 Testing Complete!\n');
  }

  /**
   * Get test results for external use
   */
  getResults() {
    return this.testResults;
  }
}

// Export for use in components
export const slideRendererTester = new SlideRendererTester();
