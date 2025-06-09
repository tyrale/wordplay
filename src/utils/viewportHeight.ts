// Updates the CSS custom property --vh to match the actual viewport height
export function updateViewportHeight() {
  // Get the viewport height
  const vh = window.innerHeight * 0.01;
  // Set the value in the --vh custom property
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}

// Initialize and set up listeners
export function initViewportHeight() {
  // Initial calculation
  updateViewportHeight();

  // Update on resize
  window.addEventListener('resize', updateViewportHeight);
  
  // Update on orientation change
  window.addEventListener('orientationchange', () => {
    // Small delay to ensure the browser has completed any UI adjustments
    setTimeout(updateViewportHeight, 100);
  });

  // Some mobile browsers need an update after page load
  window.addEventListener('load', updateViewportHeight);
  
  // Update after any dynamic toolbar changes (some mobile browsers)
  window.addEventListener('scroll', () => {
    requestAnimationFrame(updateViewportHeight);
  });
} 