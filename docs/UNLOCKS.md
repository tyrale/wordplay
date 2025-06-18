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

### 🟧 Unlock Triggers Only

**Bots (11+ unlocks)**
- ✅ Unlock tracking works (achievement and word triggers)
- ✅ Toast notifications and menu display work
- ✅ Persistence across sessions works
- ❌ **All bots use the same generic AI** - no unique behaviors
- ❌ No difficulty differences between easy/medium/hard/expert
- ❌ No themed behaviors for pirate/chaos/puzzle/etc bots

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

## Status Legend

- **[x]** = Fully implemented and working
- **🟧** = Unlock trigger works, but feature implementation incomplete
- **[ ]** = Not yet implemented (future ideas)

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

3. **Implement full functionality:**
- **For themes**: Add theme data to availableThemes array
- **For mechanics**: Update GameConfig interface, add UI controls, implement game logic
- **For bots**: Create unique AI behaviors in bot engine

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
- [x] red - Red theme
- [x] blue - Blue theme
- [x] green - Green theme
- [x] purple - Purple theme
- [x] orange - Orange theme
- [x] yellow - Yellow theme
- [x] pink - Pink theme
- [x] brown - Brown theme
- [x] black - Black theme
- [x] gray - Gray theme

### Specific Shades
- [x] crimson - Crimson theme
- [x] indigo - Indigo theme
- [x] teal - Teal theme
- [x] cyan - Cyan theme
- [x] lime - Lime theme
- [x] mint - Mint theme
- [x] plum - Plum theme
- [x] coral - Coral theme
- [x] amber - Amber theme
- [x] denim - Denim theme

### Named Themes
- [x] grandma - Grandma theme
- [x] grandpa - Grandpa theme
- [x] contrast - Contrast theme
- [x] july - July theme
- [x] brand - Brand theme
- [x] salmon - Salmon theme
- [x] blues - Blues theme
- [x] squash - Squash theme
- [x] crimson - Crimson theme
- [x] citrus - Citrus theme
- [x] lagoon - Lagoon theme
- [x] intense - Intense theme
- [x] sky - Sky theme
- [x] winter - Winter theme
- [x] autumn - Autumn theme
- [x] lavender - Lavender theme
- [x] camping - Camping theme
- [x] craft - Craft theme
- [x] tomato - Tomato theme
- [x] grass - Grass theme
- [x] gear - Gear theme
- [x] boots - Boots theme
- [x] storm - Storm theme
- [x] vibrant - Vibrant theme
- [x] gentle - Gentle theme
- [x] peaceful - Peaceful theme
- [x] market - Market theme
- [x] racing - Racing theme
- [x] berry - Berry theme
- [x] brick - Brick theme
- [x] vintage - Vintage theme
- [x] midnight - Midnight theme
- [x] touch - Touch theme

### Future Theme Ideas
- [ ] random - Random theme selector (trigger: "random")
- [ ] champion - Gold theme (achievement: beat_all_bots)
- [ ] perfectionist - Special theme (achievement: perfect_game)
- [ ] speedster - Fast theme (achievement: quick_victory)

---

## Bot Unlocks Checklist

### Achievement-Based Progression
- 🟧 beat_tester - Easy Bot
- 🟧 beat_easy_bot - Medium Bot
- 🟧 beat_medium_bot - Hard Bot
- 🟧 beat_hard_bot - Expert Bot

### Word-Based Themed Bots
- 🟧 pirate - Pirate Bot
- 🟧 chaos - Chaos Bot
- 🟧 puzzle - Puzzle Bot
- 🟧 speed - Speed Bot
- 🟧 creative - Creative Bot
- 🟧 vowel - Vowel Bot
- 🟧 rhyme - Rhyme Bot

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
- 🟧 five - 5 Letter Start
- 🟧 six - 6 Letter Start

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