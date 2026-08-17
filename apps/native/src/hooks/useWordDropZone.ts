/**
 * Shared "is this drag release over the word-in-play?" logic for the
 * three game screens (InteractiveGame/ZenGame/ChallengeGame), each of
 * which pairs an AlphabetGrid (source of draggable letters) with a
 * CurrentWord (the drop zone) but isn't a parent/child of one another -
 * see CurrentWord.tsx's doc comment for why the drop-zone check has to
 * live in the screen that owns both, not in either component itself.
 */
import { useCallback, useRef } from 'react';
import type { CurrentWordHandle } from '../components/CurrentWord';

/** Small forgiveness margin (px) around the measured word bounds, since a
 * drop right at the visual edge of the word should still count -
 * matches the spirit of web's "anywhere over the word builder container"
 * drop target (not a precise per-letter hit test). */
const DROP_ZONE_MARGIN = 24;

export function useWordDropZone() {
  const wordRef = useRef<CurrentWordHandle>(null);

  /** Measures the current word's on-screen bounds and calls `onHit()` if
   * (pageX, pageY) falls within them (plus the margin above). */
  const checkDrop = useCallback((pageX: number, pageY: number, onHit: () => void) => {
    wordRef.current?.measureInWindow((x, y, width, height) => {
      const withinX = pageX >= x - DROP_ZONE_MARGIN && pageX <= x + width + DROP_ZONE_MARGIN;
      const withinY = pageY >= y - DROP_ZONE_MARGIN && pageY <= y + height + DROP_ZONE_MARGIN;
      if (withinX && withinY) onHit();
    });
  }, []);

  return { wordRef, checkDrop };
}
