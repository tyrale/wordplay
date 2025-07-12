import React, { useState, useCallback } from 'react';
import { Menu } from './Menu';
import { useUnlockSystem } from '../unlock/UnlockProvider';
import './MainScreen.css';

interface Bot {
  id: string;
  name: string;
}

interface MainScreenProps {
  onStartGame: (gameType: 'bot' | 'challenge' | 'tutorial', botId?: string) => void;
}

// Complete bot list with display names (same as Menu.tsx)
const allBots: Bot[] = [
  { id: 'tester', name: 'tester' },
  { id: 'easy-bot', name: 'easy bot' },
  { id: 'medium-bot', name: 'medium bot' },
  { id: 'hard-bot', name: 'hard bot' },
  { id: 'expert-bot', name: 'expert bot' },
  { id: 'adaptive-bot', name: 'adaptive bot' },
  { id: 'puzzle-bot', name: 'puzzle bot' },
  { id: 'speed-bot', name: 'speed bot' },
  { id: 'strategic-bot', name: 'strategic bot' },
  { id: 'creative-bot', name: 'creative bot' },
  { id: 'aggressive-bot', name: 'aggressive bot' },
  { id: 'defensive-bot', name: 'defensive bot' },
  { id: 'learning-bot', name: 'learning bot' },
  { id: 'memory-bot', name: 'memory bot' },
  { id: 'pattern-bot', name: 'pattern bot' },
  { id: 'chaos-bot', name: 'chaos bot' },
  { id: 'minimalist-bot', name: 'minimalist bot' },
  { id: 'maximalist-bot', name: 'maximalist bot' },
  { id: 'vowel-bot', name: 'vowel bot' },
  { id: 'consonant-bot', name: 'consonant bot' },
  { id: 'rhyme-bot', name: 'rhyme bot' },
  { id: 'alliteration-bot', name: 'alliteration bot' },
  { id: 'length-bot', name: 'length bot' },
  { id: 'suffix-bot', name: 'suffix bot' },
  { id: 'prefix-bot', name: 'prefix bot' },
  { id: 'compound-bot', name: 'compound bot' },
  { id: 'analytical-bot', name: 'analytical bot' },
  { id: 'intuitive-bot', name: 'intuitive bot' },
  { id: 'experimental-bot', name: 'experimental bot' },
  { id: 'classic-bot', name: 'classic bot' },
  { id: 'modern-bot', name: 'modern bot' },
  { id: 'pirate-bot', name: 'pirate bot' }, // Added missing themed bots
];

export const MainScreen: React.FC<MainScreenProps> = ({ onStartGame }) => {
  const [currentView, setCurrentView] = useState<'main' | 'bots'>('main');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Get unlock state
  const { getUnlockedItems } = useUnlockSystem();
  const unlockedBotIds = getUnlockedItems('bot');
  
  // Filter bots based on unlock state
  const availableBots = allBots.filter(bot => unlockedBotIds.includes(bot.id));

  const handleGameTypeSelect = useCallback((gameType: string) => {
    if (gameType === 'vs-bot') {
      setCurrentView('bots');
    } else if (gameType === 'challenge') {
      onStartGame('challenge');
    } else if (gameType === 'vs-human') {
      // This mode not implemented yet
      console.log(`${gameType} mode not implemented yet`);
    }
  }, [onStartGame]);

  const handleBotSelect = useCallback((botId: string) => {
    onStartGame('bot', botId);
  }, [onStartGame]);



  const handleMenuOpen = useCallback(() => {
    setIsMenuOpen(true);
  }, []);

  const handleMenuClose = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  return (
    <div className="main-screen">
      {/* Menu icon - positioned to match alphabet grid menu icon */}
      <button 
        className="main-screen-menu-button"
        onClick={handleMenuOpen}
        aria-label="Open menu"
      >
        ≡
      </button>

      {/* Main content */}
      <div className="main-screen__content">
        {currentView === 'main' && (
          <div className="main-screen__game-selection">
            <button 
              className="main-screen__game-option"
              onClick={() => handleGameTypeSelect('challenge')}
            >
              <span className="main-screen__vs-text">vs</span> world
            </button>
            <button 
              className="main-screen__game-option"
              onClick={() => handleGameTypeSelect('vs-human')}
            >
              <span className="main-screen__vs-text">vs</span> human
            </button>
            <button 
              className="main-screen__game-option"
              onClick={() => handleGameTypeSelect('vs-bot')}
            >
              <span className="main-screen__vs-text">vs</span> bot
            </button>
          </div>
        )}

        {currentView === 'bots' && (
          <div className="main-screen__bot-selection">
            <div className="main-screen__bot-list">
              {availableBots.map((bot) => (
                <button
                  key={bot.id}
                  className="main-screen__bot-option"
                  onClick={() => handleBotSelect(bot.id)}
                >
                  {bot.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Menu */}
      <Menu
        isOpen={isMenuOpen}
        onClose={handleMenuClose}
        onStartGame={onStartGame}
        onNavigateHome={() => {
          // Already on main screen, just close menu
          setIsMenuOpen(false);
        }}
        isInGame={false}
        currentGameMode={undefined}
      />
    </div>
  );
}; 