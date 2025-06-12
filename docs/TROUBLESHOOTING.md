# Troubleshooting Guide

Common issues and solutions for the WordPlay project. This guide helps resolve development, build, and runtime problems.

## Development Server Issues

### Port 5173 Already in Use

**Problem**: `Error: listen EADDRINUSE: address already in use :::5173`

**Solutions**:
```bash
# Option 1: Kill the process using the port
lsof -ti:5173 | xargs kill -9

# Option 2: Use a different port
npm run dev -- --port 3000

# Option 3: Find and kill the specific process
lsof -i :5173
kill -9 <PID>
```

### Hot Module Replacement Not Working

**Problem**: Changes not reflecting in browser

**Solutions**:
1. **Hard refresh**: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
2. **Clear browser cache**: Dev tools → Network → Disable cache
3. **Restart dev server**: Stop with Ctrl+C, then `npm run dev`
4. **Check file watchers**: Ensure file system watchers aren't exhausted

### Development Server Won't Start

**Problem**: Server fails to start with various errors

**Solutions**:
```bash
# Check Node.js version (requires v18+)
node --version

# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for port conflicts
netstat -tulpn | grep :5173
```

## Build and Compilation Issues

### TypeScript Compilation Errors

**Problem**: `tsc` command fails with type errors

**Common Solutions**:
```bash
# Check for type errors
npm run build

# Common fixes:
# 1. Missing type definitions
npm install @types/node @types/react @types/react-dom

# 2. Outdated TypeScript
npm update typescript

# 3. Clear TypeScript cache
rm -rf node_modules/.cache
```

**Specific Type Errors**:
- **Module not found**: Check import paths and file extensions
- **Property does not exist**: Verify interface definitions
- **Cannot find declaration file**: Install missing @types packages

### ESLint Errors

**Problem**: Linting fails with rule violations

**Solutions**:
```bash
# Auto-fix ESLint issues
npm run lint -- --fix

# Check specific files
npx eslint src/components/MyComponent.tsx

# Disable specific rules (use sparingly)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
```

### Build Bundle Size Issues

**Problem**: Bundle size exceeds limits

**Solutions**:
1. **Analyze bundle**: Use `npm run build` and check output
2. **Remove unused imports**: Clean up import statements
3. **Code splitting**: Implement lazy loading for large components
4. **Tree shaking**: Ensure imports are ES modules compatible

## Test Issues

### Tests Failing

**Problem**: `npm test` shows failing tests

**Debugging Steps**:
```bash
# Run tests in watch mode for debugging
npm run test:watch

# Run specific test file
npm test -- dictionary.test.ts

# Run tests with verbose output
npm test -- --reporter=verbose

# Run tests with coverage
npm test -- --coverage
```

**Common Test Failures**:
- **Import errors**: Check file paths and module resolution
- **Async test timeouts**: Increase timeout or fix async handling
- **Mock issues**: Verify mock implementations match interfaces

### Test Environment Issues

**Problem**: Tests pass locally but fail in CI

**Solutions**:
1. **Check Node.js version**: Ensure CI uses same version as local
2. **Environment variables**: Verify test environment setup
3. **File system differences**: Check for case-sensitive path issues
4. **Timing issues**: Add proper async/await handling

## Game Engine Issues

### Dictionary Loading Problems

**Problem**: Dictionary fails to load or words not recognized

**Solutions**:
```bash
# Check dictionary file exists
ls -la packages/engine/enable1.txt

# Test dictionary loading in terminal
npm run play

# Verify word count (should be 172,819)
wc -l packages/engine/enable1.txt
```

**Browser Dictionary Issues**:
- **HTTP fetch fails**: Check network tab in dev tools
- **CORS errors**: Ensure dictionary is served correctly
- **Fallback not working**: Verify fallback word list is loaded

### Bot AI Not Working

**Problem**: Bot doesn't make moves or crashes

**Debugging**:
```bash
# Test bot in terminal game
npm run play

# Check bot test suite
npm test -- bot.test.ts

# Enable debug logging (if available)
DEBUG=bot npm run play
```

**Common Bot Issues**:
- **No valid moves**: Bot correctly passes when no moves available
- **Performance issues**: Check if dictionary is loaded properly
- **Infinite loops**: Verify move generation logic

### Scoring Calculation Errors

**Problem**: Scores don't match expected values

**Debugging**:
```bash
# Test scoring module
npm test -- scoring.test.ts

# Use terminal game for manual verification
npm run play

# Check specific scoring scenarios
node -e "
const { calculateScore } = require('./packages/engine/scoring.ts');
console.log(calculateScore('CAT', 'CATS', ['T']));
"
```

## Web Interface Issues

### Drag and Drop Not Working

**Problem**: Letters can't be dragged or dropped

**Solutions**:
1. **Mobile devices**: Ensure touch events are properly handled
2. **Browser compatibility**: Test in different browsers
3. **Event conflicts**: Check for event.preventDefault() issues
4. **CSS interference**: Verify drag-related CSS properties

**Debug Steps**:
```javascript
// Check in browser console
console.log('Touch events supported:', 'ontouchstart' in window);
console.log('Drag events supported:', 'ondragstart' in window);
```

### Theme System Issues

**Problem**: Themes not applying or switching

**Solutions**:
1. **CSS custom properties**: Check if browser supports CSS variables
2. **Theme context**: Verify ThemeProvider is wrapping components
3. **CSS specificity**: Ensure theme styles have proper specificity
4. **Cache issues**: Hard refresh to clear CSS cache

### Responsive Design Problems

**Problem**: Layout breaks on certain screen sizes

**Debugging**:
1. **Use browser dev tools**: Test different viewport sizes
2. **Check breakpoints**: Verify CSS media queries
3. **Touch targets**: Ensure minimum 44px touch targets
4. **Overflow issues**: Check for horizontal scrolling

## Performance Issues

### Slow Loading

**Problem**: App takes too long to load

**Solutions**:
1. **Bundle analysis**: Check bundle size with `npm run build`
2. **Network throttling**: Test with slow network in dev tools
3. **Image optimization**: Ensure images are properly optimized
4. **Code splitting**: Implement lazy loading for routes

### Memory Leaks

**Problem**: Browser memory usage increases over time

**Debugging**:
1. **React DevTools**: Check for unnecessary re-renders
2. **Memory tab**: Use browser dev tools memory profiler
3. **Event listeners**: Ensure proper cleanup in useEffect
4. **State management**: Check for state accumulation

### Animation Performance

**Problem**: Animations are choppy or slow

**Solutions**:
1. **Use CSS transforms**: Prefer transform over changing layout properties
2. **Hardware acceleration**: Use `will-change` CSS property
3. **Reduce motion**: Respect user's reduced motion preferences
4. **Frame rate**: Target 60fps for smooth animations

## Browser Compatibility Issues

### Safari-Specific Issues

**Common Problems**:
- **Date handling**: Safari has stricter date parsing
- **CSS features**: Some modern CSS features not supported
- **Touch events**: Different touch event handling

**Solutions**:
```css
/* Safari-specific CSS */
@supports (-webkit-touch-callout: none) {
  /* Safari-only styles */
}
```

### Mobile Browser Issues

**Common Problems**:
- **Viewport scaling**: Zoom behavior on input focus
- **Touch events**: Different touch event implementations
- **Performance**: Slower JavaScript execution

**Solutions**:
```html
<!-- Prevent zoom on input focus -->
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
```

## Environment and Setup Issues

### Node.js Version Problems

**Problem**: Features not working due to old Node.js

**Solution**:
```bash
# Check current version
node --version

# Update Node.js (using nvm)
nvm install 23.4.0
nvm use 23.4.0

# Or download from nodejs.org
```

### Package Installation Issues

**Problem**: `npm install` fails

**Solutions**:
```bash
# Clear npm cache
npm cache clean --force

# Delete lock file and node_modules
rm -rf node_modules package-lock.json
npm install

# Use different registry if needed
npm install --registry https://registry.npmjs.org/

# Check for permission issues
sudo chown -R $(whoami) ~/.npm
```

### Git and Version Control Issues

**Problem**: Git-related development issues

**Solutions**:
```bash
# Reset to clean state
git stash
git checkout main
git pull origin main

# Fix line ending issues
git config core.autocrlf true  # Windows
git config core.autocrlf input # Mac/Linux

# Clean untracked files
git clean -fd
```

## Debugging Tools and Techniques

### Browser Developer Tools

**Essential Tabs**:
1. **Console**: JavaScript errors and logs
2. **Network**: HTTP requests and responses
3. **Elements**: DOM inspection and CSS debugging
4. **Sources**: JavaScript debugging with breakpoints
5. **Performance**: Performance profiling
6. **Application**: Local storage, service workers

### React Developer Tools

**Installation**:
- Chrome: Install React Developer Tools extension
- Firefox: Install React Developer Tools add-on

**Usage**:
- **Components tab**: Inspect React component tree
- **Profiler tab**: Performance profiling for React

### Terminal Debugging

**Useful Commands**:
```bash
# Check running processes
ps aux | grep node

# Monitor file changes
watch -n 1 'ls -la src/components/'

# Check network connectivity
curl -I http://localhost:5173

# Monitor system resources
top -p $(pgrep node)
```

## Getting Additional Help

### Documentation Resources

1. **Project Documentation**: Check other files in `/docs/`
2. **Error Messages**: Read error messages carefully
3. **Stack Traces**: Follow the call stack to find root cause
4. **Browser Console**: Check for additional error details

### Community Resources

1. **React Documentation**: https://react.dev/
2. **Vite Documentation**: https://vitejs.dev/
3. **TypeScript Handbook**: https://www.typescriptlang.org/docs/
4. **MDN Web Docs**: https://developer.mozilla.org/

### Reporting Issues

**Before Reporting**:
1. Check this troubleshooting guide
2. Search existing issues
3. Try to reproduce the problem
4. Gather relevant information

**Information to Include**:
- Operating system and version
- Node.js version (`node --version`)
- Browser and version
- Steps to reproduce
- Error messages and stack traces
- Expected vs actual behavior

---

*If you can't find a solution here, check the other documentation files or create a detailed issue report.* 