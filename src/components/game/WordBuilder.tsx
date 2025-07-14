import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { LetterHighlight } from './CurrentWord';
import './WordBuilder.css';
import { LockIcon } from '../ui/LockIcon';

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
  void maxLength;
  void minLength;
  
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastEventTimeRef = useRef<number>(0);
  const lastTouchTimeRef = useRef<number>(0);
  const lastWordRef = useRef<string>(currentWord);
  const inputMethodRef = useRef<string | null>(null);

  // Reset drag state when word changes externally
  useEffect(() => {
    if (currentWord !== lastWordRef.current) {
      setDraggedIndex(null);
      setDropTargetIndex(null);
      setIsDragging(false);
      setDragStartPos({ x: 0, y: 0 });
      inputMethodRef.current = null;
      lastWordRef.current = currentWord;
    }
  }, [currentWord]);

  // Handle touch events with proper preventDefault support
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleNativeTouchMove = (e: TouchEvent) => {
      if (isDragging) {
        e.preventDefault(); // This works because we can control the passive option
      }
    };

    // Add non-passive touch event listener
    container.addEventListener('touchmove', handleNativeTouchMove, { passive: false });

    return () => {
      container.removeEventListener('touchmove', handleNativeTouchMove);
    };
  }, [isDragging]);

  const handleLetterClick = useCallback((index: number) => {
    if (disabled || isDragging) {
      return;
    }

    // Check if letter is locked based on highlights
    const highlight = wordHighlights.find(h => h.index === index);
    const isLocked = highlight?.type === 'locked' || highlight?.type === 'lockedKey';
    if (isLocked) {
      return;
    }

    if (onLetterClick) {
      onLetterClick(index);
    }
  }, [disabled, isDragging, onLetterClick, wordHighlights]);

  const handleMouseDown = useCallback((e: React.MouseEvent, index: number) => {
    if (disabled) return;
    
    if (inputMethodRef.current && inputMethodRef.current !== 'mouse') {
      return;
    }

    inputMethodRef.current = 'mouse';
    setDraggedIndex(index);
    setIsDragging(false);
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setDropTargetIndex(null);
  }, [disabled]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggedIndex === null || !dragStartPos || inputMethodRef.current !== 'mouse') return;

    const deltaX = Math.abs(e.clientX - dragStartPos.x);
    const deltaY = Math.abs(e.clientY - dragStartPos.y);
    const moveDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (moveDistance > 5 && !isDragging) {
      setIsDragging(true);
    }

    if (isDragging && containerRef.current) {
      const elements = containerRef.current.querySelectorAll('[data-letter-index]');
      let newDropTarget = null;
      
      for (let i = 0; i < elements.length; i++) {
        const element = elements[i] as HTMLElement;
        const rect = element.getBoundingClientRect();
        const elementCenter = rect.left + rect.width / 2;
        
        if (e.clientX < elementCenter) {
          newDropTarget = i;
          break;
        }
      }
      
      if (newDropTarget === null) {
        newDropTarget = currentWord.length;
      }
      
      if (newDropTarget !== draggedIndex && newDropTarget !== draggedIndex + 1) {
        setDropTargetIndex(newDropTarget);
      }
    }
  }, [draggedIndex, dragStartPos, isDragging, currentWord.length]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (draggedIndex === null || inputMethodRef.current !== 'mouse') {
      return;
    }

    const eventNow = Date.now();
    if (eventNow - lastEventTimeRef.current > 100) {
      lastEventTimeRef.current = eventNow;

      if (!isDragging) {
        handleLetterClick(draggedIndex);
      } else if (dropTargetIndex !== null) {
        const newLetters = [...currentWord];
        const draggedLetter = newLetters[draggedIndex];
        newLetters.splice(draggedIndex, 1);
        
        const insertIndex = dropTargetIndex > draggedIndex ? dropTargetIndex - 1 : dropTargetIndex;
        newLetters.splice(insertIndex, 0, draggedLetter);
        
        if (onWordChange) {
          onWordChange(newLetters.join(''));
        }
      }

      setDraggedIndex(null);
      setIsDragging(false);
      setDragStartPos({ x: 0, y: 0 });
      setDropTargetIndex(null);
      inputMethodRef.current = null;
    }
  }, [draggedIndex, isDragging, dropTargetIndex, currentWord, onWordChange, handleLetterClick]);

  const handleTouchStart = useCallback((e: React.TouchEvent, index: number) => {
    if (disabled) return;
    
    lastTouchTimeRef.current = Date.now();
    inputMethodRef.current = 'touch';
    
    const touch = e.touches[0];
    setDragStartPos({ x: touch.clientX, y: touch.clientY });
    setDraggedIndex(index);
  }, [disabled]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (draggedIndex !== null && dragStartPos) {
      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - dragStartPos.x);
      const deltaY = Math.abs(touch.clientY - dragStartPos.y);
      
      // Start dragging if moved more than 5 pixels
      if (!isDragging && (deltaX > 5 || deltaY > 5)) {
        setIsDragging(true);
      }
      
      // Update drop target during drag
      if (isDragging && containerRef.current) {
        const elements = containerRef.current.querySelectorAll('[data-letter-index]');
        let newDropTarget = null;
        
        for (let i = 0; i < elements.length; i++) {
          const element = elements[i] as HTMLElement;
          const rect = element.getBoundingClientRect();
          const elementCenter = rect.left + rect.width / 2;
          
          if (touch.clientX < elementCenter) {
            newDropTarget = i;
            break;
          }
        }
        
        // If no element found, drop at the end
        if (newDropTarget === null) {
          newDropTarget = currentWord.length;
        }
        
        // Don't set drop target to the same position as dragged letter
        if (newDropTarget !== draggedIndex && newDropTarget !== draggedIndex + 1) {
          setDropTargetIndex(newDropTarget);
        }
      }
    }
  }, [draggedIndex, dragStartPos, isDragging, currentWord.length]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    
    if (inputMethodRef.current !== 'touch') {
      return;
    }
    
    const eventNow = Date.now();
    if (draggedIndex !== null && eventNow - lastEventTimeRef.current > 100) {
      lastEventTimeRef.current = eventNow;
      
      if (isDragging && dropTargetIndex !== null && dropTargetIndex !== draggedIndex) {
        const letters = currentWord.split('');
        const [movedLetter] = letters.splice(draggedIndex, 1);
        
        const adjustedTargetIndex = dropTargetIndex > draggedIndex ? dropTargetIndex - 1 : dropTargetIndex;
        letters.splice(adjustedTargetIndex, 0, movedLetter);
        
        const newWord = letters.join('');
        if (onWordChange) {
          onWordChange(newWord);
        }
      } else if (!isDragging) {
        handleLetterClick(draggedIndex);
      }
      
      setDraggedIndex(null);
      setIsDragging(false);
      setDragStartPos({ x: 0, y: 0 });
      setDropTargetIndex(null);
      inputMethodRef.current = null;
    }
  }, [draggedIndex, isDragging, dropTargetIndex, currentWord, onWordChange, handleLetterClick]);

  return (
    <div 
      ref={containerRef}
      className="word-builder" 
      data-testid="word-builder"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {currentWord.split('').map((letter, index) => {
        const highlight = wordHighlights.find(h => h.index === index);
        const isKey = highlight?.type === 'key';
        const isLocked = highlight?.type === 'locked';
        const isLockedKey = highlight?.type === 'lockedKey';
        const isCurrentlyDragging = draggedIndex === index;
        const showDropIndicatorBefore = isDragging && dropTargetIndex === index;
        const showDropIndicatorAfter = isDragging && dropTargetIndex === currentWord.length && index === currentWord.length - 1;
        
        return (
          <React.Fragment key={`${letter}-${index}`}>
            {/* Drop indicator before this letter */}
            {showDropIndicatorBefore && (
              <span className="word-builder__drop-indicator">
                |
              </span>
            )}
            
            <span
              data-letter-index={index}
              className={[
                'word-builder__letter',
                isKey && 'word-builder__letter--key',
                isLocked && 'word-builder__letter--locked',
                isLockedKey && 'word-builder__letter--lockedKey',
                isCurrentlyDragging && isDragging && 'word-builder__letter--dragging'
              ].filter(Boolean).join(' ')}
              onMouseDown={(e) => handleMouseDown(e, index)}
              onTouchStart={(e) => handleTouchStart(e, index)}
              style={{
                opacity: isCurrentlyDragging && isDragging ? 0.5 : 1,
                cursor: disabled ? 'default' : 'grab',
                transform: isDragging && dropTargetIndex !== null ? 
                  (index > dropTargetIndex && (draggedIndex === null || index > draggedIndex) ? 'translateX(16px)' :
                   index >= dropTargetIndex && draggedIndex !== null && index < draggedIndex ? 'translateX(16px)' :
                   'translateX(0)') : 'translateX(0)',
                transition: 'transform 0.2s ease'
              }}
            >
              {letter}
                          {(isLocked || isLockedKey) && (
              <span className="word-builder__lock-badge">
                <LockIcon size={20} />
              </span>
            )}
            </span>
            
            {/* Drop indicator after the last letter */}
            {showDropIndicatorAfter && (
              <span className="word-builder__drop-indicator">
                |
              </span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}; 