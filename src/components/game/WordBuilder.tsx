import React, { useState, useCallback, useRef, useEffect } from 'react';
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
  const [activeInputMethod, setActiveInputMethod] = useState<'touch' | 'mouse' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastEventTimeRef = useRef<number>(0);
  const lastTouchTimeRef = useRef<number>(0);
  const lastWordRef = useRef<string>(currentWord);

  // Reset drag state when word changes externally
  useEffect(() => {
    if (lastWordRef.current !== currentWord) {
      console.log('🔄 WordBuilder: Word changed externally, resetting drag state', {
        oldWord: lastWordRef.current,
        newWord: currentWord
      });
      setDraggedIndex(null);
      setIsDragging(false);
      setDragStartPos(null);
      setDropTargetIndex(null);
      setActiveInputMethod(null);
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
    console.log('🔤 WordBuilder handleLetterClick called:', {
      index,
      disabled,
      isDragging,
      timestamp: Date.now()
    });
    
    if (disabled || isDragging) {
      console.log('❌ WordBuilder handleLetterClick skipped - disabled or dragging');
      return;
    }
    
    // Check if this letter is locked (either regular locked or locked key letter)
    const highlight = wordHighlights.find(h => h.index === index);
    if (highlight?.type === 'locked' || highlight?.type === 'lockedKey') {
      console.log('❌ WordBuilder handleLetterClick skipped - letter is locked');
      return;
    }
    
    console.log('📤 WordBuilder calling onLetterClick prop');
    onLetterClick?.(index);
  }, [disabled, isDragging, onLetterClick, wordHighlights]);

  const handleMouseDown = useCallback((e: React.MouseEvent, index: number) => {
    const now = Date.now();
    const timeSinceTouch = now - lastTouchTimeRef.current;
    
    if (disabled || activeInputMethod === 'touch' || timeSinceTouch < 300) {
      console.log('🖱️ WordBuilder handleMouseDown skipped:', {
        disabled,
        activeInputMethod,
        timeSinceTouch,
        reason: disabled ? 'disabled' : activeInputMethod === 'touch' ? 'touch active' : 'touch within 300ms'
      });
      return;
    }
    
    console.log('🖱️ WordBuilder handleMouseDown - setting input method to mouse');
    setActiveInputMethod('mouse');
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setDraggedIndex(index);
  }, [disabled, activeInputMethod]);

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
    const now = Date.now();
    const timeSinceTouch = now - lastTouchTimeRef.current;
    
    console.log('🖱️ WordBuilder handleMouseUp:', {
      timestamp: now,
      draggedIndex,
      isDragging,
      dropTargetIndex,
      activeInputMethod,
      timeSinceLastEvent: now - lastEventTimeRef.current,
      timeSinceTouch,
      eventType: 'mouse'
    });
    
    e.stopPropagation(); // Prevent bubbling to parent drag handlers
    
    if (activeInputMethod !== 'mouse' || timeSinceTouch < 300) {
      console.log('❌ WordBuilder skipping mouse event:', {
        activeInputMethod,
        timeSinceTouch,
        reason: activeInputMethod !== 'mouse' ? 'not active input method' : 'touch within 300ms'
      });
      return;
    }
    
    const eventNow = Date.now();
    if (draggedIndex !== null && eventNow - lastEventTimeRef.current > 100) {
      console.log('✅ WordBuilder processing mouse event - conditions met');
      lastEventTimeRef.current = eventNow;
      
      if (isDragging && dropTargetIndex !== null && dropTargetIndex !== draggedIndex) {
        console.log('🔄 WordBuilder handling drag operation');
        // Handle drag operation using the calculated drop target
        const letters = currentWord.split('');
        const [movedLetter] = letters.splice(draggedIndex, 1);
        
        // Adjust target index if we're moving from left to right
        const adjustedTargetIndex = dropTargetIndex > draggedIndex ? dropTargetIndex - 1 : dropTargetIndex;
        letters.splice(adjustedTargetIndex, 0, movedLetter);
        
        const newWord = letters.join('');
        onWordChange?.(newWord);
      } else if (!isDragging) {
        console.log('🎯 WordBuilder handling click operation - calling handleLetterClick');
        // Handle click operation
        handleLetterClick(draggedIndex);
      }
      
      // Reset all state including input method
      setDraggedIndex(null);
      setIsDragging(false);
      setDragStartPos(null);
      setDropTargetIndex(null);
      setActiveInputMethod(null);
      console.log('🔄 WordBuilder reset input method to null (mouse end)');
    } else {
      console.log('❌ WordBuilder skipping mouse event - conditions not met');
    }
  }, [draggedIndex, isDragging, dropTargetIndex, currentWord, onWordChange, handleLetterClick, activeInputMethod]);

  const handleTouchStart = useCallback((e: React.TouchEvent, index: number) => {
    if (disabled) return;
    
    // Record touch timestamp for 300ms mouse lockout
    lastTouchTimeRef.current = Date.now();
    console.log('👆 WordBuilder handleTouchStart - setting input method to touch, timestamp:', lastTouchTimeRef.current);
    setActiveInputMethod('touch');
    
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
    console.log('👆 WordBuilder handleTouchEnd:', {
      timestamp: Date.now(),
      draggedIndex,
      isDragging,
      dropTargetIndex,
      activeInputMethod,
      timeSinceLastEvent: Date.now() - lastEventTimeRef.current,
      eventType: 'touch'
    });
    
    e.stopPropagation(); // Prevent bubbling to parent drag handlers
    
    if (activeInputMethod !== 'touch') {
      console.log('❌ WordBuilder skipping touch event - not active input method');
      return;
    }
    
    const eventNow = Date.now();
    if (draggedIndex !== null && eventNow - lastEventTimeRef.current > 100) {
      console.log('✅ WordBuilder processing touch event - conditions met');
      lastEventTimeRef.current = eventNow;
      
      if (isDragging && dropTargetIndex !== null && dropTargetIndex !== draggedIndex) {
        console.log('🔄 WordBuilder handling touch drag operation');
        // Handle drag operation using the calculated drop target
        const letters = currentWord.split('');
        const [movedLetter] = letters.splice(draggedIndex, 1);
        
        // Adjust target index if we're moving from left to right
        const adjustedTargetIndex = dropTargetIndex > draggedIndex ? dropTargetIndex - 1 : dropTargetIndex;
        letters.splice(adjustedTargetIndex, 0, movedLetter);
        
        const newWord = letters.join('');
        onWordChange?.(newWord);
      } else if (!isDragging) {
        console.log('🎯 WordBuilder handling touch tap operation - calling handleLetterClick');
        // Handle tap operation
        handleLetterClick(draggedIndex);
      }
      
      // Reset all state including input method
      setDraggedIndex(null);
      setIsDragging(false);
      setDragStartPos(null);
      setDropTargetIndex(null);
      setActiveInputMethod(null);
      console.log('🔄 WordBuilder reset input method to null (touch end)');
    } else {
      console.log('❌ WordBuilder skipping touch event - conditions not met');
    }
  }, [draggedIndex, isDragging, dropTargetIndex, currentWord, onWordChange, handleLetterClick, activeInputMethod]);

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
                <span className="word-builder__lock-badge">🔒</span>
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