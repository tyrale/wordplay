export interface GameTheme {
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

export const defaultTheme: GameTheme = {
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

// Additional themes for demonstration
export const darkTheme: GameTheme = {
  name: "Dark Mode",
  colors: {
    primary: "#60a5fa",      // Current word, key letters
    text: "#e2e8f0",         // Default text
    textSecondary: "#94a3b8", // Secondary text
    background: "#0f172a",    // Main background
    surface: "#1e293b",      // Letter cells
    surfaceHover: "#334155",  // Touch feedback
    accent: "#3b82f6",       // Key letters
    accentText: "#ffffff",   // Text on accent
    locked: "#fbbf24",       // Lock icons
    disabled: "#64748b"      // Disabled elements
  },
  typography: {
    fontFamily: "Inter, system-ui, sans-serif",
    fontWeight: 900,
    fontSizeXL: "48px",
    fontSizeLG: "18px",
    fontSizeMD: "16px",
    fontSizeSM: "14px"
  }
};

export const greenTheme: GameTheme = {
  name: "Forest Green",
  colors: {
    primary: "#10b981",      // Current word, key letters
    text: "#065f46",         // Default text
    textSecondary: "#6b7280", // Secondary text
    background: "#ffffff",    // Main background
    surface: "#ecfdf5",      // Letter cells
    surfaceHover: "#d1fae5",  // Touch feedback
    accent: "#059669",       // Key letters
    accentText: "#ffffff",   // Text on accent
    locked: "#f59e0b",       // Lock icons
    disabled: "#9ca3af"      // Disabled elements
  },
  typography: {
    fontFamily: "Inter, system-ui, sans-serif",
    fontWeight: 900,
    fontSizeXL: "48px",
    fontSizeLG: "18px",
    fontSizeMD: "16px",
    fontSizeSM: "14px"
  }
};

export const availableThemes = [defaultTheme, greenTheme];

export type ThemeContextType = {
  currentTheme: GameTheme;
  setTheme: (theme: GameTheme) => void;
  availableThemes: GameTheme[];
  isInverted: boolean;
  toggleInverted: () => void;
}; 