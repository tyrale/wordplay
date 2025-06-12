# WordPlay

A turn-based word game where players transform words by adding, removing, or rearranging letters to score points. Built with React, TypeScript, and a platform-agnostic game engine.

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
- **81 Themes**: Extensive theme system with dark mode support
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Accessibility**: WCAG AA compliant with full touch support
- **Real-Time Scoring**: Live feedback with detailed scoring breakdown
- **Key Letter System**: Bonus scoring mechanics for strategic gameplay
- **Cross-Platform Engine**: Same game logic for web, terminal, and future mobile

## 🚀 Quick Start

### Prerequisites
- Node.js v18+ (recommended: v23.4.0)
- npm v8+

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd wordplay

# Install dependencies
npm install

# Start development server
npm run dev
```

### Development Commands
```bash
npm run dev          # Start development server
npm test             # Run all tests
npm run build        # Build for production
npm run lint         # Lint code
npm run format       # Format code
npm run play         # Play terminal game
npm run storybook    # Start component development
```

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

### Getting Started
- **[Quick Start Guide](docs/QUICK_START.md)** - Get up and running in minutes
- **[Troubleshooting](docs/TROUBLESHOOTING.md)** - Common issues and solutions

### Development
- **[Task Progress](docs/TASK_PROGRESS.md)** - Current development status
- **[Architecture](docs/ARCHITECTURE.md)** - Technical design and decisions
- **[API Reference](docs/API_REFERENCE.md)** - Engine interfaces and usage
- **[Implementation History](docs/IMPLEMENTATION_HISTORY.md)** - Detailed development notes

### Testing & Quality
- **[Testing Reports](docs/TESTING_REPORTS.md)** - Comprehensive test coverage
- **[Game Rules](docs/GAME_RULES.md)** - Complete gameplay mechanics
- **[UI Design Spec](docs/WEB_UI_DESIGN_SPEC.md)** - Interface guidelines

### Project Management
- **[Development Plan](docs/dev-plan.md)** - Roadmap and workflow
- **[Changelog](docs/CHANGELOG.md)** - Version history

## 🧪 Testing

### Test Status: ✅ **252+ Tests Passing**

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

### ✅ **Production Ready**
- **Web Application**: Fully functional single-player game
- **Game Engine**: Complete with comprehensive testing
- **UI/UX**: Polished interface with mobile support
- **Architecture**: Scalable foundation for future features

### 📈 **Metrics**
- **Bundle Size**: 228.64 kB JS, 29.30 kB CSS (<1MB total)
- **Performance**: Lighthouse scores >90
- **Accessibility**: WCAG AA compliant
- **Browser Support**: Chrome, Firefox, Safari, Edge
- **Test Coverage**: 252+ passing tests

### 🎯 **Completed Phases**
- ✅ **Phase 0**: Web foundation and tooling
- ✅ **Phase 1**: Core game engine (cross-platform)
- ✅ **Phase 2**: Web UI foundation
- 🔄 **Phase 4**: Theme system (81 themes implemented)

### ⏳ **Next Steps**
- **Phase 3**: Online multiplayer functionality
- **Phase 5**: Enhanced accessibility and testing
- **Phase 6**: Production launch preparation

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
1. Follow the [Development Plan](docs/dev-plan.md)
2. Use "ShipHip" prefix in commit messages
3. Run tests before committing: `npm test`
4. Update documentation for significant changes

### Code Standards
- TypeScript for all new code
- Follow existing patterns and architecture
- Maintain test coverage for new features
- Ensure cross-platform compatibility

### Getting Help
- Check [Troubleshooting Guide](docs/TROUBLESHOOTING.md)
- Review [API Reference](docs/API_REFERENCE.md)
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
