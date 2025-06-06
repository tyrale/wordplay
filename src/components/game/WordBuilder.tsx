import React, { useState, useCallback } from 'react';
import type { LetterHighlight } from './CurrentWord';
import './WordBuilder.css';

export interface WordBuilderProps {
  currentWord: string;
  wordHighlights?: LetterHighlight[];
  onWordChange?: (word: string) => void;
  onLetterClick?: (index: number) => void;
  disabled?: boolean;
  maxLength?: number;
  minLength?: number;
}

export interface LetterPosition {
  letter: string;
  id: string;
  isHighlighted?: boolean;
  highlightType?: 'key' | 'locked';
}

export const WordBuilder: React.FC<WordBuilderProps> = ({
  currentWord,
  wordHighlights = [],
  onWordChange,
  onLetterClick,
  disabled = false,
  maxLength = 10,
  minLength = 3
}) => {
  // Suppress unused variable warnings - kept for interface compatibility
  void maxLength;
  void minLength;
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isDragOverContainer, setIsDragOverContainer] = useState(false);

  // Convert word to letter positions
  const letterPositions: LetterPosition[] = currentWord.split('').map((letter, index) => {
    const highlight = wordHighlights.find(h => h.index === index);
    return {
      letter,
      id: `${letter}-${index}`,
      isHighlighted: !!highlight,
      highlightType: highlight?.type
    };
  });

  const handleLetterClick = useCallback((index: number) => {
    if (disabled) return;
    onLetterClick?.(index);
  }, [disabled, onLetterClick]);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    if (disabled) return;
    
    const letter = currentWord[index];
    e.dataTransfer.setData('text/plain', letter);
    e.dataTransfer.setData('application/x-letter-index', index.toString());
    e.dataTransfer.effectAllowed = 'move';
    
    // Add visual feedback
    const target = e.target as HTMLElement;
    target.style.opacity = '0.5';
  }, [disabled, currentWord]);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    setDragOverIndex(null);
    
    // Reset visual feedback
    const target = e.target as HTMLElement;
    target.style.opacity = '1';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (disabled) return;
    
    setDragOverIndex(index);
    e.dataTransfer.dropEffect = 'move';
  }, [disabled]);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (disabled) return;

    const sourceIndexStr = e.dataTransfer.getData('application/x-letter-index');
    const sourceIndex = parseInt(sourceIndexStr, 10);
    
    if (isNaN(sourceIndex) || sourceIndex === dropIndex) {
      setDragOverIndex(null);
      return;
    }

    // Reorder letters
    const letters = currentWord.split('');
    const [movedLetter] = letters.splice(sourceIndex, 1);
    letters.splice(dropIndex, 0, movedLetter);
    
    const newWord = letters.join('');
    onWordChange?.(newWord);
    setDragOverIndex(null);
  }, [disabled, currentWord, onWordChange]);



  // Handle drops from alphabet grid
  const handleContainerDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    
    // Check if this is a letter drag (has both text and source type)
    const hasText = e.dataTransfer.types.includes('text/plain');
    const hasSource = e.dataTransfer.types.includes('application/x-letter-source');
    
    if (hasText && hasSource) {
      e.dataTransfer.dropEffect = 'copy';
      setIsDragOverContainer(true);
    }
  }, [disabled]);

  const handleContainerDragLeave = useCallback((e: React.DragEvent) => {
    // Only hide feedback if leaving the container entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOverContainer(false);
    }
  }, []);

  const handleContainerDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;

    const source = e.dataTransfer.getData('application/x-letter-source');
    const letter = e.dataTransfer.getData('text/plain');
    
    setIsDragOverContainer(false);
    
    if (source === 'alphabet-grid' && letter && currentWord.length < maxLength) {
      const newWord = currentWord + letter;
      onWordChange?.(newWord);
    }
  }, [disabled, currentWord, maxLength, onWordChange]);

  return (
          <div 
        className="word-builder" 
        role="application" 
        aria-label="Interactive word builder"
        onDragOver={handleContainerDragOver}
        onDragLeave={handleContainerDragLeave}
        onDrop={handleContainerDrop}
      >
        <div 
          className="word-builder__container"
          data-drag-over={isDragOverContainer}
        >
        {letterPositions.map((pos, index) => (
          <div
            key={pos.id}
            className={[
              'word-builder__letter',
              pos.isHighlighted && `word-builder__letter--${pos.highlightType}`,
              dragOverIndex === index && 'word-builder__letter--drag-over',
              disabled && 'word-builder__letter--disabled'
            ].filter(Boolean).join(' ')}
            draggable={!disabled && pos.highlightType !== 'locked'}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onClick={() => handleLetterClick(index)}
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-label={`Letter ${pos.letter}${pos.isHighlighted ? ` (${pos.highlightType})` : ''}`}
          >
            <span className="word-builder__letter-content">
              {pos.letter}
            </span>
            
            {pos.highlightType === 'locked' && (
              <span className="word-builder__lock-icon" aria-hidden="true">
                🔒
              </span>
            )}
            
            {dragOverIndex === index && (
              <div className="word-builder__drop-indicator" aria-hidden="true" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}; 