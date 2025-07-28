# Vanity Filter System Documentation

## Overview

The Vanity Filter System provides real-time bad word filtering with user-controlled toggle functionality. This system serves as the **reference implementation** for all future filter systems in the WordPlay game.

## Architecture

### Core Components

1. **Context Provider** (`src/contexts/VanityFilterContext.tsx`)
   - Centralizes all vanity filter state
   - Manages localStorage persistence
   - Provides shared word data loading
   - Exports `useVanityFilter` hook

2. **Hook** (`src/hooks/useVanityFilter.ts`)
   - Consumes context instead of managing local state
   - Provides consistent API for all components
   - Handles loading states gracefully

3. **App Integration** (`src/App.tsx`)
   - Wraps application with `VanityFilterProvider`
   - Ensures all components have access to shared state

### State Management

```typescript
interface VanityState {
  hasUnlockedToggle: boolean;  // Whether user has unlocked the filter
  isVanityFilterOn: boolean;   // Current filter state (on/off)
}
```

## How It Works

### 1. Initialization
- Context provider loads state from localStorage on mount
- Word data is loaded asynchronously from browser adapter
- Default state: `hasUnlockedToggle: false`, `isVanityFilterOn: true`

### 2. Unlock Process
- User plays a profane word (e.g., "shit")
- `shouldWordUnlockVanity()` detects the profane word
- `unlockVanityToggle()` sets `hasUnlockedToggle: true`
- Toast notification informs user of unlock
- Menu toggle becomes visible in mechanics section

### 3. Live Toggle Functionality
- User clicks toggle in menu (mechanics section)
- `toggleVanityFilter()` updates state immediately
- All components using `useVanityFilter()` re-render automatically
- Words change from censored to uncensored (or vice versa) instantly
- No page refresh required

### 4. Persistence
- State changes are automatically saved to localStorage
- Settings persist across browser sessions
- State is restored on page load

## User Experience Flow

### New Users
1. Bad words are automatically censored (filter ON by default)
2. User plays a profane word (e.g., "shit")
3. Toast notification: "Bad Word Filter Unlocked!"
4. Menu shows "bad word filter" toggle in mechanics section
5. User can now toggle filter on/off with immediate effect

### Existing Users
1. Previous filter preference is restored from localStorage
2. Toggle state is immediately available
3. All words display according to saved preference
4. Changes apply live without page refresh

## Component Integration

### Components Using Vanity Filter
- **CurrentWord**: Displays current word with filtering
- **WordTrail**: Shows word history with filtering
- **WordBuilder**: Word building interface with filtering
- **Menu**: Toggle control in mechanics section
- **InteractiveGame**: Unlock detection and notifications
- **ChallengeGame**: Challenge mode integration

### Integration Pattern
```typescript
// All components follow this pattern:
const { getDisplayWord, isVanityFilterUnlocked, isVanityFilterOn, toggleVanityFilter } = useVanityFilter();

// Use getDisplayWord for filtered display
const displayWord = getDisplayWord(word, { isEditing });

// Use other functions as needed
if (isVanityFilterUnlocked() && isVanityFilterOn()) {
  // Filter is unlocked and enabled
}
```

## Technical Implementation

### Context Provider Structure
```typescript
export const VanityFilterProvider: React.FC<VanityFilterProviderProps> = ({ children }) => {
  const [vanityState, setVanityState] = useState<VanityState>(() => {
    // Initialize from localStorage
  });
  
  const [wordData, setWordData] = useState<WordDataDependencies | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Initialize word data
  useEffect(() => {
    // Load word data from browser adapter
  }, []);
  
  // Persist state to localStorage
  useEffect(() => {
    // Save state changes
  }, [vanityState]);

  // Provide context value
  return (
    <VanityFilterContext.Provider value={contextValue}>
      {children}
    </VanityFilterContext.Provider>
  );
};
```

### Hook Implementation
```typescript
export function useVanityFilter(props?: UseVanityFilterProps): UseVanityFilterReturn {
  // Use the centralized context instead of local state
  return useVanityFilterContext();
}
```

## Filter Logic

### Display Logic (`packages/engine/dictionary.ts`)
```typescript
export function getVanityDisplayWordWithDependencies(
  word: string, 
  vanityState: VanityState,
  wordData: WordDataDependencies,
  options: { isEditing?: boolean } = {}
): string {
  const normalizedWord = word.trim().toUpperCase();
  
  // If word is not profane, always show real word
  if (!wordData.profanityWords.has(normalizedWord)) {
    return normalizedWord;
  }
  
  // Word is profane - check vanity filter settings
  // Only show symbols if the filter is ON
  if (vanityState.isVanityFilterOn) {
    return transformToSymbols(normalizedWord);
  } else {
    return normalizedWord;
  }
}
```

### Unlock Detection
```typescript
export function shouldUnlockVanityToggleWithDependencies(
  word: string, 
  wordData: WordDataDependencies
): boolean {
  const normalizedWord = word.trim().toUpperCase();
  return wordData.profanityWords.has(normalizedWord);
}
```

## Template for Future Filters

### Required Components
1. **Context Provider**: `src/contexts/[FilterName]Context.tsx`
2. **Hook**: `src/hooks/use[FilterName].ts`
3. **App Integration**: Wrap with provider in `App.tsx`
4. **Component Updates**: Update all relevant components

### Required Features
1. **Live Updates**: Toggle changes apply immediately
2. **Shared State**: All components use same context
3. **Persistence**: Settings saved to localStorage
4. **Unlock System**: Trigger unlock through gameplay
5. **Menu Integration**: Toggle in mechanics section
6. **Toast Notifications**: User feedback for unlocks

### State Interface Template
```typescript
interface [FilterName]State {
  hasUnlockedToggle: boolean;
  is[FilterName]On: boolean;
}
```

### Hook Interface Template
```typescript
export interface Use[FilterName]Return {
  [filterName]State: [FilterName]State;
  isLoading: boolean;
  getDisplayWord: (word: string, options?: { isEditing?: boolean }) => string;
  toggle[FilterName]: () => void;
  unlock[FilterName]Toggle: () => void;
  is[FilterName]Unlocked: () => boolean;
  is[FilterName]On: () => boolean;
  shouldWordUnlock[FilterName]: (word: string) => boolean;
}
```

## Testing

### Test Structure
```typescript
describe('use[FilterName] with context', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => use[FilterName](), {
      wrapper: [FilterName]Provider
    });
    
    expect(result.current.[filterName]State.hasUnlockedToggle).toBe(false);
    expect(result.current.[filterName]State.is[FilterName]On).toBe(true);
  });

  it('should toggle filter', () => {
    const { result } = renderHook(() => use[FilterName](), {
      wrapper: [FilterName]Provider
    });
    
    act(() => {
      result.current.toggle[FilterName]();
    });
    
    expect(result.current.[filterName]State.is[FilterName]On).toBe(false);
  });
});
```

## Benefits of This Architecture

### 1. Live Updates
- Changes apply immediately without page refresh
- Real-time user feedback
- Smooth user experience

### 2. Shared State
- All components use same filter state
- Consistent behavior across game modes
- No state synchronization issues

### 3. Performance
- Single state source
- No duplicate initialization
- Efficient re-rendering

### 4. Maintainability
- Centralized state management
- Clear separation of concerns
- Easy to extend and modify

### 5. User Experience
- Persistent preferences
- Immediate visual feedback
- Intuitive unlock system

## Future Filter Implementations

When implementing new filters (e.g., slang filter, custom word filter), follow this exact pattern:

1. **Copy the vanity filter structure**
2. **Replace "vanity" with your filter name**
3. **Implement filter-specific logic**
4. **Add unlock triggers**
5. **Update menu integration**
6. **Add comprehensive tests**

This ensures consistency across all filter systems and provides the same high-quality user experience. 