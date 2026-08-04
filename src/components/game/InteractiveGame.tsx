import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useGameState, useGameStats, useWordState } from '../../hooks/useGameState';
import { useUnlockSystem } from '../unlock/UnlockProvider';
import { usePlayerStats } from '../../hooks/usePlayerStats';
import { useWordPathGraph } from '../../hooks/useWordPathGraph';
import { useMechanicsSettings } from '../../contexts/MechanicsSettingsContext';
import { useAlert } from '../ui/AlertProvider';
import { AlphabetGrid } from './AlphabetGrid';
import { WordTrail } from './WordTrail';

import { ScoreDisplay } from './ScoreDisplay';
import { ScoreBar } from './ScoreBar';
import { WordBuilder } from './WordBuilder';
import { DebugDialog } from './DebugDialog';
import { Menu } from '../ui/Menu';
import { getBotDisplayName } from '../../data/botRegistry';
import { getDisplayName as getVanityName, setDisplayName, markDisplayNameConfirmed } from '../../adapters/supabaseAuthAdapter';
import { NamePromptOverlay } from '../multiplayer/NamePromptOverlay';
import { createBrowserAdapter } from '../../adapters/browserAdapter';
import {
  getWordLegalityReason,
  getVariantDefinitionNote,
  isPlayableWord,
  isSeussWord,
  isSeussInventedWord,
  fetchWordDefinition
} from '../../utils/wordHelp';
import { triggerHapticFeedback } from '../../utils/haptics';
import { triggerSoundFeedback } from '../../utils/sound';
import { hasSeenClearHint, markClearHintSeen } from '../../utils/tutorialStorage';
import { useTheme } from '../theme/ThemeProvider';
import type { BossStage } from '../../data/bossBattle';
import type { WordDataDependencies, ScoringAction, GameConfig, MoveAttempt, GameState, IGameStateManager } from '../../../packages/engine/interfaces';

// Dictionary validation using pure dependency injection
function useDictionaryValidation() {
  const [wordData, setWordData] = useState<WordDataDependencies | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  
  useEffect(() => {
    let mounted = true;
    
    const initializeAdapter = async () => {
      try {
        const adapter = await createBrowserAdapter();
        const data = adapter.getWordData();
        
        if (data && typeof data.waitForLoad === 'function') {
          await data.waitForLoad();
        }
        
        if (mounted) {
          setWordData(data);
          setIsLoaded(true);
        }
      } catch (error) {
        console.error('Failed to initialize dictionary validation:', error);
      }
    };
    
    initializeAdapter();
    
    return () => {
      mounted = false;
    };
  }, []);
  
  const isValidDictionaryWord = useCallback((word: string): boolean => {
    if (!wordData || !isLoaded) {
      console.warn('Dictionary not loaded yet, validation failed');
      return false;
    }
    
    try {
      // Use the dependency injection pattern
      return wordData.enableWords.has(word.toUpperCase()) || wordData.slangWords.has(word.toUpperCase());
    } catch (error) {
      console.warn('Dictionary validation error:', error);
      return false;
    }
  }, [wordData, isLoaded]);
  
  return { isValidDictionaryWord, wordData, isLoaded };
}

import type { LetterState, ScoreBreakdown, LetterHighlight, WordMove } from '../index';
import type { ActionState } from './ScoreDisplay';
import './InteractiveGame.css';

// Number of seconds a player has to take their turn when the time-pressure mechanic is on
const TURN_TIME_LIMIT_SECONDS = 7;

export interface InteractiveGameProps {
  config?: GameConfig;
  onGameEnd?: (winner: string | null, finalScores: { human: number; bot: number }) => void;
  onResign?: () => void;
  onNavigateHome?: () => void;
  currentGameMode?: string;
  onStartGame?: (gameType: 'bot' | 'challenge' | 'tutorial', botId?: string) => void;
  onGameStateChange?: (gameState: GameState) => void;
  disableLetterRemoval?: boolean;
  /**
   * Use an already-constructed manager instead of the local bot-game
   * manager - e.g. a `RemoteGameStateManager` for vs-human multiplayer.
   * When provided, the board renders exactly as it does for a bot game,
   * just driven by this manager's state/actions instead.
   */
  externalManager?: IGameStateManager;
  /** The authenticated player id to treat as "the local player" when using `externalManager`. */
  localPlayerId?: string;
  /**
   * Fired when the whole-game boss countdown (config.gameTimeLimitSeconds)
   * reaches zero. The game is torn down by the parent (App) in response.
   */
  onGameTimeout?: () => void;
  /**
   * Fired when the local player submits a word that should trigger the boss
   * battle encounter (currently "GUS"). The parent (App) decides whether to
   * act - InteractiveGame just reports the submitted word. Only wired for
   * normal bot games (not boss/tutorial/multiplayer).
   */
  onBossTrigger?: (word: string) => void;
  /** Current boss stage, used to drive boss-theme visual effects (red outline,
   *  monster shadow, music). Only meaningful when currentGameMode === 'boss'. */
  bossStage?: BossStage;
}

export const InteractiveGame: React.FC<InteractiveGameProps> = ({
  config,
  onGameEnd,
  onResign,
  onNavigateHome,
  currentGameMode,
  onStartGame,
  onGameStateChange,
  disableLetterRemoval = false,
  externalManager,
  localPlayerId,
  onGameTimeout,
  onBossTrigger,
  bossStage
}) => {
  // Initialize dictionary validation hook
  const { isValidDictionaryWord, wordData } = useDictionaryValidation();
  
  // Unlock system integration
  const { handleWordSubmission, handleGameCompletion, handleWordPathChange, getUnlockedItems } = useUnlockSystem();
  const { recordMove, recordGameResult } = usePlayerStats();
  const { recordTransition: recordWordPathTransition, syncToServer: syncWordPathGraph } = useWordPathGraph();

  // Tracks how many turnHistory entries have already been sent to recordMove,
  // so word/letter stats update live per move instead of only at game end.
  const recordedMoveCountRef = useRef(0);
  const { isMechanicOn } = useMechanicsSettings();
  const { showCustomAlert, showAlert } = useAlert();
  const { currentTheme } = useTheme();

  // "GUS" boss battle: a whole-game countdown (config.gameTimeLimitSeconds)
  // replaces the per-turn time-pressure timer, and the per-turn pressure
  // auto-pass is disabled so the boss fight is governed solely by its own
  // countdown + the 20-turn round.
  const isBossBattle = currentGameMode === 'boss' && typeof config?.gameTimeLimitSeconds === 'number';
  const bossTimeLimitSeconds = isBossBattle ? (config!.gameTimeLimitSeconds as number) : null;

  // Boss-theme visual effect tier, derived from the active theme name so it
  // also applies correctly if a boss theme is selected from the menu after
  // being permanently unlocked. 'boss' = base 3-color (no extra effect),
  // 'megaboss' = red letter outlines, 'gigaboss' = red outlines + animated
  // monster-shadow background + escalating music.
  const bossEffectTier: 'none' | 'mega' | 'giga' =
    currentTheme.name === 'gigaboss' ? 'giga'
      : currentTheme.name === 'megaboss' ? 'mega'
        : 'none';

  // Determine starting word length from unlocked + enabled starting-word mechanics.
  // If multiple lengths are unlocked and on, pick one at random for variety.
  const unlockedMechanics = getUnlockedItems('mechanic');
  const availableStartLengths = [3, 5, 6, 7, 8, 9, 10].filter(len =>
    unlockedMechanics.includes(`${len}-letter-start`) && isMechanicOn(`${len}-letter-start`)
  );
  const startingWordLength = availableStartLengths.length > 0
    ? availableStartLengths[Math.floor(Math.random() * availableStartLengths.length)]
    : undefined;

  // Time-pressure mechanic: unlocked via the "time" word and toggled on in the mechanics menu.
  // Suppressed during a boss battle - the boss has its own whole-game countdown
  // and the per-turn 7s auto-pass would otherwise conflict with it.
  const isTimePressureOn = !isBossBattle && unlockedMechanics.includes('time-pressure') && isMechanicOn('time-pressure');

  // Gravity mechanic: unlocked via the "gravity" word and toggled on in the mechanics menu.
  // Makes the alphabet grid letters fall and roll freely around the viewport.
  const isGravityOn = unlockedMechanics.includes('gravity') && isMechanicOn('gravity');

  // Drunk mechanic: unlocked via the "drunk" word and toggled on in the mechanics menu.
  // Makes the whole game view hazy and wobbly, like looking at it drunk.
  const isDrunkOn = unlockedMechanics.includes('drunk') && isMechanicOn('drunk');

  // Seuss canonical words: unlocked by beating the Grinchbot. Allows the
  // player to play canonical Dr. Seuss words (LORAX, GRINCH, WOCKET, etc.)
  // as valid words in any game mode. No toggle — once unlocked, always on.
  const allowSeussCanonical = unlockedMechanics.includes('seuss-canonical-words');

  // Game state management
  const {
    gameState,
    actions,
    isPlayerTurn,
    isBotTurn,
    isGameActive,
    isGameFinished,
    isBotThinking,
    isProcessingMove,
    lastError,
    clearError
  } = useGameState({
    config: { ...config, startingWordLength, allowSeussCanonical },
    externalManager,
    localPlayerId,
    skipSavedGamePersistence: currentGameMode === 'tutorial' || currentGameMode === 'boss',
    onGameStateChange: (state) => {
      // Record each of the local player's newly-completed moves live, so
      // word/letter stats update as the game is played rather than only
      // once it reaches a terminal state (which may never happen if the
      // player force-quits, crashes, or otherwise abandons the game).
      if (state.turnHistory.length > recordedMoveCountRef.current) {
        const newEntries = state.turnHistory.slice(recordedMoveCountRef.current);
        recordedMoveCountRef.current = state.turnHistory.length;
        const localId = localPlayerId ?? 'human';
        for (const entry of newEntries) {
          // Word path graph tracks every word seen - both the local player's
          // and any bot/opponent's moves - so it's recorded unconditionally,
          // unlike recordMove (player stats) which only tracks the local player.
          // Synced to the server's master graph right away, per turn, rather
          // than waiting for the game to finish.
          recordWordPathTransition(entry.previousWord, entry.newWord)
            .then(() => syncWordPathGraph())
            .catch(err => console.warn('Failed to record/sync word path transition:', err));

          if (entry.playerId === localId) {
            recordMove(entry).catch(err => console.warn('Failed to record move stats:', err));
          } else {
            // The local player's own submissions are checked for unlocks in
            // the submit handler (handleWordSubmission). For any OTHER
            // participant's move - a bot or a remote human opponent - we
            // check for unlocks here so that an unlockable word played by
            // anyone in the game unlocks for the local player too. This is
            // purely local: each client observes the shared game state and
            // grants the unlock into its own storage. isLocalMove=false
            // ensures a bot/opponent playing "RESET" can't wipe the local
            // player's unlocks.
            const isProfane = !!wordData?.profanityWords.has(entry.newWord.toUpperCase());
            handleWordSubmission(entry.newWord, isProfane, { isLocalMove: false }).catch(err =>
              console.warn('Failed to check non-local move unlock triggers:', err)
            );
          }
        }

        // Check for word-sequence unlocks (e.g. STINK → STANK → STUNK).
        // The word path is the full chain of words played in the game, in
        // order, regardless of who played them (human, bot, or remote
        // opponent). We reconstruct it from turnHistory: the first entry's
        // previousWord is the starting word, and each entry's newWord is
        // the word played that turn.
        const wordPath: string[] = [];
        if (state.turnHistory.length > 0) {
          wordPath.push(state.turnHistory[0].previousWord.toUpperCase());
        }
        for (const entry of state.turnHistory) {
          wordPath.push(entry.newWord.toUpperCase());
        }
        // Only check when we have at least 3 words (the shortest sequence trigger)
        if (wordPath.length >= 3) {
          handleWordPathChange(wordPath).catch(err =>
            console.warn('Failed to check word sequence unlock triggers:', err)
          );
        }
      }

      if (state.gameStatus === 'finished' && onGameEnd) {
        const localId = localPlayerId ?? 'human';
        const opponentId = localPlayerId
          ? state.players.find(p => p.id !== localId)?.id
          : 'bot';
        const humanScore = state.players.find(p => p.id === localId)?.score || 0;
        const botScore = state.players.find(p => p.id === opponentId)?.score || 0;

        // Show the win/loss overlay immediately - don't block it on unlock
        // checks, which may involve slow/unreliable network calls (community
        // unlock recording via Supabase) and would otherwise leave the board
        // blank (it unmounts as soon as the game is no longer active) for an
        // indeterminate amount of time before the overlay appears.
        onGameEnd(state.winner?.id || null, { human: humanScore, bot: botScore });

        // Check for unlock triggers on game completion in the background;
        // any resulting unlock notification will show over the overlay once ready.
        // Boss battles use a strict win condition (player must have MORE points
        // than the boss - a tie is a loss per the boss spec), so the permanent
        // boss unlocks only fire on a real win, not on a tie the engine might
        // otherwise award to the human via sortedPlayers[0].
        const completionWinner = isBossBattle
          ? (humanScore > botScore ? 'human' : null)
          : (state.winner?.id || null);
        handleGameCompletion(completionWinner, config?.botId).catch(err =>
          console.warn('Failed to check game completion unlock triggers:', err)
        );

        // Upload any newly-discovered word path edges to the server's
        // master graph, also in the background.
        syncWordPathGraph().catch(err =>
          console.warn('Failed to sync word path graph:', err)
        );

        // Record this game into the player's lifetime stats log, also in the background
        const won = state.winner?.id === localId;
        const tied = humanScore === botScore;
        const gameDurationMs = state.gameStartTime && state.lastMoveTime
          ? state.lastMoveTime - state.gameStartTime
          : null;
        recordGameResult({
          playerId: localId,
          botId: config?.botId,
          won,
          tied,
          turnHistory: state.turnHistory,
          totalTurns: state.totalMoves,
          finalScore: humanScore,
          gameDurationMs,
          timestamp: Date.now()
        }).catch(err => console.warn('Failed to record game result stats:', err));
      }
    }
  });

  // Derived state
  const gameStats = useGameStats(gameState);
  const wordState = useWordState(gameState);
  
  // Local UI state
  const [pendingWord, setPendingWord] = useState('');
  
  // Track pendingWord changes
  useEffect(() => {
    // Clean, no debug logs
  }, [pendingWord]);
  const [pendingMoveAttempt, setPendingMoveAttempt] = useState<MoveAttempt | null>(null);
  const [showGameEnd, setShowGameEnd] = useState(false);
  const [isDebugDialogOpen, setIsDebugDialogOpen] = useState(false);
  const [draggedLetter, setDraggedLetter] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [showValidationError, setShowValidationError] = useState(false);
  const [turnTimeRemaining, setTurnTimeRemaining] = useState<number | null>(null);
  // Whole-game boss countdown (seconds remaining). Null outside a boss battle.
  const [bossTimeRemaining, setBossTimeRemaining] = useState<number | null>(null);
  // Guards against firing onGameTimeout more than once per boss battle.
  const bossTimeoutFiredRef = useRef(false);
  const [isRenamingSelf, setIsRenamingSelf] = useState(false);

  // Initialize pending word with current word
  useEffect(() => {
    setPendingWord(wordState.currentWord);
  }, [wordState.currentWord]);

  // Notify parent of game state changes (for tutorial)
  useEffect(() => {
    if (onGameStateChange && gameState) {
      onGameStateChange(gameState);
    }
  }, [gameState, onGameStateChange]);

  // Handle game end
  useEffect(() => {
    if (isGameFinished && !showGameEnd) {
      setShowGameEnd(true);
    }
  }, [isGameFinished, showGameEnd]);

  // Auto-trigger bot moves only when it becomes bot's turn
  const makeBotMove = actions.makeBotMove;
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (isBotTurn && isGameActive && !isBotThinking) {
            // Add delay for better UX
      timeoutId = setTimeout(async () => {
                const botMove = await makeBotMove();
                if (botMove) {
          // setBotMoveHistory(prev => [...prev, botMove]);
        }
      }, 1000); // 1 second delay to show bot is "thinking"
    }

    return () => {
      if (timeoutId) {
                clearTimeout(timeoutId);
      }
    };
  }, [isBotTurn, isGameActive, isBotThinking, makeBotMove]); // Removed gameState.players to prevent retriggering

  // Time-pressure countdown: resets to 7 seconds each time the player's turn starts,
  // and clears when it's no longer the player's turn.
  useEffect(() => {
    if (!isTimePressureOn || !isPlayerTurn || !isGameActive) {
      setTurnTimeRemaining(null);
      return;
    }

    setTurnTimeRemaining(TURN_TIME_LIMIT_SECONDS);

    const intervalId = setInterval(() => {
      setTurnTimeRemaining(prev => (prev !== null ? Math.max(prev - 1, 0) : null));
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [isTimePressureOn, isPlayerTurn, isGameActive]);

  // Auto-pass the player's turn when the countdown reaches zero
  useEffect(() => {
    if (turnTimeRemaining === 0 && isTimePressureOn && isPlayerTurn && isGameActive) {
      actions.passTurn();
      setPendingWord(wordState.currentWord);
      setPendingMoveAttempt(null);
      setShowValidationError(false);
      setTurnTimeRemaining(null);
    }
  }, [turnTimeRemaining, isTimePressureOn, isPlayerTurn, isGameActive, actions, wordState.currentWord]);

  // Boss battle whole-game countdown: starts ticking from bossTimeLimitSeconds
  // the moment the boss game becomes active, and fires onGameTimeout once it
  // hits zero (the player loses by timeout). Unlike the per-turn timer this
  // runs continuously across both the player's and the bot's turns.
  useEffect(() => {
    if (!isBossBattle || !bossTimeLimitSeconds || !isGameActive) {
      setBossTimeRemaining(null);
      return;
    }
    bossTimeoutFiredRef.current = false;
    setBossTimeRemaining(bossTimeLimitSeconds);

    const intervalId = setInterval(() => {
      setBossTimeRemaining(prev => (prev !== null ? Math.max(prev - 1, 0) : null));
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [isBossBattle, bossTimeLimitSeconds, isGameActive]);

  // Fire onGameTimeout exactly once when the boss countdown reaches zero.
  useEffect(() => {
    if (bossTimeRemaining === 0 && isBossBattle && isGameActive && !bossTimeoutFiredRef.current) {
      bossTimeoutFiredRef.current = true;
      onGameTimeout?.();
    }
  }, [bossTimeRemaining, isBossBattle, isGameActive, onGameTimeout]);

  // Letter grid state
  const letterStates: LetterState[] = React.useMemo(() => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const states = alphabet.map(letter => {
      // Only current key letters get accent color styling
      if (wordState.keyLetters.includes(letter)) {
        return { letter, state: 'key' as const };
      }
      // Both regular locked letters and locked key letters get lock icon with normal background
      if (wordState.lockedLetters.includes(letter) || wordState.lockedKeyLetters.includes(letter)) {
        return { letter, state: 'locked' as const };
      }
      // Normal letters
      return { letter, state: 'normal' as const };
    });
    
    return states;
  }, [wordState.keyLetters, wordState.lockedLetters, wordState.lockedKeyLetters]);

  // Pending word highlights (for word builder)
  const pendingWordHighlights: LetterHighlight[] = React.useMemo(() => {
    return pendingWord.split('').map((letter, index) => {
      // Locked key letters take priority (they were key letters that became locked)
      if (wordState.lockedKeyLetters.includes(letter)) {
        return { index, type: 'lockedKey' as const };
      }
      if (wordState.keyLetters.includes(letter)) {
        return { index, type: 'key' as const };
      }
      if (wordState.lockedLetters.includes(letter)) {
        return { index, type: 'locked' as const };
      }
      return null;
    }).filter((highlight): highlight is LetterHighlight => highlight !== null);
  }, [pendingWord, wordState.keyLetters, wordState.lockedLetters, wordState.lockedKeyLetters]);

  // Action indicators based on pending move
  const actionState: ActionState = React.useMemo(() => {
    if (!pendingMoveAttempt?.scoringResult) {
      return { add: false, remove: false, move: false };
    }
    
    const actions: ScoringAction[] = pendingMoveAttempt.scoringResult.actions;

    return {
      add: actions.some((action) => action.type === 'add'),
      remove: actions.some((action) => action.type === 'remove'),
      move: actions.some((action) => action.type === 'rearrange')
    };
  }, [pendingMoveAttempt]);

  // Score breakdown
  const scoreBreakdown: ScoreBreakdown = React.useMemo(() => {
    if (!pendingMoveAttempt?.scoringResult) {
      return { base: 0, keyBonus: 0, total: 0 };
    }
    
    const result = pendingMoveAttempt.scoringResult;

    return {
      base: result.baseScore,
      keyBonus: result.keyLetterScore,
      total: result.totalScore
    };
  }, [pendingMoveAttempt]);

  // Word trail with move details
  const wordTrailMoves: WordMove[] = React.useMemo(() => {
    const moves = gameState.turnHistory.map((turn) => {
      const scoringBreakdown = turn.scoringBreakdown;

      return {
        word: turn.newWord,
        score: turn.score,
        player: turn.playerId,
        opponentName: turn.playerId === 'bot' && config?.botId ? getBotDisplayName(config.botId) : undefined,
        turnNumber: turn.turnNumber,
        keyLetters: scoringBreakdown.keyLettersUsed || [],
        scoreBreakdown: scoringBreakdown.breakdown
      };
    });
    
        return moves;
  }, [gameState, config?.botId]); // Use full gameState instead of just turnHistory

  // Event handlers
  const handleHelp = useCallback(async () => {
    const word = pendingWord.trim().toUpperCase();
    if (!word) return;

    // If the player has unlocked the Grinchbot and the word is a Dr. Seuss
    // word, show a special Seuss message instead of a dictionary definition.
    const grinchBotUnlocked = getUnlockedItems('bot').includes('grinch-bot');
    if (grinchBotUnlocked && isSeussWord(word, wordData)) {
      // Invented Seuss words get a sassy Grinch response when playing the grinchbot
      if (config?.botId === 'grinch-bot' && isSeussInventedWord(word, wordData)) {
        showCustomAlert(['DONT', 'QUESTION', 'ME!'], {
          meta: "Im the Grinch I can say what i want."
        });
      } else {
        showCustomAlert([word], {
          meta: (
            <div className="alert-overlay__meta-definition">
              This is a Dr. Seuss word and it's fantastic.
            </div>
          )
        });
      }
      return;
    }

    const definition = await fetchWordDefinition(word);
    const reason = getWordLegalityReason(word, wordData);
    const variantNote = getVariantDefinitionNote(word, wordData, definition);
    const isInvalid = !isPlayableWord(word, wordData);

    showCustomAlert([word], {
      meta: (
        <>
          <div className={isInvalid ? 'alert-overlay__meta-reason--invalid' : ''}>
            {reason}
          </div>
          {variantNote && (
            <div className="alert-overlay__meta-variant-note">{variantNote}</div>
          )}
          <div className="alert-overlay__meta-definition">
            {definition || 'No definition available'}
          </div>
        </>
      )
    });
  }, [pendingWord, wordData, showCustomAlert, getUnlockedItems, config?.botId]);

  const handleSettings = useCallback(() => {
    setIsMenuOpen(true);
  }, []);

  const handleActionClick = useCallback((action: string) => {
    // The menu and home navigation should always be reachable, even when
    // it's not the player's turn (e.g. waiting on an opponent in async
    // multiplayer) - unlike letter/word edits, these aren't turn actions.
    if (action === '≡') {
      handleSettings();
      return;
    }

    if (action === '←') { // Leave the board and return to the home screen
      onNavigateHome?.();
      return;
    }

    if (!isPlayerTurn || isProcessingMove) return;
    
    switch (action) {
      case '↻': // Reset word (reset to current word)
        setPendingWord(wordState.currentWord);
        setPendingMoveAttempt(null);
        break;
      case '?': // Help
        handleHelp();
        break;
    }
  }, [isPlayerTurn, isProcessingMove, wordState.currentWord, handleHelp, handleSettings, onNavigateHome]);

  const handleWordChange = useCallback((newWord: string) => {
    if (!isPlayerTurn || isProcessingMove) {
      return;
    }
    
    setPendingWord(newWord);
    setShowValidationError(false); // Reset error display when word changes
    
    // Validate the move attempt
    if (newWord !== wordState.currentWord) {
      const attempt = actions.attemptMove(newWord);
      setPendingMoveAttempt(attempt);
    } else {
      setPendingMoveAttempt(null);
    }
  }, [isPlayerTurn, isProcessingMove, wordState.currentWord, actions]);

  const handleLetterClick = useCallback((letter: string) => {
    if (!isPlayerTurn || isProcessingMove) return;
    
    // Add letter to pending word
    if (pendingWord.length < 10) { // Max word length
      triggerHapticFeedback('add');
      triggerSoundFeedback('add');
      const newWord = pendingWord + letter;
      handleWordChange(newWord);
    }
  }, [isPlayerTurn, isProcessingMove, pendingWord, handleWordChange]);

  const handleLetterDragStart = useCallback((letter: string) => {
    if (!isPlayerTurn || isProcessingMove) return;
    setDraggedLetter(letter);
  }, [isPlayerTurn, isProcessingMove]);

  const handleLetterDragEnd = useCallback(() => {
    setDraggedLetter(null);
  }, []);

  const handleWordBuilderMouseUp = useCallback((_e: React.MouseEvent) => {
    if (draggedLetter && pendingWord.length < 10) {
      triggerHapticFeedback('add');
      triggerSoundFeedback('add');
      const newWord = pendingWord + draggedLetter;
      handleWordChange(newWord);
    }
    setDraggedLetter(null);
  }, [draggedLetter, pendingWord, handleWordChange]);

  const handleWordBuilderTouchEnd = useCallback((_e: React.TouchEvent) => {
    if (draggedLetter && pendingWord.length < 10) {
      triggerHapticFeedback('add');
      triggerSoundFeedback('add');
      const newWord = pendingWord + draggedLetter;
      handleWordChange(newWord);
    }
    setDraggedLetter(null);
  }, [draggedLetter, pendingWord, handleWordChange]);

  const handleLetterRemove = useCallback((info: { letter: string; index: number }) => {
    if (!isPlayerTurn || isProcessingMove) {
      return;
    }
    
    if (disableLetterRemoval) {
      console.log('[Tutorial] Letter removal disabled in Step 3');
      return;
    }
    
    if (info.index < 0 || info.index >= pendingWord.length) {
      return;
    }
    
    const letters = pendingWord.split('');
    letters.splice(info.index, 1);
    const newWord = letters.join('');
    
    handleWordChange(newWord);
  }, [isPlayerTurn, isProcessingMove, pendingWord, handleWordChange, disableLetterRemoval]);

  // Determine if submit is valid
  const isValidSubmit = pendingMoveAttempt?.canApply || false;

  // The X should always be clickable unless we have a valid move to submit
  // This allows users to pass even without attempting to change the word
  const showInvalidX = !isValidSubmit;

  const handleSubmit = useCallback(async () => {
    
    if (!isPlayerTurn || isProcessingMove) return;

    // Shortcut: tapping the X while the word in play is unchanged from the
    // last played word clears all letters instead of trying to submit/pass -
    // a quick "remove all letters" gesture. Compare the words directly
    // (rather than actionState) since actionState is only populated for
    // valid, scoreable moves - an invalid in-progress edit (e.g. an
    // unscoreable word after adding/removing/moving letters) must not be
    // mistaken for "no changes".
    const wordUnchanged = pendingWord === wordState.currentWord;
    if (!isValidSubmit && wordUnchanged && !showValidationError) {
      // First time the player uses this clear shortcut, explain the feature
      // (gated by localStorage so it only ever shows once).
      if (!hasSeenClearHint()) {
        markClearHintSeen();
        showAlert('hints', 'clearWord');
      }
      handleWordChange('');
      return;
    }
    
    // Handle clicking X to pass turn (valid for any non-winning move)
    if (!isValidSubmit) {
      if (!showValidationError) {
        // First click on X shows validation error
        setShowValidationError(true);
        return;
      } else if (showValidationError) {
        // Second click on X (with validation error showing) immediately passes the turn
        actions.passTurn();
        setPendingWord(wordState.currentWord);
        setPendingMoveAttempt(null);
        setShowValidationError(false);
        return;
      }
    }
    
    // Handle normal valid submission
    if (pendingMoveAttempt?.canApply) {
      const success = actions.applyMove(pendingMoveAttempt);
      if (success) {
        triggerHapticFeedback('submit');
        triggerSoundFeedback('submit');
        // Check for unlock triggers when word is successfully submitted
        // (the vanity filter mechanic unlock is handled here via UNLOCK_DEFINITIONS)
        const isProfane = !!wordData?.profanityWords.has(pendingMoveAttempt.newWord.toUpperCase());
        await handleWordSubmission(pendingMoveAttempt.newWord, isProfane);

        // "GUS" boss trigger: report the submitted word to the parent so it can
        // decide whether to start the boss encounter. Only fires for the local
        // player's own submissions in a normal bot game (gated by App).
        if (onBossTrigger && pendingMoveAttempt.newWord.toUpperCase() === 'GUS') {
          onBossTrigger(pendingMoveAttempt.newWord);
        }

        setPendingWord(pendingMoveAttempt.newWord);
        setPendingMoveAttempt(null);
        setShowValidationError(false);
      }
    }
  }, [isPlayerTurn, isProcessingMove, pendingWord, pendingMoveAttempt, actions, wordState.currentWord, showValidationError, handleWordSubmission, wordData, handleWordChange, showAlert, onBossTrigger, isValidSubmit]);

  const handleStartGame = useCallback(async () => {
    await actions.startGame();
    setShowGameEnd(false);
  }, [actions]);

  // Auto-start the game when component mounts (skip welcome screen)
  useEffect(() => {
    if (!isGameActive && !isGameFinished) {
      handleStartGame();
    }
  }, [isGameActive, isGameFinished, handleStartGame]);

  const handleResetGame = useCallback(() => {
    actions.resetGame();
    setPendingWord('');
    setPendingMoveAttempt(null);
    setShowGameEnd(false);
  }, [actions]);

  // Helper function to generate word suggestions
  const generateWordSuggestions = useCallback((currentWord: string): string[] => {
    const currentWordUpper = currentWord.toUpperCase();
    
    // Common variations to try
    const commonVariations = [
      // Add S
      currentWordUpper + 'S',
      // Add common endings
      currentWordUpper + 'ED',
      currentWordUpper + 'ING',
      currentWordUpper + 'ER',
      currentWordUpper + 'LY',
      // Remove last letter if word is long enough
      ...(currentWordUpper.length > 3 ? [currentWordUpper.slice(0, -1)] : []),
      // Common word transformations based on current word
      ...(currentWordUpper === 'CAT' ? ['CATS', 'BAT', 'HAT', 'MAT', 'RAT'] : []),
      ...(currentWordUpper === 'CATS' ? ['CAT', 'BATS', 'HATS', 'MATS', 'RATS'] : []),
      ...(currentWordUpper === 'PLAY' ? ['PLAYS', 'PLAN', 'PLAT', 'CLAY', 'SLAY'] : []),
      ...(currentWordUpper === 'WORD' ? ['WORDS', 'WORK', 'WORN', 'CORD', 'LORD'] : []),
      // Some always valid backup words
      'CAT', 'CATS', 'DOG', 'DOGS', 'PLAY', 'PLAYS', 'GAME', 'GAMES', 'WORD', 'WORDS'
    ];
    
    // Filter to only valid dictionary words and not already used
    const validSuggestions = commonVariations.filter(word => 
      isValidDictionaryWord(word) && 
      !wordState.usedWords.includes(word) &&
      word !== currentWordUpper
    );
    
    // Remove duplicates and return first 8
    return [...new Set(validSuggestions)].slice(0, 8);
  }, [wordState.usedWords, isValidDictionaryWord]);

  const handleMenuClose = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  const handleResign = useCallback(() => {
    // Resigning counts as a loss for the player's lifetime stats log - record
    // it now, since a resigned game never reaches gameStatus 'finished' and
    // would otherwise leave no trace at all.
    if (gameState.gameStatus === 'playing') {
      const localId = localPlayerId ?? 'human';
      const humanScore = gameState.players.find(p => p.id === localId)?.score || 0;
      const gameDurationMs = gameState.gameStartTime
        ? Date.now() - gameState.gameStartTime
        : null;
      recordGameResult({
        playerId: localId,
        botId: config?.botId,
        won: false,
        tied: false,
        turnHistory: gameState.turnHistory,
        totalTurns: gameState.totalMoves,
        finalScore: humanScore,
        gameDurationMs,
        timestamp: Date.now()
      }).catch(err => console.warn('Failed to record resigned game stats:', err));
    }

    // Call the parent's resign handler to show quitter overlay
    if (onResign) {
      onResign();
    }
  }, [onResign, gameState, localPlayerId, config?.botId, recordGameResult]);

  const handleOwnNameTap = useCallback(() => {
    setIsRenamingSelf(true);
  }, []);

  const handleRenameSubmit = useCallback(async (name: string) => {
    await setDisplayName(name);
    markDisplayNameConfirmed();
    setIsRenamingSelf(false);
  }, []);

  const handleRenameCancel = useCallback(() => {
    setIsRenamingSelf(false);
  }, []);

  return (
    <div
      className={
        'interactive-game' +
        (isDrunkOn ? ' interactive-game--drunk' : '') +
        (bossEffectTier !== 'none' ? ` interactive-game--boss-${bossEffectTier}` : '') +
        (isBossBattle ? ' interactive-game--boss-battle' : '')
      }
      data-boss-stage={isBossBattle ? bossStage : undefined}
    >
      {/* Gigaboss old-school boss reveal: the background stays black, but
          periodically a "lightning strike" flashes it gray, and during the
          flash a flat 2D boss silhouette (with faint glowing eyes) becomes
          visible against the gray. Pure CSS/SVG, no art assets. The board
          always sits above this. */}
      {bossEffectTier === 'giga' && (
        <div className="boss-monster-bg" aria-hidden="true">
          {/* Lightning flash layer - sits behind the silhouette so the flash
              lights the background the silhouette is drawn against. */}
          <div className="boss-monster-bg__lightning" />
          {/* Flat 2D boss silhouette (solid black) + glowing eyes. Same black
              as the giga bg so it's invisible until the flash lights it up. */}
          <svg
            className="boss-monster-bg__silhouette"
            viewBox="0 0 240 300"
            preserveAspectRatio="xMidYMax meet"
          >
            <path
              className="boss-monster-bg__body"
              d="M 30 38 L 64 96 L 80 100 Q 120 74 160 100 L 176 96 L 210 38 L 197 112 L 224 140 L 207 154 L 216 200 L 199 236 L 189 300 L 51 300 L 41 236 L 24 200 L 33 154 L 16 140 L 43 112 Z"
            />
            {/* Eyes: cut out of the body via evenodd so the flash (or a faint
                red glow) shows through, classic glowing-eye boss effect. */}
            <path
              className="boss-monster-bg__eyes"
              d="M 92 112 L 108 120 L 92 128 Z M 148 112 L 132 120 L 148 128 Z"
            />
          </svg>
        </div>
      )}

      {/* Score bar - shows all players' names/avatars and scores */}
      <ScoreBar
        players={gameState.players}
        botId={config?.botId}
        isMultiplayer={currentGameMode === 'multiplayer'}
        currentRound={gameState.currentTurn}
        localPlayerId={localPlayerId}
        onOwnNameTap={handleOwnNameTap}
      />

      {/* Rename overlay - reuses the same banner used to pick a name the
          first time, reopened here when the player taps their own name. */}
      <NamePromptOverlay
        isVisible={isRenamingSelf}
        defaultName={getVanityName()}
        onSubmit={handleRenameSubmit}
        title="Change your name"
        subtitle="Opponents will see this"
        submitLabel="Save"
        onCancel={handleRenameCancel}
      />

      {/* Error display */}
      {lastError && (
        <div className="interactive-game__error" role="alert">
          <span>{lastError}</span>
          <button onClick={clearError} aria-label="Dismiss error">×</button>
        </div>
      )}

      {/* Game header - only show when game is finished and in tutorial mode */}
      {isGameFinished && showGameEnd && currentGameMode === 'tutorial' && (
        <div className="interactive-game__header">
          <div className="interactive-game__status">
            <div className="interactive-game__end">
              <h2>Game Over!</h2>
              <div className="interactive-game__winner">
                {gameState.winner ? `${gameState.winner.name} Wins!` : "It's a Tie!"}
              </div>
              <div className="interactive-game__final-scores">
                <div>You: {gameStats.humanScore}</div>
                <div>Bot: {gameStats.botScore}</div>
              </div>
              <button 
                className="interactive-game__reset-btn"
                onClick={currentGameMode === 'tutorial' ? onNavigateHome : handleResetGame}
                type="button"
              >
                {currentGameMode === 'tutorial' ? 'Home' : 'New Game'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main game area */}
      {isGameActive && (
        <div className="interactive-game__board">
          <div className="interactive-game__centered-container">
            {/* Submit anchor - the absolute center point */}
            <div className="interactive-game__submit-anchor">
              <ScoreDisplay
                score={scoreBreakdown}
                actions={actionState}
                isValid={!showInvalidX}
                isPassConfirming={false}
                passReason={null}
                onClick={!isProcessingMove && isPlayerTurn ? handleSubmit : undefined}
                className="interactive-game__score"
                isPassMode={false}
                validationError={pendingMoveAttempt?.validationResult?.userMessage || null}
                showValidationError={showValidationError}
                timerSeconds={
                  isBossBattle
                    ? bossTimeRemaining
                    : (isTimePressureOn && isPlayerTurn ? turnTimeRemaining : null)
                }
              />
            </div>

            {/* Word trail positioned above submit anchor */}
            <div className="interactive-game__word-trail-positioned">
              <WordTrail
                moves={wordTrailMoves}
                showScores={true}
                showTurnNumbers={true}
                maxVisible={5}
              />
            </div>
            
            {/* Word builder positioned below submit anchor. In vs-human
                multiplayer the word in play must stay visible even when
                it's the opponent's turn (unlike vs-bot, where the bot's
                turn is effectively instant), so it's just made read-only
                instead of being hidden entirely. */}
            {(isPlayerTurn || currentGameMode === 'multiplayer') && (
              <div className="interactive-game__word-builder-positioned">
                <div
                  onMouseUp={handleWordBuilderMouseUp}
                  onTouchEnd={handleWordBuilderTouchEnd}
                >
                  <WordBuilder
                    currentWord={pendingWord}
                    wordHighlights={pendingWordHighlights}
                    onWordChange={handleWordChange}
                    onLetterClick={handleLetterRemove}
                    disabled={isProcessingMove || !isPlayerTurn}
                    maxLength={10}
                    minLength={3}
                    isEditing={true}
                  />
                </div>
              </div>
            )}

            {/* Alphabet grid positioned below word builder */}
            <div className="interactive-game__grid-positioned">
              <AlphabetGrid
                letterStates={letterStates}
                onLetterClick={handleLetterClick}
                onActionClick={handleActionClick}
                onLetterDragStart={handleLetterDragStart}
                onLetterDragEnd={handleLetterDragEnd}
                disabled={!isPlayerTurn || isProcessingMove}
                enableDrag={true} // Enable drag for mobile and desktop
                gravityEnabled={isGravityOn}
              />
            </div>
          </div>
        </div>
      )}

      {/* Debug Dialog */}
      <DebugDialog
        isOpen={isDebugDialogOpen}
        onClose={() => setIsDebugDialogOpen(false)}
        gameStats={gameStats}
        wordState={wordState}
        pendingWord={pendingWord}
        pendingMoveAttempt={pendingMoveAttempt}
        isPlayerTurn={isPlayerTurn}
        isBotTurn={isBotTurn}
        isBotThinking={isBotThinking}
        generateWordSuggestions={generateWordSuggestions}
        onWordChange={handleWordChange}
        isProcessingMove={isProcessingMove}
      />

      {/* Menu */}
      <Menu
        isOpen={isMenuOpen}
        onClose={handleMenuClose}
        onDebugOpen={() => setIsDebugDialogOpen(true)}
        onResign={handleResign}
        onNavigateHome={onNavigateHome}
        onStartGame={(gameType, botId) => {
          // Forward bot selection to parent App.tsx
          onStartGame?.(gameType, botId);
        }}
        isInGame={true}
        currentGameMode={currentGameMode}
      />

    </div>
  );
}; 