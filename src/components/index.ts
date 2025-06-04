// Theme
export { ThemeProvider, useTheme } from './theme/ThemeProvider';
export type { GameTheme, ThemeContextType } from '../types/theme';
export { defaultTheme, darkTheme, greenTheme, availableThemes } from '../types/theme';

// UI Components
export { GridCell } from './ui/GridCell';
export type { GridCellProps, GridCellState, GridCellType } from './ui/GridCell';

// Game Components
export { AlphabetGrid } from './game/AlphabetGrid';
export type { AlphabetGridProps, LetterState } from './game/AlphabetGrid';

export { WordTrail } from './game/WordTrail';
export type { WordTrailProps } from './game/WordTrail';

export { CurrentWord } from './game/CurrentWord';
export type { CurrentWordProps, LetterHighlight } from './game/CurrentWord';

export { ActionIndicators } from './game/ActionIndicators';
export type { ActionIndicatorsProps, ActionState } from './game/ActionIndicators';

export { SubmitButton } from './game/SubmitButton';
export type { SubmitButtonProps } from './game/SubmitButton';

export { ScoreDisplay } from './game/ScoreDisplay';
export type { ScoreDisplayProps, ScoreBreakdown } from './game/ScoreDisplay';

export { GameBoard } from './game/GameBoard';
export type { GameBoardProps } from './game/GameBoard'; 