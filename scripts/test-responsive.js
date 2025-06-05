#!/usr/bin/env node

/**
 * Responsive Design Test Script
 * 
 * This script helps verify that the WordPlay game works correctly
 * across different browsers and screen sizes.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configurations for different screen sizes
const SCREEN_SIZES = [
  { name: 'iPhone SE', width: 375, height: 667, type: 'mobile' },
  { name: 'iPhone 12', width: 390, height: 844, type: 'mobile' },
  { name: 'iPhone 12 Pro Max', width: 428, height: 926, type: 'mobile' },
  { name: 'iPad Mini', width: 768, height: 1024, type: 'tablet' },
  { name: 'iPad Pro', width: 1024, height: 1366, type: 'tablet' },
  { name: 'Desktop Small', width: 1280, height: 720, type: 'desktop' },
  { name: 'Desktop Large', width: 1920, height: 1080, type: 'desktop' },
  { name: 'Ultrawide', width: 2560, height: 1440, type: 'desktop' }
];

// Browsers to test
const BROWSERS = [
  'Chrome',
  'Firefox', 
  'Safari',
  'Edge'
];

// Test checklist
const TEST_CHECKLIST = {
  layout: [
    'Game board centers properly',
    'No horizontal scrolling',
    'All elements visible without scrolling',
    'Touch targets meet 44px minimum',
    'Text remains readable at all sizes'
  ],
  interaction: [
    'Grid cells respond to touch/click',
    'Theme selector works',
    'Submit button responds correctly',
    'No keyboard navigation (mouse/touch only)',
    'Drag and drop works on touch devices'
  ],
  visual: [
    'Theme colors apply correctly',
    'Typography scales appropriately',
    'Inter Black font loads and displays',
    'High contrast mode supported',
    'Reduced motion preferences respected'
  ],
  performance: [
    'Page loads in under 3 seconds',
    'Smooth animations and transitions',
    'No layout shifts during load',
    'Responsive to orientation changes'
  ]
};

function generateTestReport() {
  const timestamp = new Date().toISOString();
  
  const report = `# Responsive Design Test Report

Generated: ${timestamp}

## Test Environment
- **Node.js Version**: ${process.version}
- **Platform**: ${process.platform}
- **Architecture**: ${process.arch}

## Screen Size Test Matrix

| Device | Width | Height | Type | Status |
|--------|-------|--------|------|--------|
${SCREEN_SIZES.map(size => 
  `| ${size.name} | ${size.width}px | ${size.height}px | ${size.type} | ⏳ Pending |`
).join('\n')}

## Browser Compatibility Matrix

| Browser | Desktop | Tablet | Mobile | Notes |
|---------|---------|--------|--------|-------|
${BROWSERS.map(browser => 
  `| ${browser} | ⏳ Pending | ⏳ Pending | ⏳ Pending | Manual testing required |`
).join('\n')}

## Test Checklist

### Layout Tests
${TEST_CHECKLIST.layout.map(test => `- [ ] ${test}`).join('\n')}

### Interaction Tests  
${TEST_CHECKLIST.interaction.map(test => `- [ ] ${test}`).join('\n')}

### Visual Tests
${TEST_CHECKLIST.visual.map(test => `- [ ] ${test}`).join('\n')}

### Performance Tests
${TEST_CHECKLIST.performance.map(test => `- [ ] ${test}`).join('\n')}

## Manual Testing Instructions

### 1. Desktop Testing (Chrome, Firefox, Safari, Edge)
1. Open http://localhost:5173 in each browser
2. Test at different window sizes by resizing browser
3. Verify all functionality works with mouse interaction
4. Check theme switching works correctly
5. Verify no keyboard navigation is present

### 2. Mobile Testing (Chrome Mobile, Safari Mobile, Firefox Mobile)
1. Open http://localhost:5173 on mobile device or use browser dev tools
2. Test in portrait and landscape orientations
3. Verify touch interactions work correctly
4. Check that touch targets are at least 44px
5. Test drag and drop functionality

### 3. Tablet Testing (iPad Safari, Android Chrome)
1. Open http://localhost:5173 on tablet device
2. Test in both orientations
3. Verify layout adapts appropriately
4. Check touch interactions work smoothly

### 4. Accessibility Testing
1. Test with high contrast mode enabled
2. Test with reduced motion preferences
3. Verify color contrast meets WCAG AA standards
4. Check that no keyboard navigation is present (per design spec)

### 5. Performance Testing
1. Use browser dev tools to measure load times
2. Check for layout shifts during load
3. Verify smooth animations and transitions
4. Test on slower network connections

## Debug Tools

The app includes a responsive design debug panel:
1. Click the 📱 button in the top-right corner
2. Review screen information and test results
3. Check for any failing accessibility tests
4. Verify CSS variables are loading correctly

## Expected Results

### Mobile (< 768px)
- Single column layout
- Reduced spacing and padding
- Touch-friendly grid cells (44px minimum)
- No horizontal scrolling

### Tablet (768px - 1023px)
- Centered layout with max-width
- Appropriate spacing for touch interaction
- Optimized for both orientations

### Desktop (1024px+)
- Centered layout with generous spacing
- Mouse-optimized interactions
- Maximum width constraints for readability

## Common Issues to Check

1. **Horizontal Scrolling**: Should never occur on any device
2. **Touch Target Size**: All interactive elements should be at least 44px
3. **Font Loading**: Inter Black should load and display correctly
4. **Theme Switching**: Should work instantly without page reload
5. **Orientation Changes**: Layout should adapt smoothly
6. **Zoom Levels**: Should work correctly at 50%-200% zoom

## Reporting Issues

If any tests fail, please document:
1. Browser and version
2. Device/screen size
3. Specific issue observed
4. Steps to reproduce
5. Expected vs actual behavior

---

*This report should be updated after manual testing is complete.*
`;

  return report;
}

function main() {
  console.log('🧪 Generating Responsive Design Test Report...\n');
  
  const report = generateTestReport();
  const outputPath = path.join(__dirname, '..', 'docs', 'responsive-test-report.md');
  
  // Ensure docs directory exists
  const docsDir = path.dirname(outputPath);
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, report);
  
  console.log(`✅ Test report generated: ${outputPath}`);
  console.log('\n📋 Next Steps:');
  console.log('1. Start the development server: npm run dev');
  console.log('2. Open http://localhost:5173 in different browsers');
  console.log('3. Use the 📱 debug button to check responsive behavior');
  console.log('4. Test on actual mobile devices if available');
  console.log('5. Update the test report with results');
  
  console.log('\n🎯 Key Areas to Test:');
  console.log('- Touch targets are at least 44px');
  console.log('- No horizontal scrolling on any device');
  console.log('- Theme switching works correctly');
  console.log('- Mouse/touch only interaction (no keyboard)');
  console.log('- Layout adapts to different screen sizes');
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
} 