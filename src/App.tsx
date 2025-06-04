import { ThemeProvider, GameBoard, useTheme } from './components';
import type { LetterState, ActionState, ScoreBreakdown, LetterHighlight } from './components';
import './App.css';

function ThemeSelector() {
  const { currentTheme, setTheme, availableThemes: themes } = useTheme();

  return (
    <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
      <select 
        value={currentTheme.name} 
        onChange={(e) => {
          const theme = themes.find(t => t.name === e.target.value);
          if (theme) setTheme(theme);
        }}
        style={{
          fontFamily: 'var(--theme-font-family)',
          fontWeight: 'var(--theme-font-weight)',
          fontSize: 'var(--theme-font-size-sm)',
          padding: '8px',
          border: 'none',
          borderRadius: '4px',
          backgroundColor: 'var(--theme-surface)',
          color: 'var(--theme-text)',
        }}
      >
        {themes.map(theme => (
          <option key={theme.name} value={theme.name}>
            {theme.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function GameDemo() {
  // Sample game state matching the design specification examples
  const wordTrail = ['PLAY', 'LAPS', 'SLIP'];
  const currentWord = 'HIPS';
  const wordHighlights: LetterHighlight[] = [
    { index: 0, type: 'key' }, // H is key letter
  ];
  
  const actions: ActionState = {
    add: true,
    remove: false,
    move: true,
  };
  
  const score: ScoreBreakdown = {
    base: 2,
    keyBonus: 1,
    total: 3,
  };
  
  const letterStates: LetterState[] = [
    { letter: 'H', state: 'key' },
    { letter: 'I', state: 'normal' },
    { letter: 'P', state: 'normal' },
    { letter: 'S', state: 'normal' },
  ];

  const handleLetterClick = (letter: string) => {
    console.log('Letter clicked:', letter);
  };

  const handleActionClick = (action: string) => {
    console.log('Action clicked:', action);
  };

  const handleSubmit = () => {
    console.log('Submit clicked');
  };

  return (
    <>
      <ThemeSelector />
      <GameBoard
        wordTrail={wordTrail}
        currentWord={currentWord}
        wordHighlights={wordHighlights}
        actions={actions}
        score={score}
        isValidWord={true}
        letterStates={letterStates}
        onLetterClick={handleLetterClick}
        onActionClick={handleActionClick}
        onSubmit={handleSubmit}
      />
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <GameDemo />
    </ThemeProvider>
  );
}

export default App;
