# WordPlay

A turn-based word game where players transform words by adding, removing, or rearranging letters to score points. Built with React, TypeScript, and a platform-agnostic game engine.

> **Purpose**: High-level project overview, feature list, architecture summary, and current status. For full setup steps, troubleshooting, project structure, and dev workflow tips, see the canonical [Quick Start Guide](docs/guides/QUICK_START.md). See [docs/README.md](docs/README.md) for the full documentation index.

## 🎮 Play Now

### Web Game (Recommended)
```bash
npm run dev
```
Open http://localhost:5173/ in your browser

### Terminal Game
```bash
npm run play
```

## ✨ Features

- **Single-Player Game**: Play against an intelligent bot opponent
- **75 Themes**: Extensive theme system with dark mode support (53 unlockable via gameplay, rest available by default; see `docs/features/UNLOCKS.md`)
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Accessibility**: WCAG AA compliant with full touch support
- **Real-Time Scoring**: Live feedback with detailed scoring breakdown
- **Key Letter System**: Bonus scoring mechanics for strategic gameplay
- **Cross-Platform Engine**: Same game logic for web, terminal, and future mobile

## 🚀 Quick Start

```bash
git clone <repository-url> && cd wordplay
npm install
npm run dev
```

Requires Node.js v18+ and npm v8+. For full installation steps, all dev commands, project structure, and troubleshooting, see the **[Quick Start Guide](docs/guides/QUICK_START.md)**.

## 🎯 Game Rules

1. **Transform Words**: Add, remove, or rearrange letters
2. **Score Points**: Earn points for different actions:
   - Add letter: +1 point
   - Remove letter: +1 point
   - Rearrange letters: +1 point
   - Use key letter: +1 point (bonus)
3. **Word Constraints**: 
   - Must be valid English words
   - Maximum ±1 letter change per turn
   - No word repetition in same game
4. **Key Letters**: Highlighted letters provide bonus points
5. **Locked Letters**: Previous key letters cannot be removed
6. **Win Condition**: Highest score after 10 turns

## 🏗️ Architecture

WordPlay uses a **platform-agnostic engine** with **dependency injection**:

```
packages/engine/     # Core game logic (platform-agnostic)
├── dictionary.ts    # Word validation
├── scoring.ts       # Point calculation
├── bot.ts          # AI opponent
├── gamestate.ts    # Game orchestration
└── interfaces.ts   # Dependency contracts

src/adapters/       # Platform-specific implementations
├── browserAdapter.ts   # Web browser (HTTP, performance.now)
├── nodeAdapter.ts      # Node.js (file system, process.hrtime)
└── testAdapter.ts      # Testing (mocks, controlled data)

src/components/     # React UI components
src/styles/         # CSS and themes
```

## 📚 Documentation

See **[docs/README.md](docs/README.md)** for the full documentation index, organized by category (guides, architecture, features, deployment, project history).

### Getting Started
- **[Quick Start Guide](docs/guides/QUICK_START.md)** - Get up and running in minutes
- **[Troubleshooting](docs/guides/TROUBLESHOOTING.md)** - Common issues and solutions

### Development
- **[Task Progress](docs/project/TASK_PROGRESS.md)** - Current development status
- **[Architecture](docs/architecture/ARCHITECTURE.md)** - Technical design and decisions
- **[API Reference](docs/architecture/API_REFERENCE.md)** - Engine interfaces and usage
- **[Implementation History](docs/project/IMPLEMENTATION_HISTORY.md)** - Detailed development notes

### Testing & Quality
- **[Testing Reports](docs/project/TESTING_REPORTS.md)** - Comprehensive test coverage
- **[Game Rules](docs/guides/GAME_RULES.md)** - Complete gameplay mechanics
- **[UI Design Spec](docs/architecture/WEB_UI_DESIGN_SPEC.md)** - Interface guidelines

### Project Management
- **[Development Plan](docs/project/dev-plan.md)** - Roadmap and workflow
- **[Changelog](docs/project/CHANGELOG.md)** - Version history

## 🧪 Testing

### Test Status
See [PROJECT_STATUS_AUDIT.md](docs/project/PROJECT_STATUS_AUDIT.md) for the current, maintained pass/fail count — it changes frequently. As of this writing, one test file (`scoring.test.ts`) has known failures due to a tracked interface mismatch (audit step 7a), which also currently blocks `npm run build`.

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- dictionary.test.ts
```

### Test Coverage
- **Engine Tests**: Dictionary, scoring, bot AI, game state
- **Component Tests**: React UI components
- **Integration Tests**: Cross-platform adapter compatibility
- **Performance Tests**: Speed and memory optimization

## 📊 Current Status

### ⚠️ **Playable, but `npm run build` currently fails**
- **Web Application**: Fully functional single-player game via `npm run dev` (Vite dev server doesn't type-check, so this is unaffected)
- **Production Build**: `npm run build` (`tsc -b && vite build`) currently **fails** at the `tsc -b` step — see [PROJECT_STATUS_AUDIT.md](docs/project/PROJECT_STATUS_AUDIT.md) step 7a
- **Game Engine**: Complete with substantial test coverage; one test file currently has known failures (same root cause as the build failure)
- **UI/UX**: Polished interface with mobile support
- **Architecture**: Scalable foundation for future features

### 📈 **Metrics**
- **Bundle Size**: Not independently re-verified in this pass — treat as approximate
- **Accessibility**: WCAG AA compliant
- **Browser Support**: Chrome, Firefox, Safari, Edge
- **Test Coverage**: See [PROJECT_STATUS_AUDIT.md](docs/project/PROJECT_STATUS_AUDIT.md) for the current, maintained count

### 🎯 **Completed Phases**
This section's phase numbering previously conflicted with [TASK_PROGRESS.md](docs/project/TASK_PROGRESS.md) (e.g. this file called multiplayer "Phase 3", while TASK_PROGRESS.md's Phase 3 is the already-completed Challenge Mode). Deferring to TASK_PROGRESS.md as the canonical phase list rather than maintaining a second, conflicting one here — see its [Phase Overview](docs/project/TASK_PROGRESS.md#-phase-overview-realistic-assessment) for current phase status.

### ⏳ **Next Steps**
- **Online multiplayer**: Not yet started
- **Enhanced accessibility and testing**: Ongoing
- **Production launch preparation**: Blocked on resolving the `npm run build` failure above

## 🛠️ Technology Stack

### Core Technologies
- **React 19** - UI framework
- **TypeScript** - Type safety and developer experience
- **Vite** - Fast development and optimized builds
- **Vitest** - Comprehensive testing framework

### Game Engine
- **Platform-Agnostic Design** - Runs on web, terminal, future mobile
- **Dependency Injection** - Clean separation of concerns
- **172,819 Word Dictionary** - ENABLE word list + slang support
- **Advanced Scoring Algorithm** - Accurate point calculation

### UI/UX
- **CSS Custom Properties** - Dynamic theming system
- **Mobile-First Design** - Responsive across all devices
- **Touch Optimization** - Reliable drag-and-drop on mobile
- **Accessibility** - WCAG AA compliance

### Development Tools
- **ESLint + Prettier** - Code quality and formatting
- **Storybook** - Component development and documentation
- **GitHub Actions** - Automated CI/CD pipeline
- **Vercel** - Production deployment

## 🤝 Contributing

### Development Workflow
1. Follow the [Development Plan](docs/project/dev-plan.md)
2. Use "ShipHip" prefix in commit messages
3. Run tests before committing: `npm test`
4. Update documentation for significant changes

### Code Standards
- TypeScript for all new code
- Follow existing patterns and architecture
- Maintain test coverage for new features
- Ensure cross-platform compatibility

### Getting Help
- Check [Troubleshooting Guide](docs/guides/TROUBLESHOOTING.md)
- Review [API Reference](docs/architecture/API_REFERENCE.md)
- Examine existing code patterns
- Run terminal game for engine testing: `npm run play`

## 📄 License

This project is private and proprietary.

## 🎮 Ready to Play?

```bash
npm run dev
```

Open http://localhost:5173/ and start playing! 🚀

---

**WordPlay** - Where words become strategy and letters become points.
