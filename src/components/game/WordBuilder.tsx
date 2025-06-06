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
  void maxLength;
  void minLength;
  
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleLetterClick = useCallback((index: number) => {
    if (disabled || isDragging) return;
    onLetterClick?.(index);
  }, [disabled, isDragging, onLetterClick]);

  const handleMouseDown = useCallback((e: React.MouseEvent, index: number) => {
    if (disabled) return;
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setDraggedIndex(index);
  }, [disabled]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggedIndex !== null && dragStartPos) {
      const deltaX = Math.abs(e.clientX - dragStartPos.x);
      const deltaY = Math.abs(e.clientY - dragStartPos.y);
      
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
          
          if (e.clientX < elementCenter) {
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

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (draggedIndex !== null) {
      if (isDragging && containerRef.current) {
        // Handle drag operation
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
      } else if (!isDragging) {
        // Handle click operation
        handleLetterClick(draggedIndex);
      }
    }
    
    // Reset all drag state
    setDraggedIndex(null);
    setIsDragging(false);
    setDragStartPos(null);
    setDropTargetIndex(null);
  }, [draggedIndex, isDragging, currentWord, onWordChange, handleLetterClick]);

  const handleTouchStart = useCallback((e: React.TouchEvent, index: number) => {
    if (disabled) return;
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
        e.preventDefault(); // Prevent scrolling
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
    if (draggedIndex !== null) {
      if (isDragging && containerRef.current && e.changedTouches[0]) {
        // Handle drag operation
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
      } else if (!isDragging) {
        // Handle tap operation
        handleLetterClick(draggedIndex);
      }
    }
    
    // Reset all drag state
    setDraggedIndex(null);
    setIsDragging(false);
    setDragStartPos(null);
    setDropTargetIndex(null);
  }, [draggedIndex, isDragging, currentWord, onWordChange, handleLetterClick]);

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
              {isLocked && ' 🔒'}
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