/**
 * Alert Overlay Component
 *
 * Universal full-screen overlay used for every alert/notification pattern
 * in the app: win/lose/quit screens, unlocks, challenge outcomes, and any
 * generic alert. Presentational only — copy lives in `src/content/alertCopy.ts`.
 *
 * Layout: stacked, center-aligned lines at 105% viewport width (lines may
 * slightly overlap the screen edges by design), with a single close "X"
 * centered at the bottom. Optional `meta` content (e.g. scores) renders
 * below the lines, and optional `actions` render above the close button
 * for cases that need more than a single dismiss (e.g. Share + Home).
 */

import React, { useLayoutEffect, useRef, useState } from 'react';
import './AlertOverlay.css';

export interface AlertOverlayAction {
  label: string;
  onClick: () => void;
}

export type AlertOverlayVariant = 'default' | 'win' | 'lose' | 'unlock' | 'error';

export interface AlertOverlayProps {
  isVisible: boolean;
  lines: string[];
  onClose: () => void;
  variant?: AlertOverlayVariant;
  meta?: React.ReactNode;
  actions?: AlertOverlayAction[];
}

/** Fraction of viewport width each line's rendered text should span. */
const TARGET_WIDTH_VW = 1.05;
/** Reference font-size (px) used for canvas text measurement. */
const MEASURE_FONT_SIZE = 100;
/** Safety clamps so very short/long lines don't break vertical layout. */
const MIN_FONT_SIZE = 24;
const MAX_FONT_SIZE_VH_FRACTION = 0.3;

/**
 * Measures each line's text at a reference font-size using canvas, then
 * scales the font-size so the rendered line width equals `TARGET_WIDTH_VW`
 * of the viewport — independent per line, so a 2-letter and 8-letter line
 * both fill (and slightly overlap) the screen edges as designed.
 */
function useFitLineFontSizes(lines: string[], containerRef: React.RefObject<HTMLDivElement | null>, isVisible: boolean): number[] {
  const [fontSizes, setFontSizes] = useState<number[]>([]);

  useLayoutEffect(() => {
    if (!isVisible || !containerRef.current) return;

    const computeSizes = () => {
      const container = containerRef.current;
      if (!container) return;

      const computedStyle = window.getComputedStyle(container);
      const fontFamily = computedStyle.fontFamily;
      const fontWeight = computedStyle.fontWeight;

      const canvas = document.createElement('canvas');
      let ctx: CanvasRenderingContext2D | null = null;
      try {
        ctx = canvas.getContext('2d');
      } catch {
        // Canvas 2D context unavailable (e.g. jsdom test environment) - fall back to CSS default sizing
      }
      if (!ctx) return;

      ctx.font = `${fontWeight} ${MEASURE_FONT_SIZE}px ${fontFamily}`;

      const targetWidthPx = window.innerWidth * TARGET_WIDTH_VW;
      const maxFontSizePx = window.innerHeight * MAX_FONT_SIZE_VH_FRACTION;

      const sizes = lines.map(line => {
        const measuredWidth = ctx.measureText(line).width;
        if (measuredWidth === 0) return MIN_FONT_SIZE;
        const fitSize = (targetWidthPx / measuredWidth) * MEASURE_FONT_SIZE;
        return Math.max(MIN_FONT_SIZE, Math.min(fitSize, maxFontSizePx));
      });

      setFontSizes(sizes);
    };

    computeSizes();
    window.addEventListener('resize', computeSizes);
    return () => window.removeEventListener('resize', computeSizes);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `lines.join` gives a stable key so we only recompute when the actual copy changes, not on every parent re-render
  }, [lines.join('\u0000'), isVisible, containerRef]);

  return fontSizes;
}

export const AlertOverlay: React.FC<AlertOverlayProps> = ({
  isVisible,
  lines,
  onClose,
  variant = 'default',
  meta,
  actions
}) => {
  const linesContainerRef = useRef<HTMLDivElement>(null);
  const fontSizes = useFitLineFontSizes(lines, linesContainerRef, isVisible);

  if (!isVisible) return null;

  return (
    <div
      className={`alert-overlay alert-overlay--${variant}`}
      role="dialog"
      aria-modal="true"
    >
      <div className="alert-overlay__lines" ref={linesContainerRef}>
        {lines.map((line, index) => (
          <div
            key={index}
            className="alert-overlay__line"
            style={fontSizes[index] ? { fontSize: `${fontSizes[index]}px` } : undefined}
          >
            {line}
          </div>
        ))}
      </div>

      {meta && <div className="alert-overlay__meta">{meta}</div>}

      {actions && actions.length > 0 && (
        <div className="alert-overlay__actions">
          {actions.map(action => (
            <button
              key={action.label}
              className="alert-overlay__action"
              onClick={action.onClick}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      <button
        className="alert-overlay__close"
        onClick={onClose}
        aria-label="Close"
      >
        ×
      </button>
    </div>
  );
};
