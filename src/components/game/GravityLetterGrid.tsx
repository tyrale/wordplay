import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import { LockIcon } from '../ui/LockIcon';
import type { GridCellState } from '../ui/GridCell';
import './GravityLetterGrid.css';

export interface GravityLetterState {
  letter: string;
  state: GridCellState;
}

export interface GravityLetterGridProps {
  letterStates?: GravityLetterState[];
  onLetterClick?: (letter: string) => void;
  onActionClick?: (action: string) => void;
  disabled?: boolean;
}

// Same layout as the normal AlphabetGrid - used only as the starting arrangement
// before gravity takes over.
const ALPHABET_GRID = [
  ['A', 'B', 'C', 'D', 'E', 'F'],
  ['G', 'H', 'I', 'J', 'K', 'L'],
  ['M', 'N', 'O', 'P', 'Q', 'R'],
  ['S', 'T', 'U', 'V', 'W', 'X'],
  ['←', '↻', 'Y', 'Z', '?', '≡']
];

const ACTION_BUTTONS = ['←', '↻', '?', '≡'];
const ALL_TILES = ALPHABET_GRID.flat();

interface TileBody {
  content: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vr: number;
  size: number;
  settled: boolean;
}

// Physics tuning constants
const GRAVITY = 2400; // px/s^2
const RESTITUTION = 0.4; // floor bounce damping
const WALL_RESTITUTION = 0.6; // side wall bounce damping
const FLOOR_FRICTION = 0.85; // horizontal velocity damping on floor contact
const AIR_DRAG = 0.999;
const REST_SPEED = 15; // px/s - below this (and resting on floor) a tile is considered settled
const MAX_DT = 1 / 30; // clamp large frame gaps (e.g. tab switch)
const EDGE_PADDING = 4;
const FLOOR_MARGIN_RATIO = 0.3; // keep this fraction of viewport height clear below the floor

// `window.innerHeight`/`visualViewport` can both diverge from the actual
// rendered size of the fixed-position container (mobile browser chrome,
// pinch-zoom, iframe embedding, etc). Measuring the container element's own
// `getBoundingClientRect()` is the ground truth for "what's visible", since
// it's `position: fixed; inset: 0`, i.e. exactly the visible viewport as
// resolved by the browser itself - no API discrepancies possible.
const getViewportSizeFromEl = (el: HTMLElement | null): { width: number; height: number } => {
  if (el) {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return { width: rect.width, height: rect.height };
    }
  }
  const vv = window.visualViewport;
  return {
    width: vv?.width ?? window.innerWidth,
    height: vv?.height ?? window.innerHeight
  };
};

export const GravityLetterGrid: React.FC<GravityLetterGridProps> = ({
  letterStates = [],
  onLetterClick,
  onActionClick,
  disabled = false
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tileRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const bodiesRef = useRef<TileBody[]>([]);
  const rafRef = useRef<number | null>(null);
  const initializedRef = useRef(false);

  const stateMap = useMemo(() => {
    return letterStates.reduce((acc, { letter, state }) => {
      acc[letter] = state;
      return acc;
    }, {} as Record<string, GridCellState>);
  }, [letterStates]);

  const applyTransform = useCallback((body: TileBody) => {
    const el = tileRefs.current[body.content];
    if (el) {
      el.style.transform = `translate(${body.x}px, ${body.y}px) rotate(${body.rotation}deg)`;
    }
  }, []);

  // Set up initial physics bodies, arranged like the normal grid near the top of the viewport,
  // then let the physics loop take over from there.
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const bodies: TileBody[] = [];
    const { width: viewportWidth } = getViewportSizeFromEl(containerRef.current);
    const gap = 8;
    let rowY = 90;

    ALPHABET_GRID.forEach((row) => {
      const rowSizes = row.map(content => tileRefs.current[content]?.getBoundingClientRect().width || 60);
      const rowWidth = rowSizes.reduce((sum, size) => sum + size, 0) + gap * (row.length - 1);
      let colX = Math.max(EDGE_PADDING, (viewportWidth - rowWidth) / 2);
      const rowHeight = Math.max(...rowSizes);

      row.forEach((content, index) => {
        const size = rowSizes[index];
        bodies.push({
          content,
          x: colX,
          y: rowY,
          vx: (Math.random() - 0.5) * 40,
          vy: 0,
          rotation: 0,
          vr: (Math.random() - 0.5) * 30,
          size,
          settled: false
        });
        colX += size + gap;
      });

      rowY += rowHeight + gap;
    });

    bodiesRef.current = bodies;
    bodies.forEach(applyTransform);
  }, [applyTransform]);

  // Physics loop - runs until every tile has settled, then stops.
  useEffect(() => {
    let lastTime = performance.now();

    const step = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, MAX_DT);
      lastTime = time;

      const bodies = bodiesRef.current;
      const { width: viewportWidth, height: viewportHeight } = getViewportSizeFromEl(containerRef.current);
      let anyActive = false;

      for (const body of bodies) {
        if (body.settled) continue;
        anyActive = true;

        body.vy += GRAVITY * dt;
        body.vx *= AIR_DRAG;
        body.x += body.vx * dt;
        body.y += body.vy * dt;
        body.rotation += body.vr * dt;

        const floor = viewportHeight * (1 - FLOOR_MARGIN_RATIO) - body.size - EDGE_PADDING;
        const rightWall = viewportWidth - body.size - EDGE_PADDING;
        const leftWall = EDGE_PADDING;

        if (body.y > floor) {
          body.y = floor;
          body.vy = -body.vy * RESTITUTION;
          body.vx *= FLOOR_FRICTION;
          body.vr *= FLOOR_FRICTION;
        }

        if (body.x > rightWall) {
          body.x = rightWall;
          body.vx = -body.vx * WALL_RESTITUTION;
        } else if (body.x < leftWall) {
          body.x = leftWall;
          body.vx = -body.vx * WALL_RESTITUTION;
        }

        if (
          body.y >= floor - 0.5 &&
          Math.abs(body.vx) < REST_SPEED &&
          Math.abs(body.vy) < REST_SPEED
        ) {
          body.vx = 0;
          body.vy = 0;
          body.vr = 0;
          body.settled = true;
        }
      }

      // Simple pairwise collision resolution (circle approximation) so tiles roll off each other
      // instead of overlapping.
      for (let i = 0; i < bodies.length; i++) {
        for (let j = i + 1; j < bodies.length; j++) {
          const a = bodies[i];
          const b = bodies[j];
          const ar = a.size / 2;
          const br = b.size / 2;
          const dx = (b.x + br) - (a.x + ar);
          const dy = (b.y + br) - (a.y + ar);
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
          const minDist = ar + br;

          if (dist < minDist) {
            const overlap = (minDist - dist) / 2;
            const nx = dx / dist;
            const ny = dy / dist;

            a.x -= nx * overlap;
            a.y -= ny * overlap;
            b.x += nx * overlap;
            b.y += ny * overlap;
            a.settled = false;
            b.settled = false;
            anyActive = true;

            const relVx = b.vx - a.vx;
            const relVy = b.vy - a.vy;
            const relDot = relVx * nx + relVy * ny;
            if (relDot < 0) {
              const impulse = relDot * 0.5;
              a.vx += impulse * nx;
              a.vy += impulse * ny;
              b.vx -= impulse * nx;
              b.vy -= impulse * ny;
            }
          }
        }
      }

      bodies.forEach(applyTransform);

      rafRef.current = anyActive ? requestAnimationFrame(step) : null;
    };

    rafRef.current = requestAnimationFrame(step);

    // If the visible viewport shrinks after tiles have already settled and
    // the physics loop has stopped (e.g. the mobile address bar reappears),
    // wake up any tile now resting below the new floor so it settles back
    // into view instead of staying stuck off-screen.
    const wakeIfOffscreen = () => {
      const { height: viewportHeight } = getViewportSizeFromEl(containerRef.current);
      let needsRestart = false;

      for (const body of bodiesRef.current) {
        const floor = viewportHeight * (1 - FLOOR_MARGIN_RATIO) - body.size - EDGE_PADDING;
        if (body.settled && body.y > floor) {
          body.settled = false;
          needsRestart = true;
        }
      }

      if (needsRestart && rafRef.current === null) {
        lastTime = performance.now();
        rafRef.current = requestAnimationFrame(step);
      }
    };

    window.visualViewport?.addEventListener('resize', wakeIfOffscreen);
    window.addEventListener('resize', wakeIfOffscreen);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      window.visualViewport?.removeEventListener('resize', wakeIfOffscreen);
      window.removeEventListener('resize', wakeIfOffscreen);
    };
  }, [applyTransform]);

  const handleTileClick = useCallback((content: string) => {
    // The menu button should always be reachable, even when it's not the
    // player's turn (e.g. waiting on an opponent in async multiplayer).
    if (disabled && content !== '≡') return;
    if (ACTION_BUTTONS.includes(content)) {
      onActionClick?.(content);
    } else {
      onLetterClick?.(content);
    }
  }, [disabled, onActionClick, onLetterClick]);

  const getAriaLabel = (content: string, state: GridCellState): string => {
    if (ACTION_BUTTONS.includes(content)) {
      switch (content) {
        case '←': return 'Return to home screen';
        case '↻': return 'Reset word';
        case '?': return 'Help';
        case '≡': return 'Settings menu';
        default: return content;
      }
    }
    if (state === 'key') return `Letter ${content} (key letter)`;
    if (state === 'locked') return `Letter ${content} (locked)`;
    if (state === 'lockedKey') return `Letter ${content} (locked key letter)`;
    if (state === 'disabled') return `Letter ${content} (disabled)`;
    return `Letter ${content}`;
  };

  return (
    <div ref={containerRef} className="gravity-letter-grid" role="grid" aria-label="Alphabet grid (gravity mode)">
      {ALL_TILES.map((content) => {
        const isAction = ACTION_BUTTONS.includes(content);
        const state: GridCellState = isAction ? 'normal' : (stateMap[content] || 'normal');
        const isMenuButton = content === '≡';
        const cellClasses = [
          'grid-cell',
          `grid-cell--${state}`,
          `grid-cell--${isAction ? 'action' : 'letter'}`,
          disabled && !isMenuButton && 'grid-cell--disabled',
          'grid-cell--gravity'
        ].filter(Boolean).join(' ');

        return (
          <div
            key={content}
            ref={(el) => { tileRefs.current[content] = el; }}
            className={cellClasses}
            onClick={() => handleTileClick(content)}
            role="button"
            tabIndex={disabled && !isMenuButton ? -1 : 0}
            aria-label={getAriaLabel(content, state)}
            data-letter={isAction ? undefined : content}
            data-type={isAction ? 'action' : 'letter'}
          >
            <span className="grid-cell__content">{content}</span>
            {(state === 'locked' || state === 'lockedKey') && (
              <span className="grid-cell__lock" aria-hidden="true">
                <LockIcon size={12} />
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};
