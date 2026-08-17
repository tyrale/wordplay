/**
 * Ports apps/web's `components/game/AlphabetGrid.tsx`. Tapping a letter
 * still appends it to the end of the word (and tapping a letter in
 * CurrentWord still removes it - see CurrentWord.tsx) as a simpler
 * alternative to dragging, but dragging a letter tile onto the
 * word-in-play is now also supported (see GridCell.tsx's doc comment for
 * how, and CurrentWord.tsx for the drop-zone/append side of it) - this
 * grid only forwards the drag callbacks, it doesn't know what a "drop
 * zone" is.
 *
 * "Gravity mode" (GravityLetterGrid.tsx on web, a physics-sim/portal-based
 * bot gimmick) remains out of scope entirely - see the port plan's Phase
 * 2 scope-cut note.
 */
import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { GridCell } from './GridCell';
import type { GridCellState } from './GridCell';

export interface LetterState {
  letter: string;
  state: GridCellState;
}

export interface AlphabetGridProps {
  letterStates?: LetterState[];
  onLetterPress?: (letter: string) => void;
  onActionPress?: (action: string) => void;
  disabled?: boolean;
  /** Enables the drag gesture on letter cells (default true, matching
   * web's `enableDrag` default). */
  enableDrag?: boolean;
  onLetterDragStart?: (letter: string) => void;
  onLetterDragMove?: (letter: string, pageX: number, pageY: number) => void;
  /** Fired when a dragged letter is released - the caller (the game
   * screen) decides whether the release point landed on the word-in-play
   * and, if so, appends it. */
  onLetterDragRelease?: (letter: string, pageX: number, pageY: number) => void;
}

const ALPHABET_GRID = [
  ['A', 'B', 'C', 'D', 'E', 'F'],
  ['G', 'H', 'I', 'J', 'K', 'L'],
  ['M', 'N', 'O', 'P', 'Q', 'R'],
  ['S', 'T', 'U', 'V', 'W', 'X'],
  ['←', '↻', 'Y', 'Z', '?', '≡']
];

const ACTION_BUTTONS = ['←', '↻', '?', '≡'];
const GRID_COLUMNS = 6;
const GRID_GAP = 6;
const GRID_HORIZONTAL_PADDING = 16;

function getAriaLabel(content: string): string {
  if (ACTION_BUTTONS.includes(content)) {
    switch (content) {
      case '←': return 'Return to home screen';
      case '↻': return 'Reset word';
      case '?': return 'Help';
      case '≡': return 'Settings menu';
      default: return content;
    }
  }
  return `Letter ${content}`;
}

export const AlphabetGrid: React.FC<AlphabetGridProps> = ({
  letterStates = [],
  onLetterPress,
  onActionPress,
  disabled = false,
  enableDrag = true,
  onLetterDragStart,
  onLetterDragMove,
  onLetterDragRelease
}) => {
  const { width } = useWindowDimensions();

  const stateMap = letterStates.reduce((acc, { letter, state }) => {
    acc[letter] = state;
    return acc;
  }, {} as Record<string, GridCellState>);

  // Fit GRID_COLUMNS tiles across the available width, mirroring the web
  // version's breakpoint-based sizing (112px / 96px / 60px) with a
  // continuous computation instead of fixed breakpoints.
  const availableWidth = width - GRID_HORIZONTAL_PADDING * 2;
  const cellSize = Math.floor((availableWidth - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS);

  // Home navigation, the settings menu, and dictionary/help lookup should
  // always be reachable, even when it's not the player's turn (e.g.
  // waiting on an opponent) - unlike letter taps and the reset action,
  // these aren't turn actions. (Web's equivalent component actually still
  // gates '←' behind `disabled` despite its handler's comment claiming
  // otherwise - a latent inconsistency there; native deliberately fixes
  // it here rather than reproducing it.)
  const isAlwaysEnabled = (content: string) => content === '≡' || content === '?' || content === '←';

  const handleCellPress = (content: string) => {
    if (disabled && !isAlwaysEnabled(content)) return;

    if (ACTION_BUTTONS.includes(content)) {
      onActionPress?.(content);
    } else {
      onLetterPress?.(content);
    }
  };

  return (
    <View style={styles.grid} accessibilityRole="none">
      {ALPHABET_GRID.map((row, rowIndex) => (
        <View key={rowIndex} style={[styles.row, { gap: GRID_GAP }]}>
          {row.map(content => {
            const isAction = ACTION_BUTTONS.includes(content);
            const state = stateMap[content] || 'normal';
            const canDrag = enableDrag && !isAction && !disabled && state !== 'disabled';

            return (
              <GridCell
                key={content}
                content={content}
                state={isAction ? 'normal' : state}
                type={isAction ? 'action' : 'letter'}
                onPress={() => handleCellPress(content)}
                disabled={isAlwaysEnabled(content) ? false : disabled || state === 'disabled'}
                accessibilityLabel={getAriaLabel(content)}
                size={cellSize}
                draggable={canDrag}
                onDragStart={canDrag ? () => onLetterDragStart?.(content) : undefined}
                onDragMove={canDrag ? (pageX, pageY) => onLetterDragMove?.(content, pageX, pageY) : undefined}
                onDragRelease={canDrag ? (pageX, pageY) => onLetterDragRelease?.(content, pageX, pageY) : undefined}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    paddingHorizontal: GRID_HORIZONTAL_PADDING,
    gap: GRID_GAP,
    alignItems: 'center'
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center'
  }
});
