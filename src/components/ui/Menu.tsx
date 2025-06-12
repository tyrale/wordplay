import React, { useState, useCallback } from 'react';
import { useTheme } from '../theme/ThemeProvider';
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
  className?: string;
  isInGame?: boolean; // Whether user is currently in an active game
}

// Updated menu structure based on requirements
const getMenuItems = (availableThemes: any[], currentTheme: any, isInverted: boolean, isInGame: boolean = false): MenuTier1Item[] => [
  // Only include resign if user is in an active game
  ...(isInGame ? [{
    id: 'resign',
    title: 'resign'
    // No children - this is a standalone tier 1 action item
  }] : []),
  {
    id: 'challenge',
    title: 'challenge',
    children: [
      { id: 'challenge-mode', title: 'challenge mode' },
      { id: 'leaderboard', title: 'leaderboard' },
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
  {
    id: 'mechanics',
    title: 'mechanics',
    children: [
      { id: '5-letter-start', title: '5 letter starting word' },
      { id: 'longer-words', title: 'longer word limits' },
      { id: 'time-pressure', title: 'time pressure mode' },
      { id: 'double-key-letters', title: 'double key letters' },
      { id: 'reverse-scoring', title: 'reverse scoring' },
      { id: 'challenge-dictionary', title: 'challenge dictionary' },
    ]
  },
  {
    id: 'bots',
    title: 'bots',
    children: [
      { id: 'tester', title: 'tester' },
      { id: 'easy-bot', title: 'easy bot' },
      { id: 'medium-bot', title: 'medium bot' },
      { id: 'hard-bot', title: 'hard bot' },
      { id: 'expert-bot', title: 'expert bot' },
      { id: 'adaptive-bot', title: 'adaptive bot' },
      { id: 'puzzle-bot', title: 'puzzle bot' },
      { id: 'speed-bot', title: 'speed bot' },
      { id: 'strategic-bot', title: 'strategic bot' },
      { id: 'creative-bot', title: 'creative bot' },
      { id: 'aggressive-bot', title: 'aggressive bot' },
      { id: 'defensive-bot', title: 'defensive bot' },
      { id: 'learning-bot', title: 'learning bot' },
      { id: 'memory-bot', title: 'memory bot' },
      { id: 'pattern-bot', title: 'pattern bot' },
      { id: 'chaos-bot', title: 'chaos bot' },
      { id: 'minimalist-bot', title: 'minimalist bot' },
      { id: 'maximalist-bot', title: 'maximalist bot' },
      { id: 'vowel-bot', title: 'vowel bot' },
      { id: 'consonant-bot', title: 'consonant bot' },
      { id: 'rhyme-bot', title: 'rhyme bot' },
      { id: 'alliteration-bot', title: 'alliteration bot' },
      { id: 'length-bot', title: 'length bot' },
      { id: 'suffix-bot', title: 'suffix bot' },
      { id: 'prefix-bot', title: 'prefix bot' },
      { id: 'compound-bot', title: 'compound bot' },
      { id: 'analytical-bot', title: 'analytical bot' },
      { id: 'intuitive-bot', title: 'intuitive bot' },
      { id: 'experimental-bot', title: 'experimental bot' },
      { id: 'classic-bot', title: 'classic bot' },
      { id: 'modern-bot', title: 'modern bot' },
    ]
  },
  {
    id: 'about',
    title: 'about',
    children: [
      { id: 'game-version', title: 'game version' },
      { id: 'credits', title: 'credits' },
      { id: 'privacy-policy', title: 'privacy policy' },
      { id: 'terms-of-service', title: 'terms of service' },
      { id: 'contact-support', title: 'contact support' },
      { id: 'feedback', title: 'feedback' },
      { id: 'debug', title: 'debug' },
    ]
  },
];

export const Menu: React.FC<MenuProps> = ({
  isOpen,
  onClose,
  onDebugOpen,
  onResign,
  className = '',
  isInGame = false
}) => {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const { currentTheme, setTheme, availableThemes, isInverted, toggleInverted } = useTheme();

  const menuItems = getMenuItems(availableThemes, currentTheme, isInverted, isInGame);

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
    if (itemId === 'resign') {
      onResign?.();
      handleClose(); // Close menu after resign
      return;
    }
    
    // For items with children, toggle expansion
    setExpandedItem(prevExpanded => 
      prevExpanded === itemId ? null : itemId
    );
  }, [onResign, handleClose]);

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

  const handleTier2Click = useCallback((tier1Id: string, tier2Id: string) => {
    // Handle specific actions that should close the menu
    if (tier1Id === 'themes') {
      if (tier2Id === 'inverted') {
        // Toggle inverted theme
        toggleInverted();
        // Don't close menu after toggle
      } else {
        // Find and set the selected theme
        const selectedTheme = availableThemes.find(theme => 
          theme.name.toLowerCase().replace(/\s+/g, '-') === tier2Id
        );
        if (selectedTheme) {
          setTheme(selectedTheme);
          // Don't close menu after theme change
        }
      }
    } else if (tier1Id === 'about' && tier2Id === 'debug') {
      // Open debug dialog
      onDebugOpen?.();
      handleClose(); // Close menu after opening debug
    } else if (tier1Id === 'bots') {
      // Bot selection no longer handled here - bots are selected from main screen
      // Keep menu open for bot items
    }
    
    // For other items (challenge, mechanics, bots, other about items), keep menu open
    // These are placeholder items that don't have functionality yet
  }, [handleClose, onDebugOpen, onResign, availableThemes, setTheme, toggleInverted]);

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
                  {tier1Item.title}
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