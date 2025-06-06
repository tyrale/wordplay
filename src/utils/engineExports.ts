/**
 * Browser-Compatible Engine Exports
 * 
 * This module provides browser-compatible access to engine functionality
 * while maintaining the same logic and behavior as the terminal game.
 */

// Re-export everything from browser engine
export type {
  GameConfig,
  PlayerState,
  TurnHistory,
  PublicGameState,
  GameState,
  MoveAttempt,
  GameStateUpdate,
  BotMove,
  ScoringResult,
  WordAnalysis,
  ValidationOptions,
  ValidationResult
} from './browserEngine';

export {
  BrowserGameStateManager as LocalGameStateManager,
  createGameStateManager,
  validateWord,
  isValidMove,
  calculateScore,
  analyzeWordChange,
  generateBotMove
} from './browserEngine';

// Browser-compatible dictionary functions
export {
  isValidDictionaryWordSync as isValidDictionaryWord,
  getDictionarySizeSync as getDictionarySize,
  initializeBrowserDictionary
} from './browserDictionary'; 