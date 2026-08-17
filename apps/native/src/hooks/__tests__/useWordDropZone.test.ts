import { renderHook } from '@testing-library/react-native';
import { useWordDropZone } from '../useWordDropZone';

describe('native useWordDropZone', () => {
  function attachMockRef(hookResult: ReturnType<typeof useWordDropZone>, bounds: { x: number; y: number; width: number; height: number }) {
    hookResult.wordRef.current = {
      measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) => {
        callback(bounds.x, bounds.y, bounds.width, bounds.height);
      }
    };
  }

  it('calls onHit when the point falls inside the measured bounds', () => {
    const { result } = renderHook(() => useWordDropZone());
    attachMockRef(result.current, { x: 100, y: 200, width: 150, height: 50 });

    const onHit = jest.fn();
    result.current.checkDrop(150, 220, onHit);
    expect(onHit).toHaveBeenCalledTimes(1);
  });

  it('does not call onHit when the point is well outside the bounds', () => {
    const { result } = renderHook(() => useWordDropZone());
    attachMockRef(result.current, { x: 100, y: 200, width: 150, height: 50 });

    const onHit = jest.fn();
    result.current.checkDrop(0, 0, onHit);
    expect(onHit).not.toHaveBeenCalled();
  });

  it('applies a small forgiveness margin around the exact edges', () => {
    const { result } = renderHook(() => useWordDropZone());
    attachMockRef(result.current, { x: 100, y: 200, width: 150, height: 50 });

    const onHit = jest.fn();
    // 10px past the right edge (250) and 10px above the top edge (200) -
    // still within the documented margin.
    result.current.checkDrop(260, 190, onHit);
    expect(onHit).toHaveBeenCalledTimes(1);
  });

  it('does nothing if the word ref has not been attached yet', () => {
    const { result } = renderHook(() => useWordDropZone());
    const onHit = jest.fn();
    expect(() => result.current.checkDrop(100, 100, onHit)).not.toThrow();
    expect(onHit).not.toHaveBeenCalled();
  });
});
