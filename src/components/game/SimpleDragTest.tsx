import React, { useState, useRef } from 'react';

export const SimpleDragTest: React.FC = () => {
  const [items, setItems] = useState([
    { id: '1', color: 'red', label: 'Red' },
    { id: '2', color: 'blue', label: 'Blue' },
    { id: '3', color: 'green', label: 'Green' },
    { id: '4', color: 'yellow', label: 'Yellow' },
    { id: '5', color: 'purple', label: 'Purple' }
  ]);

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (_e: React.MouseEvent, id: string) => {
    setDraggedId(id);
  };

  const handleTouchStart = (_e: React.TouchEvent, id: string) => {
    setDraggedId(id);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (draggedId && containerRef.current) {
      const elements = containerRef.current.querySelectorAll('[data-item-id]');
      
      for (let i = 0; i < elements.length; i++) {
        const element = elements[i] as HTMLElement;
        const rect = element.getBoundingClientRect();
        
        if (e.clientX >= rect.left && e.clientX <= rect.right &&
            e.clientY >= rect.top && e.clientY <= rect.bottom) {
          const targetId = element.getAttribute('data-item-id');
          if (targetId && targetId !== draggedId) {
            // Swap items
            const newItems = [...items];
            const sourceIndex = newItems.findIndex(item => item.id === draggedId);
            const targetIndex = newItems.findIndex(item => item.id === targetId);
            
            const [movedItem] = newItems.splice(sourceIndex, 1);
            newItems.splice(targetIndex, 0, movedItem);
            
            setItems(newItems);
          }
          break;
        }
      }
    }
    setDraggedId(null);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (draggedId && containerRef.current && e.changedTouches[0]) {
      const touch = e.changedTouches[0];
      const elements = containerRef.current.querySelectorAll('[data-item-id]');
      
      for (let i = 0; i < elements.length; i++) {
        const element = elements[i] as HTMLElement;
        const rect = element.getBoundingClientRect();
        
        if (touch.clientX >= rect.left && touch.clientX <= rect.right &&
            touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
          const targetId = element.getAttribute('data-item-id');
          if (targetId && targetId !== draggedId) {
            // Swap items
            const newItems = [...items];
            const sourceIndex = newItems.findIndex(item => item.id === draggedId);
            const targetIndex = newItems.findIndex(item => item.id === targetId);
            
            const [movedItem] = newItems.splice(sourceIndex, 1);
            newItems.splice(targetIndex, 0, movedItem);
            
            setItems(newItems);
          }
          break;
        }
      }
    }
    setDraggedId(null);
  };

  return (
    <div style={{ padding: '20px', border: '2px solid #ccc', margin: '20px 0' }}>
      <h3>Simple Drag Test - Click/Touch and Drag to Reorder</h3>
      <div 
        ref={containerRef}
        style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}
        onMouseUp={handleMouseUp}
        onTouchEnd={handleTouchEnd}
      >
        {items.map((item) => (
          <div
            key={item.id}
            data-item-id={item.id}
            onMouseDown={(e) => handleMouseDown(e, item.id)}
            onTouchStart={(e) => handleTouchStart(e, item.id)}
            style={{
              width: '80px',
              height: '80px',
              backgroundColor: item.color,
              border: '2px solid #333',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'grab',
              opacity: draggedId === item.id ? 0.7 : 1,
              transform: draggedId === item.id ? 'scale(1.05)' : 'scale(1)',
              fontSize: '14px',
              fontWeight: 'bold',
              color: item.color === 'yellow' ? '#333' : '#fff',
              userSelect: 'none',
              touchAction: 'none',
              transition: draggedId === item.id ? 'none' : 'all 0.2s ease'
            }}
          >
            {item.label}
          </div>
        ))}
      </div>
      <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
        Status: {draggedId ? `Dragging ${items.find(i => i.id === draggedId)?.label}` : 'Ready to drag'}
      </p>
    </div>
  );
}; 