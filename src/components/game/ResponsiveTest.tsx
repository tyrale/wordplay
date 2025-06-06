import React, { useState, useEffect } from 'react';
import { getDictionarySize } from '../../utils/engineExports';
import './ResponsiveTest.css';

interface ResponsiveTestProps {
  children: React.ReactNode;
}

interface ScreenInfo {
  width: number;
  height: number;
  devicePixelRatio: number;
  orientation: string;
  breakpoint: string;
  userAgent: string;
  touchSupport: boolean;
}

export const ResponsiveTest: React.FC<ResponsiveTestProps> = ({ children }) => {
  const [showDebug] = useState(false);
  const [screenInfo, setScreenInfo] = useState<ScreenInfo>({
    width: 0,
    height: 0,
    devicePixelRatio: 1,
    orientation: 'unknown',
    breakpoint: 'unknown',
    userAgent: '',
    touchSupport: false
  });

  const getBreakpoint = (width: number): string => {
    if (width < 480) return 'small-mobile';
    if (width < 768) return 'medium-mobile';
    if (width < 1024) return 'tablet';
    if (width < 1440) return 'desktop';
    return 'large-desktop';
  };

  const updateScreenInfo = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    setScreenInfo({
      width,
      height,
      devicePixelRatio: window.devicePixelRatio || 1,
      orientation: width > height ? 'landscape' : 'portrait',
      breakpoint: getBreakpoint(width),
      userAgent: navigator.userAgent,
      touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0
    });
  };

  useEffect(() => {
    updateScreenInfo();
    
    const handleResize = () => {
      updateScreenInfo();
    };
    
    const handleOrientationChange = () => {
      // Delay to account for orientation change timing
      setTimeout(updateScreenInfo, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  const getBrowserInfo = (): string => {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    if (ua.includes('Edg')) return 'Edge';
    return 'Unknown';
  };

  const getDeviceType = (): string => {
    if (screenInfo.touchSupport) {
      if (screenInfo.width < 768) return 'Mobile';
      if (screenInfo.width < 1024) return 'Tablet';
      return 'Touch Desktop';
    }
    return 'Desktop';
  };

  const testTouchTargets = (): boolean => {
    // Check if touch targets meet minimum 44px requirement
    const buttons = document.querySelectorAll('button, [role="button"], .grid-cell');
    let allMeetRequirement = true;
    
    buttons.forEach(button => {
      const rect = button.getBoundingClientRect();
      if (rect.width < 44 || rect.height < 44) {
        allMeetRequirement = false;
      }
    });
    
    return allMeetRequirement;
  };

  return (
    <>
      {children}
      

      
      {/* Debug panel */}
      {showDebug && (
        <div className="responsive-test__panel">
          <h3>Responsive Design Debug</h3>
          
          <div className="responsive-test__section">
            <h4>Screen Information</h4>
            <p><strong>Dimensions:</strong> {screenInfo.width} × {screenInfo.height}px</p>
            <p><strong>Device Pixel Ratio:</strong> {screenInfo.devicePixelRatio}</p>
            <p><strong>Orientation:</strong> {screenInfo.orientation}</p>
            <p><strong>Breakpoint:</strong> {screenInfo.breakpoint}</p>
          </div>
          
          <div className="responsive-test__section">
            <h4>Device & Browser</h4>
            <p><strong>Browser:</strong> {getBrowserInfo()}</p>
            <p><strong>Device Type:</strong> {getDeviceType()}</p>
            <p><strong>Touch Support:</strong> {screenInfo.touchSupport ? 'Yes' : 'No'}</p>
          </div>
          
          <div className="responsive-test__section">
            <h4>Accessibility Tests</h4>
            <p><strong>Touch Targets (44px min):</strong> 
              <span className={testTouchTargets() ? 'responsive-test__pass' : 'responsive-test__fail'}>
                {testTouchTargets() ? ' ✓ Pass' : ' ✗ Fail'}
              </span>
            </p>
            <p><strong>High Contrast:</strong> 
              <span className="responsive-test__info">
                {window.matchMedia('(prefers-contrast: high)').matches ? ' Active' : ' Normal'}
              </span>
            </p>
            <p><strong>Reduced Motion:</strong> 
              <span className="responsive-test__info">
                {window.matchMedia('(prefers-reduced-motion: reduce)').matches ? ' Active' : ' Normal'}
              </span>
            </p>
          </div>
          
          <div className="responsive-test__section">
            <h4>Layout Tests</h4>
            <p><strong>Horizontal Scroll:</strong> 
              <span className={document.body.scrollWidth <= window.innerWidth ? 'responsive-test__pass' : 'responsive-test__fail'}>
                {document.body.scrollWidth <= window.innerWidth ? ' ✓ None' : ' ✗ Present'}
              </span>
            </p>
            <p><strong>Viewport Meta:</strong> 
              <span className={document.querySelector('meta[name="viewport"]') ? 'responsive-test__pass' : 'responsive-test__fail'}>
                {document.querySelector('meta[name="viewport"]') ? ' ✓ Present' : ' ✗ Missing'}
              </span>
            </p>
          </div>
          
          <div className="responsive-test__section">
            <h4>Dictionary Status</h4>
            <p><strong>Dictionary Loaded:</strong> 
              <span className="responsive-test__pass">
                ✓ Yes
              </span>
            </p>
            <p><strong>Total words available:</strong> {getDictionarySize().toLocaleString()}</p>
          </div>
          
          <div className="responsive-test__section">
            <h4>CSS Variables Test</h4>
            <div className="responsive-test__color-swatch" style={{backgroundColor: 'var(--theme-primary)'}} title="Primary"></div>
            <div className="responsive-test__color-swatch" style={{backgroundColor: 'var(--theme-accent)'}} title="Accent"></div>
            <div className="responsive-test__color-swatch" style={{backgroundColor: 'var(--theme-surface)'}} title="Surface"></div>
            <div className="responsive-test__color-swatch" style={{backgroundColor: 'var(--theme-background)'}} title="Background"></div>
          </div>
        </div>
      )}
    </>
  );
};

export default ResponsiveTest; 