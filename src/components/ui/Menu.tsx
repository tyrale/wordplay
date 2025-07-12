import React, { useState, useCallback } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { useUnlockSystem } from '../unlock/UnlockProvider';
import { useUnlockedThemes } from '../../hooks/useUnlockedThemes';
import './Menu.css';

interface MenuTier2Item {
  id: string;
  title: string;
  isSelected?: boolean;
  onClick?: () => void;
  theme?: any; // For theme items, store the theme object
}

interface MenuTier1Item {
  id: string;
  title: string;
  children?: MenuTier2Item[]; // Made optional for standalone tier 1 items
  onClick?: () => void;
}

interface MenuProps {
  isOpen: boolean;
  onClose: () => void;
  onDebugOpen?: () => void;
  onResign?: () => void;
  onStartGame?: (gameType: 'bot' | 'challenge' | 'tutorial', botId?: string) => void;
  onNavigateHome?: () => void;
  className?: string;
  isInGame?: boolean; // Whether user is currently in an active game
  currentGameMode?: string; // 'bot', 'challenge', or undefined
}

// Map mechanic IDs to display names
const mechanicDisplayNames: Record<string, string> = {
  '5-letter-start': '5 letter starting word',
  '6-letter-start': '6 letter starting word',
  'time-pressure': 'time pressure mode',
  'double-key-letters': 'double key letters',
  'reverse-scoring': 'reverse scoring',
  'challenge-dictionary': 'challenge dictionary'
};

// Map bot IDs to display names
const botDisplayNames: Record<string, string> = {
  'tester': 'tester',
  'easy-bot': 'easy bot',
  'medium-bot': 'medium bot',
  'hard-bot': 'hard bot',
  'expert-bot': 'expert bot',
  'pirate-bot': 'pirate bot',
  'chaos-bot': 'chaos bot',
  'puzzle-bot': 'puzzle bot',
  'speed-bot': 'speed bot',
  'strategic-bot': 'strategic bot',
  'creative-bot': 'creative bot'
};

// Updated menu structure based on requirements and unlock state
const getMenuItems = (
  availableThemes: any[], 
  currentTheme: any, 
  isInverted: boolean, 
  isInGame: boolean = false,
  unlockedMechanics: string[] = [],
  unlockedBots: string[] = [],
  currentGameMode?: string
): MenuTier1Item[] => [
  // Only include resign if user is in an active game
  ...(isInGame ? [{
    id: 'resign',
    title: 'resign'
    // No children - this is a standalone tier 1 action item
  }] : []),
  {
    id: 'vsworld',
    title: 'vs world',
    children: [
      { id: 'challenge-mode', title: 'daily challenge' },
      { id: 'leaderboard', title: 'leaderboard' },
      { id: 'reset-challenge', title: 'reset daily challenge (testing)' },
    ]
  },
  {
    id: 'themes',
    title: 'themes', 
    children: [
      { id: 'inverted', title: 'dark mode', isSelected: isInverted },
      ...availableThemes.map(theme => ({
        id: theme.name.toLowerCase().replace(/\s+/g, '-'),
        title: theme.name.toLowerCase(),
        isSelected: theme.name === currentTheme.name,
        theme: theme
      }))
    ]
  },
  // Only show mechanics section if there are unlocked mechanics
  ...(unlockedMechanics.length > 0 ? [{
    id: 'mechanics',
    title: 'mechanics',
    children: unlockedMechanics.map(mechanicId => ({
      id: mechanicId,
      title: mechanicDisplayNames[mechanicId] || mechanicId
    }))
  }] : []),
  // Only show bots section if there are unlocked bots beyond the default tester
  ...(unlockedBots.length > 0 ? [{
    id: 'bots',
    title: 'bots',
    children: unlockedBots.map(botId => ({
      id: botId,
      title: botDisplayNames[botId] || botId
    }))
  }] : []),
  {
    id: 'about',
    title: 'about',
    children: [
      { id: 'the-basics', title: 'the basics' },
      { id: 'game-version', title: 'game version' },
      { id: 'credits', title: 'credits' },
      { id: 'privacy-policy', title: 'privacy policy' },
      { id: 'terms-of-service', title: 'terms of service' },
      { id: 'contact-support', title: 'contact support' },
      { id: 'feedback', title: 'feedback' },
      { id: 'debug', title: 'debug' },
      { id: 'reset-unlocks', title: 'reset unlocks (testing)' },
    ]
  },
  // Home item - moved to bottom
  {
    id: 'home',
    title: 'home'
    // No children - this is a standalone tier 1 action item
  },
];

export const Menu: React.FC<MenuProps> = ({
  isOpen,
  onClose,
  onDebugOpen,
  onResign,
  onStartGame,
  onNavigateHome,
  className = '',
  isInGame = false,
  currentGameMode
}) => {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const { currentTheme, setTheme, isInverted, toggleInverted } = useTheme();
  
  // Get unlock state
  const { getUnlockedItems, resetUnlocksToFresh } = useUnlockSystem();
  const unlockedThemeIds = getUnlockedItems('theme');
  const unlockedMechanics = getUnlockedItems('mechanic');
  const unlockedBots = getUnlockedItems('bot');
  
  // Filter themes based on unlock state
  const unlockedThemes = useUnlockedThemes({ unlockedThemes: unlockedThemeIds });

  // Simple reset function that doesn't require the challenge hook
  const resetDailyChallenge = useCallback(() => {
    try {
      const today = new Date().toISOString().split('T')[0];
      localStorage.removeItem(`wordplay-challenge-${today}`);
      console.log('Daily challenge reset for', today);
    } catch (err) {
      console.warn('Failed to reset daily challenge:', err);
    }
  }, []);

  const menuItems = getMenuItems(unlockedThemes, currentTheme, isInverted, isInGame, unlockedMechanics, unlockedBots, currentGameMode);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    // Wait for animation to complete before actually closing
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300); // Match the longest animation duration
  }, [onClose]);

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }, [handleClose]);

  const handleTier1Click = useCallback((itemId: string) => {
    // Handle standalone tier 1 items that perform actions directly
    if (itemId === 'home') {
      onNavigateHome?.();
      handleClose(); // Close menu after home navigation
      return;
    }
    
    if (itemId === 'resign') {
      onResign?.();
      handleClose(); // Close menu after resign
      return;
    }
    
    // For items with children, toggle expansion
    setExpandedItem(prevExpanded => 
      prevExpanded === itemId ? null : itemId
    );
  }, [onNavigateHome, onResign, handleClose]);

  // Helper function to render theme name with color preview
  const renderThemeName = useCallback((item: MenuTier2Item) => {
    if (!item.theme) {
      return item.title;
    }

    const theme = item.theme;
    const title = item.title;
    
    // Pick a deterministic letter to highlight based on theme name hash
    const hash = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const accentIndex = hash % title.length;
    
    // Apply dark mode inversion if toggled
    const displayColors = isInverted ? {
      text: theme.colors.background,
      accent: theme.colors.accent
    } : {
      text: theme.colors.text,
      accent: theme.colors.accent
    };
    
    return (
      <span style={{ color: displayColors.text }}>
        {title.split('').map((char, index) => (
          <span
            key={index}
            style={{
              color: index === accentIndex ? displayColors.accent : displayColors.text
            }}
          >
            {char}
          </span>
        ))}
      </span>
    );
  }, [isInverted]);

  // Helper function to render "vs world" with accent color for "vs"
  const renderVsWorldTitle = useCallback((title: string) => {
    if (title === 'vs world') {
      return (
        <>
          <span style={{ color: 'var(--theme-accent)' }}>vs</span> world
        </>
      );
    }
    return title;
  }, []);

  const handleTier2Click = useCallback((tier1Id: string, tier2Id: string) => {
    // Handle specific actions that should close the menu
    if (tier1Id === 'themes') {
      if (tier2Id === 'inverted') {
        // Toggle inverted theme
        toggleInverted();
        // Don't close menu after toggle
      } else {
        // Find and set the selected theme
        const selectedTheme = unlockedThemes.find(theme => 
          theme.name.toLowerCase().replace(/\s+/g, '-') === tier2Id
        );
        if (selectedTheme) {
          setTheme(selectedTheme);
          // Don't close menu after theme change
        }
      }
    } else if (tier1Id === 'about' && tier2Id === 'the-basics') {
      // Start tutorial
      onStartGame?.('tutorial');
      handleClose(); // Close menu after starting tutorial
    } else if (tier1Id === 'about' && tier2Id === 'debug') {
      // Open debug dialog
      onDebugOpen?.();
      handleClose(); // Close menu after opening debug
    } else if (tier1Id === 'about' && tier2Id === 'reset-unlocks') {
      // Reset unlocks to fresh user state
      resetUnlocksToFresh();
      handleClose(); // Close menu after reset
    } else if (tier1Id === 'vsworld' && tier2Id === 'challenge-mode') {
      // Start daily challenge
      onStartGame?.('challenge');
      handleClose(); // Close menu after starting challenge
    } else if (tier1Id === 'vsworld' && tier2Id === 'reset-challenge') {
      // Reset daily challenge for testing
      resetDailyChallenge();
      // Keep menu open for testing workflow
    } else if (tier1Id === 'bots') {
      // Bot selection - this will trigger confirmation in App.tsx
      onStartGame?.('bot', tier2Id);
      handleClose(); // Close menu after bot selection (confirmation handled at app level)
    }
    
    // For other items (challenge, mechanics, other about items), keep menu open
    // These are placeholder items that don't have functionality yet
  }, [handleClose, onDebugOpen, onResign, onStartGame, unlockedThemes, setTheme, toggleInverted, resetUnlocksToFresh, resetDailyChallenge]);

  if (!isOpen) return null;

  return (
    <div 
      className={`menu-overlay ${isClosing ? 'menu-overlay--closing' : ''} ${className}`.trim()}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="menu-title"
    >
      <div className="menu-container">
        <div className="menu-content">
          <div className="menu-main">
            <div className="menu-spacer"></div>
            <div className="menu-list">
            {menuItems.map((tier1Item: MenuTier1Item, tier1Index: number) => (
              <div key={tier1Item.id} className="menu-tier1-section">
                <button
                  className={`menu-tier1-item ${isClosing ? 'menu-tier1-item--closing' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTier1Click(tier1Item.id);
                  }}
                  aria-expanded={expandedItem === tier1Item.id}
                  aria-controls={`menu-${tier1Item.id}-submenu`}
                  style={{ 
                    position: 'relative', 
                    zIndex: 200,
                    animationDelay: isClosing ? `${(menuItems.length - tier1Index - 1) * 0.05}s` : `${tier1Index * 0.1}s`,
                    color: tier1Item.id === 'resign' ? 'var(--theme-accent)' : undefined
                  }}
                >
                  {renderVsWorldTitle(tier1Item.title)}
                </button>
                
                {tier1Item.children && (
                  <div 
                    className={`menu-tier2-list ${expandedItem === tier1Item.id ? 'menu-tier2-list--expanded' : ''}`}
                    id={`menu-${tier1Item.id}-submenu`}
                    role="region"
                    aria-labelledby={`menu-${tier1Item.id}-button`}
                  >
                    {tier1Item.id === 'themes' ? (
                      // Special handling for themes menu
                      <>
                        {/* Dark mode toggle on its own row */}
                        <div className="menu-tier2-darkmode-row">
                          {tier1Item.children
                            .filter((item: MenuTier2Item) => item.id === 'inverted')
                            .map((tier2Item: MenuTier2Item, tier2Index: number) => {
                              const isDarkModeToggle = true;
                              
                              return (
                                <button
                                  key={tier2Item.id}
                                  className={`menu-tier2-item menu-tier2-item--toggle ${tier2Item.isSelected ? 'menu-tier2-item--selected' : ''} ${isClosing ? 'menu-tier2-item--closing' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTier2Click(tier1Item.id, tier2Item.id);
                                  }}
                                  style={{
                                    animationDelay: isClosing 
                                      ? `${(menuItems.length - tier1Index - 1) * 0.05 + (tier1Item.children!.length - tier2Index - 1) * 0.02}s`
                                      : `${(tier1Index * 0.1) + 0.05 + (tier2Index * 0.02)}s`
                                  }}
                                >
                                  {tier2Item.title}
                                  <div className={`dark-mode-toggle ${tier2Item.isSelected ? 'dark-mode-toggle--active' : ''}`}>
                                    <div className="dark-mode-toggle__slider"></div>
                                  </div>
                                </button>
                              );
                            })}
                        </div>
                        
                        {/* Theme items in wrapped rows */}
                        <div className="menu-tier2-themes-grid">
                          {tier1Item.children
                            .filter((item: MenuTier2Item) => item.id !== 'inverted')
                            .map((tier2Item: MenuTier2Item, tier2Index: number) => {
                              const isThemeItem = true;
                              
                              // For theme items, use the theme's colors for styling
                              const themeStyles = {
                                borderColor: isInverted ? tier2Item.theme.colors.background : tier2Item.theme.colors.text,
                                backgroundColor: isInverted ? tier2Item.theme.colors.text : tier2Item.theme.colors.background,
                                color: isInverted ? tier2Item.theme.colors.background : tier2Item.theme.colors.text
                              };

                              return (
                                <button
                                  key={tier2Item.id}
                                  className={`menu-tier2-item menu-tier2-item--theme ${tier2Item.isSelected ? 'menu-tier2-item--selected' : ''} ${isClosing ? 'menu-tier2-item--closing' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTier2Click(tier1Item.id, tier2Item.id);
                                  }}
                                  style={{
                                    animationDelay: isClosing 
                                      ? `${(menuItems.length - tier1Index - 1) * 0.05 + (tier1Item.children!.length - tier2Index - 1) * 0.02}s`
                                      : `${(tier1Index * 0.1) + 0.05 + (tier2Index * 0.02)}s`,
                                    ...themeStyles
                                  }}
                                >
                                  {renderThemeName(tier2Item)}
                                  
                                  {/* Checkmark for selected theme items */}
                                  {tier2Item.isSelected && (
                                    <span 
                                      className="menu-tier2-item__checkmark"
                                      style={{ color: tier2Item.theme.colors.accent }}
                                    >
                                      ✓
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                        </div>
                      </>
                    ) : (
                      // Regular handling for non-themes menus
                      tier1Item.children.map((tier2Item: MenuTier2Item, tier2Index: number) => (
                        <button
                          key={tier2Item.id}
                          className={`menu-tier2-item ${tier2Item.isSelected ? 'menu-tier2-item--selected' : ''} ${isClosing ? 'menu-tier2-item--closing' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTier2Click(tier1Item.id, tier2Item.id);
                          }}
                          style={{
                            animationDelay: isClosing 
                              ? `${(menuItems.length - tier1Index - 1) * 0.05 + (tier1Item.children!.length - tier2Index - 1) * 0.02}s`
                              : `${(tier1Index * 0.1) + 0.05 + (tier2Index * 0.02)}s`
                          }}
                        >
                          {tier2Item.title}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          </div>
          <div className="menu-footer">
            <button
              className={`menu-close-button ${isClosing ? 'menu-close-button--closing' : ''}`}
              onClick={handleClose}
              aria-label="Close menu"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 