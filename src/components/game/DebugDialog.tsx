import React from 'react';
import { getDictionarySize } from '../../utils/engineAdapter';
import './DebugDialog.css';

export interface DebugDialogProps {
  isOpen: boolean;
  onClose: () => void;
  gameStats: any;
  wordState: any;
  pendingWord: string;
  pendingMoveAttempt: any;
  isPlayerTurn: boolean;
  isBotTurn: boolean;
  isBotThinking: boolean;
  generateWordSuggestions: (word: string) => string[];
  onWordChange: (word: string) => void;
  isProcessingMove: boolean;
}

export const DebugDialog: React.FC<DebugDialogProps> = ({
  isOpen,
  onClose,
  gameStats,
  wordState,
  pendingWord,
  pendingMoveAttempt,
  isPlayerTurn,
  isBotTurn,
  isBotThinking,
  generateWordSuggestions,
  onWordChange,
  isProcessingMove
}) => {
  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="debug-dialog-overlay" onClick={handleOverlayClick}>
      <div className="debug-dialog">
        <div className="debug-dialog__header">
          <h2>Debug Information</h2>
          <button 
            className="debug-dialog__close"
            onClick={onClose}
            aria-label="Close debug dialog"
          >
            ×
          </button>
        </div>
        
        <div className="debug-dialog__content">
          <div className="debug-dialog__section">
            <h3>Dictionary Status</h3>
            <p><strong>Total words available:</strong> {getDictionarySize()}</p>
            <p><strong>Current word:</strong> {wordState.currentWord}</p>
            <p><strong>Used words:</strong> {wordState.usedWords.join(', ')}</p>
          </div>
          
          <div className="debug-dialog__section">
            <h3>Suggested Words to Try</h3>
            <p>Based on current word "{wordState.currentWord}", try these valid words:</p>
            <div className="debug-dialog__word-suggestions">
              {generateWordSuggestions(wordState.currentWord).map(word => (
                <button
                  key={word}
                  onClick={() => onWordChange(word)}
                  className="debug-dialog__suggestion-btn"
                  disabled={!isPlayerTurn || isProcessingMove}
                >
                  {word}
                </button>
              ))}
            </div>
          </div>
          
          <div className="debug-dialog__section">
            <h3>Game State</h3>
            <pre className="debug-dialog__state">
              {JSON.stringify({ 
                gameStats, 
                wordState: {
                  currentWord: wordState.currentWord,
                  keyLetters: wordState.keyLetters,
                  lockedLetters: wordState.lockedLetters,
                  usedWords: wordState.usedWords
                },
                pendingWord,
                pendingMoveAttempt: pendingMoveAttempt ? {
                  isValid: pendingMoveAttempt.isValid,
                  canApply: pendingMoveAttempt.canApply,
                  reason: pendingMoveAttempt.reason
                } : null,
                isPlayerTurn,
                isBotTurn,
                isBotThinking
              }, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}; 