# Web UI Design Specification

## ✅ **IMPLEMENTATION STATUS: MATCHES CURRENT UI** (Updated 2025-01-22)

**Verification Results**: This design specification accurately reflects the current web interface implementation. Key specifications confirmed:
- ✅ **Inter font with 900 weight**: Implemented in CSS variables and component styles
- ✅ **Theme system**: Full theme provider with multiple color schemes working
- ✅ **Typography system**: Font sizes and weights match specification  
- ✅ **Layout patterns**: Current UI matches design patterns described
- ✅ **Interaction model**: Mouse/touch-only implementation as specified

> **Original Purpose**: This document provides the complete visual and interaction specification for the web UI components based on the provided screen designs for turn 4 and turn 5. This ensures pixel-perfect implementation matching the intended design.

---

## 📱 Design Analysis Summary

Based on the provided screen designs (turn4.png and turn5.png), this document details every visual element, layout pattern, typography choice, and interaction state shown in the mockups.

**Key Observations:**
- **Screen Dimensions**: 1276×2090 pixels (mobile-first design)
- **Turn Progression**: Shows game state progression from turn 4 to turn 5
- **Word Evolution**: "HIPS" (turn 4) → "PUSH" (turn 5)
- **Visual Theme**: Clean, modern interface with themeable color scheme
- **Layout**: Vertical mobile layout with centered checkmark as anchor point
- **Interaction Model**: Mouse/touch only - no keyboard navigation required

---

## 🎯 Complete Element Breakdown

### 1. Header Section (Top)

**Word Sequence Trail**
- **Content**: "PLAY LAPS SLIP" (turn 4) → "PLAY LAPS SLIP HIPS" (turn 5)
- **Typography**: 
  - Font: Inter
  - Weight: Black (900) - **ONLY FONT WEIGHT USED**
  - Size: ~18pt equivalent
  - Color: Theme text color
  - Letter spacing: Wide (~0.1em)
- **Layout**: 
  - Horizontally centered
  - Top margin: ~40px from screen edge
  - Bottom margin: ~24px before current word

### 2. Current Word Display (Center)

**Main Word**
- **Content**: "HIPS" (turn 4) → "PUSH" (turn 5)
- **Typography**:
  - Font: Inter
  - Weight: 900 (Black) - **ONLY FONT WEIGHT USED**
  - Size: Very large (~48-56pt equivalent)
  - Color: Theme primary color
  - Letter spacing: Normal to slightly wide
- **Special Letter Highlighting**:
  - **Key Letter**: Uses theme accent color
  - **Locked Letters**: Use theme default color with small lock icon in lower left of letter
- **Position**: Horizontally centered with generous spacing

### 3. Action Controls Section

**Layout Anchor Point**
- **Checkmark Placement**: Centered horizontally and vertically on the page
- **All other elements** (game board, word display, letter grid) positioned relative to this centered checkmark

**Action Indicators & Submit** (Horizontal row)
- **Visual Indicators** (non-interactive):
  1. **Remove Indicator**: `−` (shows when user removed a letter)
  2. **Add Indicator**: `+` (shows when user added a letter)
  3. **Move Indicator**: `~` (shows when user rearranged/moved letters)
  4. **Score Display**: Shows scoring breakdown (e.g., "+3 +1")
- **Interactive Element**:
  5. **Submit Button**: `✓` (when word is valid) or `✗` (when word is invalid)

**Action Indicator Specifications**:
- **Purpose**: Visual feedback showing what actions user has taken to help explain score calculation
- **Style**: Text symbols only, no backgrounds, no borders
- **Font**: Inter, Weight: Black (900)
- **Size**: ~40px height, proportional width
- **Background**: None/transparent
- **Text Color**: Theme default text color
- **Interaction**: None - these are display-only indicators
- **Visibility**: Only show indicators for actions that have been taken

**Submit Button Specifications**:
- **States**: 
  - Valid word: `✓` (checkmark, interactive)
  - Invalid word: `✗` (X mark, non-interactive)
- **Style**: Text symbol only, no background, no borders
- **Font**: Inter, Weight: Black (900)
- **Size**: ~40px height, proportional width
- **Background**: None/transparent
- **Text Color**: Theme default text color
- **Interaction**: Click/tap only when showing checkmark (✓)
- **Position**: Centered anchor point for entire layout

**Score Display**:
- **Format**: Shows scoring breakdown (e.g., "+3 +1")
- **Position**: Left aligned from submit checkmark
- **Font**: Inter, Weight: Black (900)
- **Color**: Theme text color
- **Purpose**: Real-time scoring feedback showing how current score was calculated

### 4. Alphabet Grid (Main Interface)

**Grid Layout**:
- **Dimensions**: 6 columns × 5 rows (A-Z + additional symbols)
- **Letters Shown**: Full alphabet A-Z plus special characters
- **Cell Size**: Square cells, ~56px × 56px equivalent
- **Spacing**: ~6px gaps between cells
- **Total Grid Width**: Nearly full screen width with margins
- **Interaction**: Click/tap only (no keyboard navigation)

**Cell States**:

1. **Normal Letters** (majority):
   - Background: Theme background color
   - Text: Theme text color
   - Font: Inter, Weight: Black (900)
   - Size: Large and readable

2. **Key Letters** (highlighted):
   - Background: Theme accent color
   - Text: Theme accent text color (for contrast)
   - Font: Inter, Weight: Black (900)
   - Visual prominence: Clearly distinguishable

**Grid Content**:
```
A  B  C  D  E  F
G  H  I  J  K  L  
M  N  O  P  Q  R
S  T  U  V  W  X
←  ↶  Y  Z  ?  ≡
```

**Special Bottom Row Functions**:
- **Arrow Left** (←): Return to game home screen
- **Rotate** (↶): Undo player changes, reset back to word in play  
- **Y, Z**: Regular letters
- **Question Mark** (?): Help function, will open word definition (feature TBD)
- **Menu/Lines** (≡): Settings/Menu function (including theme selection)

### 5. Theme System Design

**Theme Structure** (All colors must be themeable):
```typescript
interface GameTheme {
  name: string;
  colors: {
    // Text colors
    primary: string;        // Current word, key letters
    text: string;          // Default text color
    textSecondary: string; // Secondary text elements
    
    // Background colors
    background: string;     // Main background
    surface: string;       // Letter cell backgrounds
    surfaceHover: string;  // Letter cell interaction (touch feedback)
    
    // Accent colors
    accent: string;        // Key letters, highlights
    accentText: string;    // Text on accent backgrounds
    
    // Special states
    locked: string;        // Lock icon color
    disabled: string;      // Disabled elements
  };
  typography: {
    // Font family
    fontFamily: string;    // Font family for entire app
    fontWeight: number;    // Font weight (currently 900 throughout)
    
    // Font sizes
    fontSizeXL: string;    // Current word (48px)
    fontSizeLG: string;    // Word trail (18px)
    fontSizeMD: string;    // Buttons, grid letters (16px)
    fontSizeSM: string;    // Icons, secondary text (14px)
  };
}
```

**Default Theme** (Based on designs):
```typescript
const defaultTheme: GameTheme = {
  name: "Classic Blue",
  colors: {
    primary: "#3b82f6",      // Current word, key letters
    text: "#1e3a8a",         // Default text
    textSecondary: "#64748b", // Secondary text
    background: "#ffffff",    // Main background
    surface: "#f1f5f9",      // Letter cells
    surfaceHover: "#e2e8f0",  // Touch feedback
    accent: "#3b82f6",       // Key letters
    accentText: "#ffffff",   // Text on accent
    locked: "#f59e0b",       // Lock icons
    disabled: "#94a3b8"      // Disabled elements
  },
  typography: {
    fontFamily: "Inter, system-ui, sans-serif",
    fontWeight: 900,
    fontSizeXL: "48px",      // Current word
    fontSizeLG: "18px",      // Word trail
    fontSizeMD: "16px",      // Buttons, grid letters
    fontSizeSM: "14px"       // Icons, secondary text
  }
};
```

**Typography System** (Part of Theme):
- **Font Family**: From theme.typography.fontFamily (default: Inter)
- **Font Weight**: From theme.typography.fontWeight (default: 900 - Black)
- **Sizes**: All from theme.typography
  - XL: theme.typography.fontSizeXL (default: 48px - Current word)
  - LG: theme.typography.fontSizeLG (default: 18px - Word trail)
  - MD: theme.typography.fontSizeMD (default: 16px - Buttons, grid letters)
  - SM: theme.typography.fontSizeSM (default: 14px - Icons, secondary text)

**Spacing System**:
- **Container Padding**: ~20px left/right margins
- **Section Spacing**: ~24-32px between major sections
- **Grid Gaps**: ~6px between cells
- **Button Spacing**: TBD based on layout requirements

### 6. Game State Differences (Turn 4 → Turn 5)

**Word Progression**:
- Turn 4: Current word "HIPS"
- Turn 5: Current word "PUSH", with "HIPS" added to word trail

**Visual State Changes**:
- Word trail grows with previous word
- Current word updates completely
- Key letter highlighting updates (using theme accent color)
- Score display updates (shows turn progression)

**Letter Grid Updates**:
- Key letters change based on new turn (theme accent color)
- Interactive states update accordingly (touch feedback only)

---

## 🎨 Implementation Guidelines

### Theme Provider Setup
```css
:root {
  /* Theme variables (dynamically updated) */
  --theme-primary: #3b82f6;
  --theme-text: #1e3a8a;
  --theme-text-secondary: #64748b;
  --theme-background: #ffffff;
  --theme-surface: #f1f5f9;
  --theme-surface-hover: #e2e8f0;
  --theme-accent: #3b82f6;
  --theme-accent-text: #ffffff;
  --theme-locked: #f59e0b;
  --theme-disabled: #94a3b8;
  
  /* Typography (from theme) */
  --theme-font-family: Inter, system-ui, sans-serif;
  --theme-font-weight: 900;
  --theme-font-size-xl: 48px;
  --theme-font-size-lg: 18px;
  --theme-font-size-md: 16px;
  --theme-font-size-sm: 14px;
  
  /* Spacing (fixed) */
  --spacing-xs: 6px;
  --spacing-sm: 8px;
  --spacing-md: 20px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
}
```

### Responsive Considerations
- **Mobile-First**: Designs are mobile-optimized (1276×2090)
- **Desktop Scaling**: Adapt for larger screens while maintaining proportions
- **Touch Targets**: Grid cells appropriately sized for touch interaction (minimum 44px)
- **Typography**: Scales proportionally across devices
- **No Keyboard Support**: Design assumes mouse/touch only

### Accessibility Requirements
- **Color Contrast**: Ensure WCAG AA compliance for all theme combinations
- **Touch Accessibility**: Minimum 44px touch targets throughout
- **Screen Reader**: Semantic HTML with proper ARIA labels
- **Theme Compatibility**: All themes must meet contrast requirements
- **No Focus States**: No keyboard navigation support required

### Interaction Model
- **Mouse/Desktop**: Click interactions only, no hover effects needed
- **Touch/Mobile**: Tap interactions with brief visual feedback
- **No Keyboard**: No keyboard navigation, no focus states, no shortcuts
- **Theme Switching**: Available through settings menu (≡ button)

---

## 📋 Component Checklist

### Must-Have Components (Phase 2.1):
- [ ] **ThemeProvider**: Context provider for theme switching
- [ ] **WordTrail**: Displays previous words (Inter Black 900, theme colors)
- [ ] **CurrentWord**: Large centered word display with key letter highlighting
- [ ] **ActionIndicators**: Display-only symbols showing user actions (−, +, ~)
- [ ] **SubmitButton**: Interactive submit button (✓ valid, ✗ invalid)
- [ ] **AlphabetGrid**: 6×5 grid with touch-only interaction
- [ ] **GridCell**: Individual letter cell with theme color states
- [ ] **ScoreDisplay**: Real-time scoring feedback (Inter Black 900)

### Visual States to Implement:
- [ ] **Normal Letter**: Theme surface color background
- [ ] **Key Letter**: Theme accent color background
- [ ] **Locked Letter**: Theme default color with lock icon
- [ ] **Touch Feedback**: Brief visual feedback on tap (no hover)
- [ ] **Valid Submit State**: Checkmark (✓) when word is valid
- [ ] **Invalid Submit State**: X mark (✗) when word is invalid
- [ ] **Action Indicators**: Show only for actions taken (−, +, ~)

### Layout Containers:
- [ ] **GameBoard**: Main container with centered checkmark anchor
- [ ] **Header**: Word trail section
- [ ] **WordDisplay**: Current word section  
- [ ] **Controls**: Action indicators and submit button (centered on submit)
- [ ] **Grid**: Alphabet grid container
- [ ] **Footer**: Bottom navigation/functions

### Theme System Components:
- [ ] **ThemeContext**: React context for theme state
- [ ] **ThemeSelector**: UI for choosing available themes
- [ ] **ThemeStorage**: Persistence of user theme choice

---

## 🔍 Implementation Verification

### Visual Accuracy Checklist:
- [ ] **Typography**: Only Inter Black (900) weight used throughout
- [ ] **Colors**: All colors come from theme system
- [ ] **Layout**: Checkmark-centered layout implemented
- [ ] **Action Indicators**: Display-only symbols with no interaction
- [ ] **Submit States**: Checkmark for valid, X for invalid words
- [ ] **Theme Switching**: Multiple themes available and working
- [ ] **Responsive**: Adapts properly to different screen sizes

### Interaction Accuracy Checklist:
- [ ] **Touch/Mouse Only**: No keyboard navigation anywhere
- [ ] **No Hover States**: No hover effects implemented
- [ ] **Touch Feedback**: Brief visual feedback on interactions
- [ ] **Theme Persistence**: Selected theme persists across sessions
- [ ] **Grid Interaction**: Letters respond to clicks/taps only
- [ ] **Submit Interaction**: Only checkmark (✓) state is clickable
- [ ] **Action Indicators**: No interaction on −, +, ~ symbols

### Functional Accuracy Checklist:
- [ ] **Action Indicators**: Show correct symbols for user actions taken
- [ ] **Score Calculation**: Display matches actual scoring logic
- [ ] **Submit State**: Correctly shows ✓ for valid, ✗ for invalid
- [ ] **Word Validation**: Real-time validation updates submit button
- [ ] **Move Detection**: Tilde (~) appears when letters are rearranged
- [ ] **Scoring Display**: Format "+3 +1" shows breakdown correctly

### Theme System Verification:
- [ ] **Multiple Themes**: At least 2-3 themes implemented
- [ ] **Color Consistency**: All colors use theme variables
- [ ] **Typography Consistency**: All fonts and sizes use theme variables
- [ ] **Contrast Compliance**: All themes meet WCAG AA standards
- [ ] **Theme Switching**: Instant theme updates without reload (colors + typography)
- [ ] **Persistence**: Theme choice saved and restored

---

**Next Steps**: Use this specification to implement the React components in Phase 2.1, ensuring:
1. Only Inter font with Black (900) weight
2. Complete theme system for user customization
3. Text-only buttons with no backgrounds
4. Mouse/touch interaction only (no keyboard support)

**Reference Images**: `screen_designs/turn4.png` and `screen_designs/turn5.png` 