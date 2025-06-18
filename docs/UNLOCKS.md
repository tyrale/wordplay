# WordPlay Unlock System Documentation

## Overview

The WordPlay unlock system is a comprehensive feature progression system that allows players to unlock new themes, game mechanics, and bot opponents through gameplay. The system is fully implemented for **themes** and **bots**, but **mechanics** are defined but not yet implemented in game logic.

## Implementation Status

### ✅ Fully Implemented

**Themes (81 unlocks)**
- Complete implementation with immediate application
- Triggers: Playing color/theme names (e.g., "red", "blue", "midnight")
- Immediately applies theme when unlocked and persists across sessions
- Shows toast notification: "🎉 Theme Unlocked! You've unlocked 'Red'. Check it out in the menu!"

**Bots (11+ unlocks)**
- Complete implementation with progressive difficulty
- Achievement-based: Beat previous bot to unlock next (tester → easy → medium → hard → expert)
- Word-based: Play specific words (e.g., "pirate" unlocks pirate-bot)
- Shows toast notification: "🎉 Bot Unlocked! You've unlocked 'Easy Bot'. Check it out in the menu!"

### 🚧 Partially Implemented

**Mechanics (6 defined)**
- ✅ Unlock tracking works (playing trigger words unlocks mechanics)
- ✅ Toast notifications and menu display work
- ✅ Persistence across sessions works
- ❌ GameConfig integration missing
- ❌ UI controls to select mechanics missing
- ❌ Actual game logic implementation missing

## Technical Architecture

### Core Components
1. **Core Engine** (`packages/engine/unlocks.ts`) - Platform-agnostic unlock logic
2. **Unlock Definitions** (`packages/engine/unlock-definitions.ts`) - All unlock rules and triggers
3. **Platform Adapters** - Browser (IndexedDB), Node.js (file system), Test (in-memory)
4. **React Integration** - useUnlocks hook, UnlockProvider, Toast system

### Data Flow
```
Player Action → Unlock Engine → State Update → UI Update → Toast Notification
```

### GameConfig Interface (Current vs Needed)
**Current:**
```typescript
export interface GameConfig {
  maxTurns?: number;
  initialWord?: string;
  players?: Player[];
  allowBotPlayer?: boolean;
  enableKeyLetters?: boolean;
  enableLockedLetters?: boolean;
  allowProfanity?: boolean;
}
```

**Needed for Mechanics:**
```typescript
export interface GameConfig {
  // ... existing properties ...
  enabledMechanics?: string[];
  startingWordLength?: number;
  timeLimit?: number;
  keyLetterCount?: number;
  scoringMode?: 'normal' | 'reverse';
}
```

## User Experience

### Fresh User Experience
- **Themes**: Only "Classic Blue" available
- **Bots**: Only "Tester" bot available
- **Mechanics**: None available (empty section)

### Progressive Disclosure
- Menu sections appear as items are unlocked
- Toast notifications provide immediate feedback
- Persistent state across browser sessions
- Immediate theme application for visual feedback

## Testing Status

### Comprehensive Test Coverage
- ✅ 15 unlock-related tests passing
- ✅ Core engine tests (7 integration tests)
- ✅ React integration tests (3 component tests)
- ✅ Theme filtering tests (5 test cases)
- ✅ Toast notification tests (4 test cases)

### Cross-Platform Verification
- ✅ Browser: IndexedDB persistence working
- ✅ Test Environment: Fallback to initial state working
- ✅ Error Handling: Graceful fallbacks implemented

## For Developers

### Adding New Unlocks

1. **Add to unlock-definitions.ts:**
```typescript
{
  id: 'unlock_new_feature',
  category: 'theme' | 'mechanic' | 'bot',
  trigger: { type: 'word', value: 'trigger', timing: 'word_submission' },
  target: 'feature-id'
}
```

2. **Add display name (if mechanic/bot):**
```typescript
// In Menu.tsx
const mechanicDisplayNames: Record<string, string> = {
  'feature-id': 'Feature Display Name'
};
```

3. **Implement game logic (if mechanic):**
- Update GameConfig interface
- Add UI controls
- Implement behavior in game state manager

### File Locations
- **Unlock Definitions**: `packages/engine/unlock-definitions.ts`
- **Unlock Engine**: `packages/engine/unlocks.ts`
- **React Integration**: `src/hooks/useUnlocks.ts`, `src/components/unlock/UnlockProvider.tsx`
- **Menu Integration**: `src/components/ui/Menu.tsx`
- **Toast System**: `src/components/ui/Toast.tsx`, `src/components/ui/ToastManager.tsx`
- **Game Config**: `packages/engine/interfaces.ts`

---

## Theme Unlocks Checklist

### Basic Colors
- [ ] red - Red theme (✅ Implemented)
- [ ] blue - Blue theme (✅ Implemented)
- [ ] green - Green theme (✅ Implemented)
- [ ] purple - Purple theme (✅ Implemented)
- [ ] orange - Orange theme (✅ Implemented)
- [ ] yellow - Yellow theme (✅ Implemented)
- [ ] pink - Pink theme (✅ Implemented)
- [ ] brown - Brown theme (✅ Implemented)
- [ ] black - Black theme (✅ Implemented)
- [ ] white - White theme (✅ Implemented)
- [ ] gray - Gray theme (✅ Implemented)

### Metallic Colors
- [ ] silver - Silver theme (✅ Implemented)
- [ ] gold - Gold theme (✅ Implemented)
- [ ] bronze - Bronze theme (✅ Implemented)
- [ ] copper - Copper theme (✅ Implemented)

### Specific Shades
- [ ] crimson - Crimson theme (✅ Implemented)
- [ ] scarlet - Scarlet theme (✅ Implemented)
- [ ] maroon - Maroon theme (✅ Implemented)
- [ ] navy - Navy theme (✅ Implemented)
- [ ] teal - Teal theme (✅ Implemented)
- [ ] cyan - Cyan theme (✅ Implemented)
- [ ] lime - Lime theme (✅ Implemented)
- [ ] olive - Olive theme (✅ Implemented)
- [ ] forest - Forest theme (✅ Implemented)
- [ ] mint - Mint theme (✅ Implemented)
- [ ] sage - Sage theme (✅ Implemented)
- [ ] lavender - Lavender theme (✅ Implemented)
- [ ] violet - Violet theme (✅ Implemented)
- [ ] indigo - Indigo theme (✅ Implemented)
- [ ] magenta - Magenta theme (✅ Implemented)
- [ ] rose - Rose theme (✅ Implemented)
- [ ] coral - Coral theme (✅ Implemented)
- [ ] salmon - Salmon theme (✅ Implemented)
- [ ] peach - Peach theme (✅ Implemented)
- [ ] cream - Cream theme (✅ Implemented)
- [ ] beige - Beige theme (✅ Implemented)
- [ ] tan - Tan theme (✅ Implemented)
- [ ] khaki - Khaki theme (✅ Implemented)
- [ ] rust - Rust theme (✅ Implemented)
- [ ] amber - Amber theme (✅ Implemented)
- [ ] honey - Honey theme (✅ Implemented)
- [ ] lemon - Lemon theme (✅ Implemented)
- [ ] canary - Canary theme (✅ Implemented)
- [ ] mustard - Mustard theme (✅ Implemented)
- [ ] chartreuse - Chartreuse theme (✅ Implemented)
- [ ] emerald - Emerald theme (✅ Implemented)
- [ ] jade - Jade theme (✅ Implemented)
- [ ] turquoise - Turquoise theme (✅ Implemented)
- [ ] aqua - Aqua theme (✅ Implemented)
- [ ] sky - Sky theme (✅ Implemented)
- [ ] azure - Azure theme (✅ Implemented)
- [ ] cobalt - Cobalt theme (✅ Implemented)
- [ ] royal - Royal theme (✅ Implemented)
- [ ] sapphire - Sapphire theme (✅ Implemented)
- [ ] periwinkle - Periwinkle theme (✅ Implemented)
- [ ] lilac - Lilac theme (✅ Implemented)
- [ ] plum - Plum theme (✅ Implemented)
- [ ] grape - Grape theme (✅ Implemented)
- [ ] wine - Wine theme (✅ Implemented)
- [ ] burgundy - Burgundy theme (✅ Implemented)
- [ ] mauve - Mauve theme (✅ Implemented)
- [ ] fuchsia - Fuchsia theme (✅ Implemented)

### Color Descriptors
- [ ] hot - Hot theme (✅ Implemented)
- [ ] neon - Neon theme (✅ Implemented)
- [ ] electric - Electric theme (✅ Implemented)
- [ ] bright - Bright theme (✅ Implemented)
- [ ] pastel - Pastel theme (✅ Implemented)
- [ ] muted - Muted theme (✅ Implemented)
- [ ] dark - Dark theme (✅ Implemented)
- [ ] light - Light theme (✅ Implemented)
- [ ] deep - Deep theme (✅ Implemented)
- [ ] pale - Pale theme (✅ Implemented)
- [ ] vivid - Vivid theme (✅ Implemented)
- [ ] soft - Soft theme (✅ Implemented)
- [ ] bold - Bold theme (✅ Implemented)
- [ ] subtle - Subtle theme (✅ Implemented)
- [ ] warm - Warm theme (✅ Implemented)
- [ ] cool - Cool theme (✅ Implemented)

### Nature & Time Themes
- [ ] earth - Earth theme (✅ Implemented)
- [ ] ocean - Ocean theme (✅ Implemented)
- [ ] sunset - Sunset theme (✅ Implemented)
- [ ] sunrise - Sunrise theme (✅ Implemented)
- [ ] twilight - Twilight theme (✅ Implemented)
- [ ] dawn - Dawn theme (✅ Implemented)
- [ ] dusk - Dusk theme (✅ Implemented)
- [ ] midnight - Midnight theme (✅ Implemented)

### Future Theme Ideas
- [ ] random - Random theme selector (trigger: "random")
- [ ] champion - Gold theme (achievement: beat_all_bots)
- [ ] perfectionist - Special theme (achievement: perfect_game)
- [ ] speedster - Fast theme (achievement: quick_victory)

---

## Bot Unlocks Checklist

### Achievement-Based Progression
- [ ] beat_tester - Easy Bot (✅ Implemented)
- [ ] beat_easy_bot - Medium Bot (✅ Implemented)
- [ ] beat_medium_bot - Hard Bot (✅ Implemented)
- [ ] beat_hard_bot - Expert Bot (✅ Implemented)

### Word-Based Themed Bots
- [ ] pirate - Pirate Bot (✅ Implemented)
- [ ] chaos - Chaos Bot (✅ Implemented)
- [ ] puzzle - Puzzle Bot (✅ Implemented)
- [ ] speed - Speed Bot (✅ Implemented)
- [ ] creative - Creative Bot (✅ Implemented)
- [ ] vowel - Vowel Bot (✅ Implemented)
- [ ] rhyme - Rhyme Bot (✅ Implemented)

### Future Themed Bots
- [ ] ninja - Ninja Bot (silent, strategic moves)
- [ ] wizard - Wizard Bot (magic-themed words)
- [ ] robot - Robot Bot (tech-themed words)
- [ ] animal - Animal Bot (animal words only)
- [ ] food - Food Bot (food words only)
- [ ] music - Music Bot (music-themed words)
- [ ] sports - Sports Bot (sports words only)

### Future Behavior Bots
- [ ] mirror - Mirror Bot (copies player strategies)
- [ ] opposite - Opposite Bot (does opposite of player)
- [ ] random - Random Bot (completely random moves)
- [ ] defense - Defensive Bot (focuses on blocking player)
- [ ] aggressive - Aggressive Bot (high-risk, high-reward)

### Future Difficulty Progression
- [ ] beat_expert_bot - Master Bot
- [ ] beat_master_bot - Grandmaster Bot
- [ ] beat_grandmaster_bot - Legendary Bot

---

## Mechanic Unlocks Checklist

### Currently Defined (Unlocks Work, Game Logic Missing)
- [ ] five - 5 Letter Start (❌ Game logic not implemented)
- [ ] six - 6 Letter Start (❌ Game logic not implemented)

### Future Word Length Mechanics
- [ ] three - 3 Letter Start
- [ ] seven - 7 Letter Start
- [ ] starts - Random Length Start

### Future Turn Mechanics
- [ ] extra - Extra Turns (15 instead of 10)
- [ ] quick - Quick Game (5 turns only)
- [ ] endless - Endless Mode (no turn limit)

### Future Unlock Mechanics
- [ ] reset - Reset Unlocks (disable all progress)
- [ ] unlock - Display Unlocks (show redacted unlock list)
- [ ] revelation - Full Unlock (unlock everything)

---

## Future Achievement Ideas

### Performance Achievements
- [ ] perfect_game - Win without losing any turns
- [ ] quick_victory - Win in under 2 minutes
- [ ] comeback_king - Win after being 20+ points behind
- [ ] shutout - Win with opponent scoring 0
- [ ] high_scorer - Score 100+ points in a game

### Word Achievements
- [ ] long_word_master - Play a 10+ letter word
- [ ] vowel_master - Play 5 words with all vowels
- [ ] consonant_king - Play word with no vowels
- [ ] palindrome_player - Play a palindrome word
- [ ] alphabet_soup - Use every letter A-Z in one game

### Progression Achievements
- [ ] theme_collector - Unlock 50 themes
- [ ] bot_master - Beat all bots
- [ ] mechanic_explorer - Try all mechanics
- [ ] unlock_everything - Unlock all content

---

## Implementation Priority

### Phase 1: Complete Mechanics Implementation
1. Extend GameConfig interface to support mechanics
2. Add UI controls for mechanic selection
3. Implement core mechanics (5-letter-start, 6-letter-start)
4. Update game initialization logic

### Phase 2: Enhanced Mechanics
1. Double key letters implementation
2. Reverse scoring mode
3. Longer words validation changes
4. Advanced mechanics from ideas list

### Phase 3: Extended Content
1. New themed bots with unique behaviors
2. Seasonal/holiday themes
3. Achievement-based unlocks
4. Advanced progression systems

### Phase 4: Polish & Balance
1. Difficulty balancing for new bots
2. UI/UX improvements for mechanic selection
3. Performance optimization for complex mechanics
4. Comprehensive testing of all combinations

---

*Last Updated: Current implementation status as of unlock system completion* 