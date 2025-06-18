# WordPlay Unlock System Documentation

## Overview

The WordPlay unlock system is a comprehensive feature progression system that allows players to unlock new themes, game mechanics, and bot opponents through gameplay. The system is fully implemented for **themes** and **bots**, but **mechanics** are defined but not yet implemented in game logic.

## Current Implementation Status

### ✅ **Fully Implemented**

#### **Themes (81 unlocks)**
- **Status**: Complete implementation with immediate application
- **Triggers**: Playing color/theme names (e.g., "red", "blue", "midnight")
- **Behavior**: 
  - Unlocks theme in menu system
  - Immediately applies theme when unlocked
  - Persists across browser sessions
  - Shows toast notification: "🎉 Theme Unlocked! You've unlocked 'Red'. Check it out in the menu!"

#### **Bots (11+ unlocks)**
- **Status**: Complete implementation with progressive difficulty
- **Triggers**: 
  - **Achievement-based**: Beat previous bot to unlock next (tester → easy → medium → hard → expert)
  - **Word-based**: Play specific words (e.g., "pirate" unlocks pirate-bot)
- **Behavior**:
  - Unlocks bot in both main menu and settings menu
  - Progressive difficulty curve through achievements
  - Themed bots through word triggers
  - Shows toast notification: "🎉 Bot Unlocked! You've unlocked 'Easy Bot'. Check it out in the menu!"

### 🚧 **Partially Implemented (Unlocks Only)**

#### **Mechanics (6 defined)**
- **Status**: Unlock system works, but no game logic implementation
- **What Works**:
  - ✅ Unlock tracking (playing trigger words unlocks mechanics)
  - ✅ Toast notifications
  - ✅ Menu display with proper names
  - ✅ Persistence across sessions
- **What's Missing**:
  - ❌ GameConfig integration
  - ❌ UI controls to select mechanics
  - ❌ Actual game logic implementation
  - ❌ Game behavior changes

## Detailed Unlock Definitions

### **Theme Unlocks**
All themes unlock by playing the theme name and immediately apply:

| Trigger Word | Theme Name | Immediate Effect |
|--------------|------------|------------------|
| "red" | Red | ✅ Applied immediately |
| "blue" | Blue | ✅ Applied immediately |
| "green" | Green | ✅ Applied immediately |
| "purple" | Purple | ✅ Applied immediately |
| "orange" | Orange | ✅ Applied immediately |
| "yellow" | Yellow | ✅ Applied immediately |
| "pink" | Pink | ✅ Applied immediately |
| "brown" | Brown | ✅ Applied immediately |
| "black" | Black | ✅ Applied immediately |
| "white" | White | ✅ Applied immediately |
| "gray" | Gray | ✅ Applied immediately |
| "silver" | Silver | ✅ Applied immediately |
| "gold" | Gold | ✅ Applied immediately |
| "bronze" | Bronze | ✅ Applied immediately |
| "copper" | Copper | ✅ Applied immediately |
| "crimson" | Crimson | ✅ Applied immediately |
| "scarlet" | Scarlet | ✅ Applied immediately |
| "maroon" | Maroon | ✅ Applied immediately |
| "navy" | Navy | ✅ Applied immediately |
| "teal" | Teal | ✅ Applied immediately |
| "cyan" | Cyan | ✅ Applied immediately |
| "lime" | Lime | ✅ Applied immediately |
| "olive" | Olive | ✅ Applied immediately |
| "forest" | Forest | ✅ Applied immediately |
| "mint" | Mint | ✅ Applied immediately |
| "sage" | Sage | ✅ Applied immediately |
| "lavender" | Lavender | ✅ Applied immediately |
| "violet" | Violet | ✅ Applied immediately |
| "indigo" | Indigo | ✅ Applied immediately |
| "magenta" | Magenta | ✅ Applied immediately |
| "rose" | Rose | ✅ Applied immediately |
| "coral" | Coral | ✅ Applied immediately |
| "salmon" | Salmon | ✅ Applied immediately |
| "peach" | Peach | ✅ Applied immediately |
| "cream" | Cream | ✅ Applied immediately |
| "beige" | Beige | ✅ Applied immediately |
| "tan" | Tan | ✅ Applied immediately |
| "khaki" | Khaki | ✅ Applied immediately |
| "rust" | Rust | ✅ Applied immediately |
| "amber" | Amber | ✅ Applied immediately |
| "honey" | Honey | ✅ Applied immediately |
| "lemon" | Lemon | ✅ Applied immediately |
| "canary" | Canary | ✅ Applied immediately |
| "mustard" | Mustard | ✅ Applied immediately |
| "chartreuse" | Chartreuse | ✅ Applied immediately |
| "emerald" | Emerald | ✅ Applied immediately |
| "jade" | Jade | ✅ Applied immediately |
| "turquoise" | Turquoise | ✅ Applied immediately |
| "aqua" | Aqua | ✅ Applied immediately |
| "sky" | Sky | ✅ Applied immediately |
| "azure" | Azure | ✅ Applied immediately |
| "cobalt" | Cobalt | ✅ Applied immediately |
| "royal" | Royal | ✅ Applied immediately |
| "sapphire" | Sapphire | ✅ Applied immediately |
| "periwinkle" | Periwinkle | ✅ Applied immediately |
| "lilac" | Lilac | ✅ Applied immediately |
| "plum" | Plum | ✅ Applied immediately |
| "grape" | Grape | ✅ Applied immediately |
| "wine" | Wine | ✅ Applied immediately |
| "burgundy" | Burgundy | ✅ Applied immediately |
| "mauve" | Mauve | ✅ Applied immediately |
| "fuchsia" | Fuchsia | ✅ Applied immediately |
| "hot" | Hot | ✅ Applied immediately |
| "neon" | Neon | ✅ Applied immediately |
| "electric" | Electric | ✅ Applied immediately |
| "bright" | Bright | ✅ Applied immediately |
| "pastel" | Pastel | ✅ Applied immediately |
| "muted" | Muted | ✅ Applied immediately |
| "dark" | Dark | ✅ Applied immediately |
| "light" | Light | ✅ Applied immediately |
| "deep" | Deep | ✅ Applied immediately |
| "pale" | Pale | ✅ Applied immediately |
| "vivid" | Vivid | ✅ Applied immediately |
| "soft" | Soft | ✅ Applied immediately |
| "bold" | Bold | ✅ Applied immediately |
| "subtle" | Subtle | ✅ Applied immediately |
| "warm" | Warm | ✅ Applied immediately |
| "cool" | Cool | ✅ Applied immediately |
| "earth" | Earth | ✅ Applied immediately |
| "ocean" | Ocean | ✅ Applied immediately |
| "sunset" | Sunset | ✅ Applied immediately |
| "sunrise" | Sunrise | ✅ Applied immediately |
| "twilight" | Twilight | ✅ Applied immediately |
| "dawn" | Dawn | ✅ Applied immediately |
| "dusk" | Dusk | ✅ Applied immediately |
| "midnight" | Midnight | ✅ Applied immediately |

### **Bot Unlocks**

#### **Achievement-Based Progression**
| Achievement | Unlocks | Status |
|-------------|---------|--------|
| beat_tester | Easy Bot | ✅ Implemented |
| beat_easy_bot | Medium Bot | ✅ Implemented |
| beat_medium_bot | Hard Bot | ✅ Implemented |
| beat_hard_bot | Expert Bot | ✅ Implemented |

#### **Word-Based Themed Bots**
| Trigger Word | Bot | Status |
|--------------|-----|--------|
| "pirate" | Pirate Bot | ✅ Implemented |
| "chaos" | Chaos Bot | ✅ Implemented |
| "puzzle" | Puzzle Bot | ✅ Implemented |
| "speed" | Speed Bot | ✅ Implemented |
| "creative" | Creative Bot | ✅ Implemented |
| "vowel" | Vowel Bot | ✅ Implemented |
| "rhyme" | Rhyme Bot | ✅ Implemented |

### **Mechanic Unlocks (Defined But Not Implemented)**

| Trigger Word | Mechanic ID | Display Name | Intended Behavior | Implementation Status |
|--------------|-------------|--------------|-------------------|----------------------|
| "five" | `5-letter-start` | "5 letter starting word" | Start games with 5-letter words | ❌ Not implemented |
| "six" | `6-letter-start` | "6 letter starting word" | Start games with 6-letter words | ❌ Not implemented |

## Technical Architecture

### **Unlock System Components**

1. **Core Engine** (`packages/engine/unlocks.ts`)
   - Platform-agnostic unlock logic
   - Dependency injection pattern
   - State management and persistence

2. **Unlock Definitions** (`packages/engine/unlock-definitions.ts`)
   - All unlock rules and triggers
   - Initial state configuration
   - Trigger-to-unlock mappings

3. **Platform Adapters**
   - **Browser**: IndexedDB with localStorage fallback
   - **Node.js**: File system storage
   - **Test**: In-memory with controlled state

4. **React Integration**
   - **useUnlocks Hook**: State management for React
   - **UnlockProvider**: Context provider with theme integration
   - **Toast System**: Visual feedback for unlocks

### **Data Flow**

```
Player Action → Unlock Engine → State Update → UI Update → Toast Notification
     ↓              ↓              ↓            ↓              ↓
Play "red"    → Check triggers → Add to state → Update menu → Show toast
```

### **Current GameConfig Interface**

```typescript
export interface GameConfig {
  maxTurns?: number;
  initialWord?: string;
  players?: Player[];
  allowBotPlayer?: boolean;
  enableKeyLetters?: boolean;
  enableLockedLetters?: boolean;
  allowProfanity?: boolean;
  // ❌ MISSING: Mechanics support
}
```

### **Required for Mechanics Implementation**

```typescript
export interface GameConfig {
  // ... existing properties ...
  enabledMechanics?: string[];     // ← NEEDED
  startingWordLength?: number;     // ← NEEDED  
  timeLimit?: number;              // ← NEEDED
  keyLetterCount?: number;         // ← NEEDED
  scoringMode?: 'normal' | 'reverse'; // ← NEEDED
}
```

## Testing Status

### **Comprehensive Test Coverage**
- ✅ **15 unlock-related tests passing**
- ✅ **Core engine tests** (7 integration tests)
- ✅ **React integration tests** (3 component tests)
- ✅ **Theme filtering tests** (5 test cases)
- ✅ **Toast notification tests** (4 test cases)

### **Cross-Platform Verification**
- ✅ **Browser**: IndexedDB persistence working
- ✅ **Test Environment**: Fallback to initial state working
- ✅ **Error Handling**: Graceful fallbacks implemented

## User Experience

### **Fresh User Experience**
- **Themes**: Only "Classic Blue" available
- **Bots**: Only "Tester" bot available  
- **Mechanics**: None available (empty section)

### **Progressive Disclosure**
- **Menu sections appear** as items are unlocked
- **Toast notifications** provide immediate feedback
- **Persistent state** across browser sessions
- **Immediate theme application** for visual feedback

### **Unlock Feedback**
```
🎉 Theme Unlocked! You've unlocked "Red". Check it out in the menu!
🎉 Bot Unlocked! You've unlocked "Easy Bot". Check it out in the menu!
🎉 Mechanic Unlocked! You've unlocked "5 Letter Start". Check it out in the menu!
```

## Future Implementation Ideas

### **New Mechanic Ideas**

#### **Unlock Mechanics**
- [ ] **`reset-unlocks`** - Disable all progress on unlocked items. Player must re-earn all unlocks (trigger: "reset")
- [ ] **`display-unlocks`** - Reveals all possible unlocks in the menu, but names and colors are redacted. Players can see the unlocks they have not achieved, but can not see what they are. (trigger: "unlock")
- [ ] **`full-unlock`** - Unlocks all possible unlocked items (trigger: "revelation")

#### **Word Length Mechanics**
- [ ] **`3-letter-start`** - Start with 3-letter words (trigger: "three")
- [ ] **`7-letter-start`** - Start with 7-letter words (trigger: "seven")
- [ ] **`random-length`** - Random starting word length (trigger: "starts")

#### **Turn Mechanics**
- [ ] **`extra-turns`** - 15 turns instead of 10 (trigger: "extra")
- [ ] **`quick-game`** - 5 turns only (trigger: "quick")
- [ ] **`endless-mode`** - No turn limit (trigger: "endless")

### **New Bot Ideas**

#### **Themed Bots**
- [ ] **`ninja-bot`** - Silent, strategic moves (trigger: "ninja")
- [ ] **`wizard-bot`** - Magic-themed words (trigger: "wizard")
- [ ] **`robot-bot`** - Tech-themed words (trigger: "robot")
- [ ] **`animal-bot`** - Animal words only (trigger: "animal")
- [ ] **`food-bot`** - Food words only (trigger: "food")
- [ ] **`music-bot`** - Music-themed words (trigger: "music")
- [ ] **`sports-bot`** - Sports words only (trigger: "sports")

#### **Behavior Bots**
- [ ] **`mirror-bot`** - Copies player strategies (trigger: "mirror")
- [ ] **`opposite-bot`** - Does opposite of player (trigger: "opposite")
- [ ] **`random-bot`** - Completely random moves (trigger: "random")
- [ ] **`defensive-bot`** - Focuses on blocking player (trigger: "defense")
- [ ] **`aggressive-bot`** - High-risk, high-reward (trigger: "aggressive")

#### **Difficulty Progression**
- [ ] **`master-bot`** - Unlocked by beating expert (achievement: `beat_expert_bot`)
- [ ] **`grandmaster-bot`** - Unlocked by beating master (achievement: `beat_master_bot`)
- [ ] **`legendary-bot`** - Final boss bot (achievement: `beat_grandmaster_bot`)

### **New Theme Ideas**

#### **Word-Based Themes**
- [ ] **`random`** - selects a random them at the start of any game mode (trigger: "random")

#### **Achievement-Based Themes**
- [ ] **`champion`** - Gold theme (achievement: `beat_all_bots`)
- [ ] **`perfectionist`** - Special theme (achievement: `perfect_game`)
- [ ] **`speedster`** - Fast theme (achievement: `quick_victory`)

### **New Achievement Ideas**

#### **Performance Achievements**
- [ ] **`perfect_game`** - Win without losing any turns
- [ ] **`quick_victory`** - Win in under 2 minutes
- [ ] **`comeback_king`** - Win after being 20+ points behind
- [ ] **`shutout`** - Win with opponent scoring 0
- [ ] **`high_scorer`** - Score 100+ points in a game

#### **Word Achievements**
- [ ] **`long_word_master`** - Play a 10+ letter word
- [ ] **`vowel_master`** - Play 5 words with all vowels
- [ ] **`consonant_king`** - Play word with no vowels
- [ ] **`palindrome_player`** - Play a palindrome word
- [ ] **`alphabet_soup`** - Use every letter A-Z in one game

#### **Progression Achievements**
- [ ] **`theme_collector`** - Unlock 50 themes
- [ ] **`bot_master`** - Beat all bots
- [ ] **`mechanic_explorer`** - Try all mechanics
- [ ] **`unlock_everything`** - Unlock all content

## Implementation Priority

### **Phase 1: Complete Mechanics Implementation**
1. **Extend GameConfig** interface to support mechanics
2. **Add UI controls** for mechanic selection
3. **Implement core mechanics** (5-letter-start, 6-letter-start, time-pressure)
4. **Update game initialization** logic

### **Phase 2: Enhanced Mechanics**
1. **Double key letters** implementation
2. **Reverse scoring** mode
3. **Longer words** validation changes
4. **Advanced mechanics** from ideas list

### **Phase 3: Extended Content**
1. **New themed bots** with unique behaviors
2. **Seasonal/holiday themes**
3. **Achievement-based unlocks**
4. **Advanced progression systems**

### **Phase 4: Polish & Balance**
1. **Difficulty balancing** for new bots
2. **UI/UX improvements** for mechanic selection
3. **Performance optimization** for complex mechanics
4. **Comprehensive testing** of all combinations

---

## Notes for Developers

### **Adding New Unlocks**

1. **Add to unlock-definitions.ts**:
   ```typescript
   {
     id: 'unlock_new_feature',
     category: 'theme' | 'mechanic' | 'bot',
     trigger: { type: 'word', value: 'trigger', timing: 'word_submission' },
     target: 'feature-id'
   }
   ```

2. **Add display name** (if mechanic/bot):
   ```typescript
   // In Menu.tsx
   const mechanicDisplayNames: Record<string, string> = {
     'feature-id': 'Feature Display Name'
   };
   ```

3. **Implement game logic** (if mechanic):
   - Update GameConfig interface
   - Add UI controls
   - Implement behavior in game state manager

4. **Test thoroughly**:
   - Unlock trigger works
   - Toast notification appears
   - Menu updates correctly
   - Persistence works
   - Game logic functions (if applicable)

### **Current File Locations**
- **Unlock Definitions**: `packages/engine/unlock-definitions.ts`
- **Unlock Engine**: `packages/engine/unlocks.ts`
- **React Integration**: `src/hooks/useUnlocks.ts`, `src/components/unlock/UnlockProvider.tsx`
- **Menu Integration**: `src/components/ui/Menu.tsx`
- **Toast System**: `src/components/ui/Toast.tsx`, `src/components/ui/ToastManager.tsx`
- **Game Config**: `packages/engine/interfaces.ts` (GameConfig interface)

---

*Last Updated: Current implementation status as of unlock system completion* 