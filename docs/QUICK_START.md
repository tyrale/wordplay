# Quick Start Guide

Get the WordPlay project up and running in minutes. This guide covers everything you need to start developing or playing the game.

## Prerequisites

- **Node.js**: v18+ (recommended: v23.4.0)
- **npm**: v8+ (comes with Node.js)
- **Git**: For cloning the repository

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd wordplay
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Copy the environment template:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration (optional for local development).

## Running the Project

### Web Application (Recommended)

Start the development server:

```bash
npm run dev
```

Open your browser to: **http://localhost:5173/**

The web app includes:
- ✅ **Single-player game** vs bot
- ✅ **Theme system** with animation themes (default, falling)
- ✅ **Challenge mode** with step-by-step puzzles
- ✅ **Responsive design** (desktop, tablet, mobile)
- ✅ **Full game engine** with scoring and validation

### Terminal Game (Alternative)

Play the game in your terminal:

```bash
npm run play
```

Features:
- ✅ **Human vs Bot** gameplay
- ✅ **Full dictionary** (172,819 words)
- ✅ **Color-coded interface**
- ✅ **Real-time scoring**

## Development Commands

### Essential Commands

```bash
# Start development server
npm run dev

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Build for production
npm run build

# Lint code
npm run lint

# Format code
npm run format

# Play terminal game
npm run play
```

### Storybook (Component Development)

```bash
# Start Storybook
npm run storybook

# Build Storybook
npm run build-storybook
```

Open: **http://localhost:6006/**

## Project Structure

```
wordplay/
├── packages/engine/          # Core game logic (platform-agnostic)
│   ├── dictionary.ts         # Word validation
│   ├── scoring.ts           # Scoring system
│   ├── bot.ts               # AI opponent
│   ├── gamestate.ts         # Game state management
│   └── terminal-game.ts     # Terminal interface
├── src/                     # Web application
│   ├── components/          # React components
│   ├── adapters/           # Platform adapters
│   ├── types/              # TypeScript types
│   └── styles/             # CSS styles
├── docs/                   # Documentation
└── public/                 # Static assets
```

## Key Features

### Game Engine
- **Word Validation**: 172,819 word dictionary (ENABLE + slang)
- **Scoring System**: Points for add/remove/rearrange/key letters
- **Bot AI**: Greedy strategy with move generation
- **Key Letters**: Bonus scoring system
- **Locked Letters**: Strategic gameplay elements

### Web Interface
- **Responsive Design**: Works on all devices
- **Theme System**: 81 different color themes
- **Drag & Drop**: Interactive letter placement
- **Real-time Feedback**: Live scoring and validation
- **Accessibility**: WCAG AA compliant

### Architecture
- **Platform-Agnostic Engine**: Same logic for web, terminal, and future mobile
- **Dependency Injection**: Clean separation of concerns
- **TypeScript**: Full type safety
- **Modern Tooling**: Vite, Vitest, ESLint, Prettier

## Playing the Game

### Web Game Flow

1. **Start Game**: Click "vs human" or "vs bot"
2. **Build Words**: Click or drag letters from the alphabet grid
3. **Submit Moves**: Click the checkmark (✓) when ready
4. **Score Points**: Earn points for different actions:
   - **Add Letter**: +1 point
   - **Remove Letter**: +1 point
   - **Rearrange Letters**: +1 point
   - **Use Key Letter**: +1 point (bonus)
5. **Win**: Highest score after 10 turns wins

### Game Rules

- **Word Length**: Must change by ±1 letter maximum per turn
- **Dictionary**: Must be valid English words or common slang
- **Key Letters**: Highlighted letters give bonus points
- **Locked Letters**: Previous key letters cannot be removed
- **No Repetition**: Same word cannot be played twice

## Development Tips

### Hot Reload
The development server supports hot module replacement (HMR). Changes to code will automatically update in the browser.

### Testing
- Run `npm test` before committing changes
- All tests should pass (252+ tests)
- Add tests for new features

### Code Style
- Use `npm run format` to auto-format code
- Follow existing TypeScript patterns
- Add type annotations for new functions

### Debugging
- Use browser dev tools for web debugging
- Terminal game has built-in debug commands
- Check console for error messages

## Common Issues

### Port Already in Use
If port 5173 is busy:
```bash
# Kill the process using the port
lsof -ti:5173 | xargs kill -9

# Or start on a different port
npm run dev -- --port 3000
```

### Node Version Issues
Ensure you're using Node.js v18+:
```bash
node --version
# Should show v18.0.0 or higher
```

### TypeScript Errors
Check for type errors:
```bash
npm run build
# Will show any TypeScript compilation errors
```

### Test Failures
Run tests to check for issues:
```bash
npm test
# Current status: 264/307 tests passing (86% success rate)
# Some failing tests are due to interface mismatches (documented in TESTING_REPORTS.md)
```

## Next Steps

### For Players
- Try the web game at http://localhost:5173/
- Experiment with animation themes (default, falling)
- Try challenge mode for step-by-step puzzles
- Challenge yourself against bot opponents

### For Developers
- Read [ARCHITECTURE.md](ARCHITECTURE.md) for technical details
- Check [TASK_PROGRESS.md](TASK_PROGRESS.md) for current status
- Review [TESTING_REPORTS.md](TESTING_REPORTS.md) for test coverage
- Explore [WEB_UI_DESIGN_SPEC.md](WEB_UI_DESIGN_SPEC.md) for UI guidelines

### For Contributors
- Follow the development workflow in [dev-plan.md](dev-plan.md)
- Check [IMPLEMENTATION_HISTORY.md](IMPLEMENTATION_HISTORY.md) for context
- Use "ShipHip" prefix in commit messages

## Support

### Documentation
- **Architecture**: [ARCHITECTURE.md](ARCHITECTURE.md)
- **Game Rules**: [GAME_RULES.md](GAME_RULES.md)
- **UI Design**: [WEB_UI_DESIGN_SPEC.md](WEB_UI_DESIGN_SPEC.md)
- **Troubleshooting**: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

### Getting Help
- Check existing documentation first
- Review test output for error details
- Use browser dev tools for debugging
- Check the terminal game for engine testing

---

**Ready to play?** Run `npm run dev` and open http://localhost:5173/ 🎮 