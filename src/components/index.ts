// Theme
export { ThemeProvider, useTheme } from './theme/ThemeProvider';
export {
  defaultTheme,
  availableThemes,
  type GameTheme,
  type ThemeContextType
} from '../types/theme';
export { 
  redTheme,
  pinkTheme,
  purpleTheme,
  plumTheme,
  indigoTheme,
  blueTheme,
  denimTheme,
  cyanTheme,
  tealTheme,
  greenTheme,
  mintTheme,
  limeTheme,
  yellowTheme,
  amberTheme,
  orangeTheme,
  coralTheme,
  brownTheme,
  grayTheme,
  grandmaTheme,
  grandpaTheme,
  softnessTheme,
  blackTheme,
  contrastTheme,
  julyTheme,
  brandTheme,
  salmonTheme,
  lavendarTheme,
  bluesTheme,
  squashTheme,
  smogTheme,
  crimsonTheme,
  foggyTheme,
  dewTheme,
  touchTheme,
  citrusTheme,
  lagoonTheme,
  intenseTheme,
  redsTheme,
  femaleTheme,
  seaglassTheme,
  skinsTheme,
  bougieTheme,
  skyTheme,
  winterTheme,
  molesTheme,
  autumnTheme,
  lavenderTheme,
  campingTheme,
  pinksTheme,
  craftTheme,
  tomatoTheme,
  rootsTheme,
  purplesTheme,
  americanTheme,
  grassTheme,
  gearTheme,
  bootsTheme,
  stormTheme,
  sereneTheme,
  vibrantTheme,
  gentleTheme,
  peacefulTheme,
  playfulTheme,
  warmerTheme,
  marketTheme,
  racingTheme,
  delicateTheme,
  robustTheme,
  berryTheme,
  brickTheme,
  tileTheme,
  vintageTheme,
  tweedTheme,
  midnightTheme
} from '../types/theme';

// Unlock System
export { UnlockProvider, useUnlockSystem } from './unlock/UnlockProvider';

// UI Components
export { GridCell } from './ui/GridCell';
export type { GridCellProps, GridCellState, GridCellType } from './ui/GridCell';

export { Menu } from './ui/Menu';
export { MainScreen } from './ui/MainScreen';

// Game Components
export { AlphabetGrid } from './game/AlphabetGrid';
export type { AlphabetGridProps, LetterState } from './game/AlphabetGrid';

export { WordTrail } from './game/WordTrail';
export type { WordTrailProps, WordMove } from './game/WordTrail';

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

export { WordBuilder } from './game/WordBuilder';
export type { WordBuilderProps } from './game/WordBuilder';

export { InteractiveGame } from './game/InteractiveGame';
export type { InteractiveGameProps } from './game/InteractiveGame';

// Hooks
export { useGameState, useGameStats, useWordState } from '../hooks/useGameState';
export type { UseGameStateOptions, GameStateActions, UseGameStateReturn } from '../hooks/useGameState'; 