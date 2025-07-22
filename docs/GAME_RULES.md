# Game Rules and Mechanics

## Core Gameplay

### Word Validation
- Words must be in the game's dictionary (common words or slang)
- Each new word must differ in length by at most 1 letter from the previous word
- All words are displayed in uppercase
- No numbers or special characters allowed for human players
- Cannot replay words that have already been used in the current game

### Scoring System
The game awards points for different types of word transformations:

**Core Rules:**
- **Add letter**: +1 point (e.g., CAT → CATS)
- **Remove letter**: +1 point (e.g., CATS → CAT)
- **Move letters**: +1 point (when stayed letters change sequence, e.g., CAT → TAC)
- **Key letter usage**: +1 bonus point when using available key letters
- **Combinations**: Actions score independently (e.g., substitute = remove + add = 2 points)

**Examples:**
- CAT → CATS: 1 point (add S)
- CATS → BATS: 2 points (remove C, add B)
- CAT → COAT: 1 point (add O)
- CATS → TABS: 3 points (remove C, add T, move letters)
- CAT → CATS with key letter S: 2 points (add S + key letter bonus)

**Scoring Display Format:**
- `+` = letter addition, `-` = letter removal, `~` = rearrangement
- Example: `+ | ~ 2 +1` means add + rearrange (2 pts) + key letter bonus (1 pt)

### Key Letters System
- Key letters are automatically generated after successful moves
- Using a key letter in your word grants +1 bonus point
- Successfully used key letters become "locked" for the next player
- Locked letters cannot be removed from the word
- Passing a turn clears all locked letters

## Display Rules

### Bad Word Filter

- Bad words are allowed in gameplay
- Bad words are displayed normally until completed
- Once a bad word is completed, it's displayed with symbols (!@#$%^&\*)
- After playing a bad word, players unlock the "Bad Word Filter" attribute
- When the filter is turned off, bad words display normally
- Display changes are cosmetic only - the actual word remains unchanged for gameplay
- When editing a bad word, the filter is temporarily removed to show actual letters

### 1337 Display

- Available after defeating the 1337 bot
- When enabled, letters with 1337 equivalents display as numbers
- Example: "LEET" displays as "1337"
- Only affects display, not gameplay
- The actual word remains in letters for gameplay continuity
- Next player sees the 1337 display but interacts with letters

## Bot Players

Bots can break normal game rules based on their personality, but must use valid letters for gameplay continuity:

### Noob Bot

- Only adds "S" to the end of words
- Can play invalid words
- Example: "HELLO" → "HELLOS" (even if invalid)
- Uses standard letters for gameplay

### 1337 Bot

- Uses leetspeak numbers in display only
- Example: "HAND" displays as "H4ND" but is played as "HAND"
- When bot plays letters that have leet number equivalents, they display as numbers (e.g., 'A' displays as '4', 'E' as '3')
- Unlocks 1337 display attribute when defeated
- Uses standard letters for gameplay

## Dictionary System

The game uses a comprehensive word validation system:

1. **Common Words**: Standard English dictionary (172,819 words from ENABLE1)
2. **Slang Words**: Modern informal terms and slang (loaded from JSON)
3. **Profanity Words**: Managed separately for filtering (loaded from JSON)

**Dictionary Loading:**
- Browser: HTTP fetch with fallback to minimal word set
- Platform-agnostic: Same validation logic across all environments
- Updates: Dictionary content is updated with app releases

## Attributes

Unlockable features that modify game display:

- Bad Word Filter: Toggle bad word censoring
- 1337 Display: Toggle leetspeak number display

## Display Mechanics

- All display changes (bad words, 1337) are cosmetic only
- The actual word remains unchanged for gameplay
- Next player always sees the display version but interacts with letters
- When editing a word, display filters are temporarily removed
- Bots must use valid letters for gameplay continuity
