/**
 * Export System Test
 * Simple test to verify the export system works correctly
 */

import { exportToDocx } from '../export/export';

/**
 * Test the export system with sample HTML
 */
export async function testExportSystem() {
  console.log('🧪 Testing Export System...');
  
  try {
    // Create sample HTML content
    const sampleHTML = `
      <div>
        <h1>Test Document</h1>
        <p>This is a <strong>test</strong> paragraph with <em>formatting</em>.</p>
        <h2>Subheading</h2>
        <p>Another paragraph with <u>underline</u> text.</p>
        <ul>
          <li>First bullet point</li>
          <li>Second bullet point</li>
        </ul>
        <ol>
          <li>First numbered item</li>
          <li>Second numbered item</li>
        </ol>
        <table>
          <tr>
            <th>Header 1</th>
            <th>Header 2</th>
          </tr>
          <tr>
            <td>Cell 1</td>
            <td>Cell 2</td>
          </tr>
        </table>
      </div>
    `;
    
    // Create temporary container
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = sampleHTML;
    
    // Test export
    const blob = await exportToDocx(tempDiv, {
      fileName: 'test-document.docx',
      toDownload: false, // Don't auto-download during test
    });
    
    console.log('✅ Export successful!');
    console.log(`📄 Blob size: ${blob.size} bytes`);
    console.log(`📄 Blob type: ${blob.type}`);
    
    // Verify blob is not empty
    if (blob.size > 0) {
      console.log('✅ Export system is working correctly');
      return true;
    } else {
      console.error('❌ Export failed: Empty blob');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Export test failed:', error);
    return false;
  }
}

/**
 * Test individual parsers
 */
export async function testParsers() {
  console.log('🧪 Testing Individual Parsers...');
  
  const { Exporter } = await import('../export/Exporter');
  
  try {
    // Test paragraph parser
    const paragraphHTML = '<p>Test paragraph with <strong>bold</strong> text</p>';
    const paragraphDiv = document.createElement('div');
    paragraphDiv.innerHTML = paragraphHTML;
    
    const exporter = new Exporter(paragraphDiv.firstElementChild as HTMLElement);
    await exporter.export();
    
    console.log('✅ Paragraph parser test passed');
    
    // Test heading parser
    const headingHTML = '<h1>Test Heading</h1>';
    const headingDiv = document.createElement('div');
    headingDiv.innerHTML = headingHTML;
    
    const headingExporter = new Exporter(headingDiv.firstElementChild as HTMLElement);
    await headingExporter.export();
    
    console.log('✅ Heading parser test passed');
    
    return true;
    
  } catch (error) {
    console.error('❌ Parser test failed:', error);
    return false;
  }
}

/**
 * Run all export tests
 */
export async function runExportTests() {
  console.log('🚀 Running Export System Tests...');
  
  const results = {
    exportSystem: await testExportSystem(),
    parsers: await testParsers(),
  };
  
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    console.log('🎉 All export tests passed!');
  } else {
    console.log('❌ Some tests failed:', results);
  }
  
  return allPassed;
}
