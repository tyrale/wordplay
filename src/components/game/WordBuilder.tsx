import React, { useState, useCallback, useRef } from 'react';
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
  void onLetterClick;
  void maxLength;
  void minLength;
  
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((_e: React.MouseEvent, index: number) => {
    if (disabled) return;
    setDraggedIndex(index);
  }, [disabled]);

  const handleTouchStart = useCallback((_e: React.TouchEvent, index: number) => {
    if (disabled) return;
    setDraggedIndex(index);
  }, [disabled]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (draggedIndex !== null && containerRef.current) {
      const elements = containerRef.current.querySelectorAll('[data-letter-index]');
      
      for (let i = 0; i < elements.length; i++) {
        const element = elements[i] as HTMLElement;
        const rect = element.getBoundingClientRect();
        
        if (e.clientX >= rect.left && e.clientX <= rect.right &&
            e.clientY >= rect.top && e.clientY <= rect.bottom) {
          const targetIndex = parseInt(element.getAttribute('data-letter-index') || '', 10);
          
          if (!isNaN(targetIndex) && targetIndex !== draggedIndex) {
            // Reorder letters
            const letters = currentWord.split('');
            const [movedLetter] = letters.splice(draggedIndex, 1);
            letters.splice(targetIndex, 0, movedLetter);
            
            const newWord = letters.join('');
            onWordChange?.(newWord);
          }
          break;
        }
      }
    }
    setDraggedIndex(null);
  }, [draggedIndex, currentWord, onWordChange]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (draggedIndex !== null && containerRef.current && e.changedTouches[0]) {
      const touch = e.changedTouches[0];
      const elements = containerRef.current.querySelectorAll('[data-letter-index]');
      
      for (let i = 0; i < elements.length; i++) {
        const element = elements[i] as HTMLElement;
        const rect = element.getBoundingClientRect();
        
        if (touch.clientX >= rect.left && touch.clientX <= rect.right &&
            touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
          const targetIndex = parseInt(element.getAttribute('data-letter-index') || '', 10);
          
          if (!isNaN(targetIndex) && targetIndex !== draggedIndex) {
            // Reorder letters
            const letters = currentWord.split('');
            const [movedLetter] = letters.splice(draggedIndex, 1);
            letters.splice(targetIndex, 0, movedLetter);
            
            const newWord = letters.join('');
            onWordChange?.(newWord);
          }
          break;
        }
      }
    }
    setDraggedIndex(null);
  }, [draggedIndex, currentWord, onWordChange]);

  return (
    <div 
      ref={containerRef}
      className="word-builder" 
      data-testid="word-builder"
      onMouseUp={handleMouseUp}
      onTouchEnd={handleTouchEnd}
    >
      {currentWord.split('').map((letter, index) => {
        const highlight = wordHighlights.find(h => h.index === index);
        const isKey = highlight?.type === 'key';
        const isLocked = highlight?.type === 'locked';
        const isDragging = draggedIndex === index;
        
        return (
          <span
            key={`${letter}-${index}`}
            data-letter-index={index}
            className={[
              'word-builder__letter',
              isKey && 'word-builder__letter--key',
              isLocked && 'word-builder__letter--locked',
              isDragging && 'word-builder__letter--dragging'
            ].filter(Boolean).join(' ')}
            onMouseDown={(e) => handleMouseDown(e, index)}
            onTouchStart={(e) => handleTouchStart(e, index)}
            style={{
              opacity: isDragging ? 0.5 : 1,
              cursor: disabled ? 'default' : 'grab'
            }}
          >
            {letter}
            {isLocked && ' 🔒'}
          </span>
        );
      })}
    </div>
  );
}; 