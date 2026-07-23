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

// Helper function to create a theme from color array
const createTheme = (name: string, colors: [string, string, string]): GameTheme => {
  const [background, text, accent] = colors;
  
  // Generate surface colors based on background
  const surface = background === "#ffffff" || background === "#FFFFFF" 
    ? "#f8fafc" 
    : `${background}dd`; // Add slight transparency for surface
  
  const surfaceHover = background === "#ffffff" || background === "#FFFFFF"
    ? "#f1f5f9"
    : `${background}bb`; // More transparency for hover
  
  // Generate secondary text color (lighter version of main text)
  const textSecondary = `${text}80`; // Add transparency to main text
  
  // Generate disabled color (even lighter)
  const disabled = `${text}40`;
  
  return {
    name,
    colors: {
      primary: accent,
      text,
      textSecondary,
      background,
      surface,
      surfaceHover,
      accent,
      accentText: background, // Use background color as text on accent
      locked: "#f59e0b", // Keep consistent lock color
      disabled
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
};

// Create all themes from the provided color list
export const amberTheme = createTheme("amber", ["#ffffff", "#F59E0B", "#FDE047"]);
export const americanTheme = createTheme("american", ["#BFD7EA", "#0B3954", "#FF6663"]);
export const autumnTheme = createTheme("autumn", ["#F4F1DE", "#3D405B", "#E07A5F"]);
export const berryTheme = createTheme("berry", ["#F61067", "#5E239D", "#00F0B5"]);
export const blackTheme = createTheme("black", ["#FFFFFC", "#000000", "#BEB7A4"]);
export const blueTheme = createTheme("blue", ["#ffffff", "#2563EB", "#60A5FA"]);
export const bluesTheme = createTheme("blues", ["#F5F7FA", "#207BFF", "#4EA5FF"]);
export const bootsTheme = createTheme("boots", ["#E8DAB2", "#4F6D7A", "#DD6E42"]);
export const bougieTheme = createTheme("bougie", ["#FFEEDB", "#4C3B4D", "#ADA8B6"]);
export const brandTheme = createTheme("brand", ["#FBFFFE", "#6D676E", "#FAA916"]);
export const brickTheme = createTheme("brick", ["#DB2B39", "#29335C", "#F3A712"]);
export const brownTheme = createTheme("brown", ["#ffffff", "#92400E", "#A78BFA"]);
export const campingTheme = createTheme("camping", ["#EDEBD7", "#423E37", "#E3B23C"]);
export const camping2Theme = createTheme("camping", ["#E9C46A", "#264653", "#2A9D8F"]);
export const citrusTheme = createTheme("citrus", ["#FEEFE5", "#00916E", "#FFCF00"]);
export const contrastTheme = createTheme("contrast", ["#FDFFFC", "#011627", "#2EC4B6"]);
export const coralTheme = createTheme("coral", ["#ffffff", "#DC2626", "#F87171"]);
export const craftTheme = createTheme("craft", ["#EED2CC", "#6C9A8B", "#E8998D"]);
export const crimsonTheme = createTheme("crimson", ["#F1FAEE", "#E63946", "#A8DADC"]);
export const cyanTheme = createTheme("cyan", ["#ffffff", "#0891B2", "#22D3EE"]);
export const delicateTheme = createTheme("delicate", ["#F5D547", "#1446A0", "#DB3069"]);
export const denimTheme = createTheme("denim", ["#ffffff", "#1E40AF", "#3B82F6"]);
export const dewTheme = createTheme("dew", ["#EBF2FA", "#064789", "#427AA1"]);
export const femaleTheme = createTheme("female", ["#F6E8EA", "#22181C", "#EF626C"]);
export const foggyTheme = createTheme("foggy", ["#EDF6F9", "#006D77", "#83C5BE"]);
export const gearTheme = createTheme("gear", ["#CDD7D6", "#102542", "#F87060"]);
export const gentleTheme = createTheme("gentle", ["#FFF275", "#6699CC", "#FF8C42"]);
export const grandmaTheme = createTheme("grandma", ["#FFFFFF", "#588B8B", "#FFD5C2"]);
export const grandpaTheme = createTheme("grandpa", ["#FFFFFF", "#4C5454", "#FF715B"]);
export const grassTheme = createTheme("grass", ["#A7C957", "#386641", "#6A994E"]);
export const grayTheme = createTheme("gray", ["#ffffff", "#374151", "#9CA3AF"]);
export const greenTheme = createTheme("green", ["#ffffff", "#059669", "#34D399"]);
export const indigoTheme = createTheme("indigo", ["#ffffff", "#4F46E5", "#818CF8"]);
export const intenseTheme = createTheme("intense", ["#F2F5EA", "#2C363F", "#E75A7C"]);
export const julyTheme = createTheme("july", ["#FDFFFC", "#235789", "#C1292E"]);
export const lagoonTheme = createTheme("lagoon", ["#EBF5EE", "#283044", "#78A1BB"]);
export const lavendarTheme = createTheme("lavendar", ["#F8F7FF", "#9381FF", "#B8B8FF"]);
export const lavenderTheme = createTheme("lavender", ["#F1DEDE", "#5D576B", "#D496A7"]);
export const limeTheme = createTheme("lime", ["#ffffff", "#65A30D", "#A3E635"]);
export const marketTheme = createTheme("market", ["#FF8552", "#297373", "#E9D758"]);
export const midnightTheme = createTheme("midnight", ["#3A506B", "#0B132B", "#cccccc"]);
export const mintTheme = createTheme("mint", ["#ffffff", "#10B981", "#6EE7B7"]);
export const molesTheme = createTheme("moles", ["#F5E9E2", "#773344", "#E3B5A4"]);
export const orangeTheme = createTheme("orange", ["#ffffff", "#EA580C", "#FB923C"]);
export const peacefulTheme = createTheme("peaceful", ["#BCE784", "#348AA7", "#5DD39E"]);
export const pinkTheme = createTheme("pink", ["#ffffff", "#BE185D", "#F472B6"]);
export const pinksTheme = createTheme("pinks", ["#EFCFE3", "#E27396", "#EA9AB2"]);
export const playfulTheme = createTheme("playful", ["#F8E16C", "#156064", "#00C49A"]);
export const plumTheme = createTheme("plum", ["#ffffff", "#8B5CF6", "#C4B5FD"]);
export const purpleTheme = createTheme("purple", ["#ffffff", "#7C3AED", "#A78BFA"]);
export const purplesTheme = createTheme("purples", ["#EFBCD5", "#2E294E", "#BE97C6"]);
export const racingTheme = createTheme("racing", ["#7EBDC2", "#231F20", "#BB4430"]);
export const redTheme = createTheme("red", ["#ffffff", "#B91C1C", "#F87171"]);
export const redsTheme = createTheme("reds", ["#F7EBE8", "#E54B4B", "#FFA987"]);
export const robustTheme = createTheme("robust", ["#EDAE49", "#00798C", "#D1495B"]);
export const rootsTheme = createTheme("roots", ["#FFF3B0", "#335C67", "#E09F3E"]);
export const salmonTheme = createTheme("salmon", ["#FFFCF9", "#FF6978", "#B1EDE8"]);
export const salmon2Theme = createTheme("salmon", ["#FAF3DD", "#FFA69E", "#B8F2E6"]);
export const seaglassTheme = createTheme("seaglass", ["#E0FBFC", "#3D5A80", "#98C1D9"]);
export const sereneTheme = createTheme("serene", ["#C1C1C1", "#2C4251", "#D16666"]);
export const skinsTheme = createTheme("skins", ["#F9EAE1", "#7D4F50", "#CC8B86"]);
export const skyTheme = createTheme("sky", ["#D9F0FF", "#83C9F4", "#A3D5FF"]);
export const smogTheme = createTheme("smog", ["#FBF6EF", "#EAD7C3", "#DCE0D9"]);
export const softnessTheme = createTheme("softness", ["#FFFFFF", "#B0D0D3", "#FFCAD4"]);
export const squashTheme = createTheme("squash", ["#FBF5F3", "#000022", "#E28413"]);
export const stormTheme = createTheme("storm", ["#B8D8D8", "#4F6367", "#7A9E9F"]);
export const tealTheme = createTheme("teal", ["#ffffff", "#0D9488", "#2DD4BF"]);
export const tileTheme = createTheme("tile", ["#5AAA95", "#095256", "#087F8C"]);
export const tomatoTheme = createTheme("tomato", ["#F4F1BB", "#ED6A5A", "#9BC1BC"]);
export const touchTheme = createTheme("touch", ["#F7EDF0", "#F4AFAB", "#F4CBC6"]);
export const tweedTheme = createTheme("tweed", ["#FCBA04", "#590004", "#A50104"]);
export const vibrantTheme = createTheme("vibrant", ["#8390FA", "#1D2F6F", "#FAC748"]);
export const vintageTheme = createTheme("vintage", ["#F1C40F", "#2274A5", "#F75C03"]);
export const warmerTheme = createTheme("warmer", ["#E9B872", "#151515", "#A63D40"]);
export const winterTheme = createTheme("winter", ["#EAEBED", "#006989", "#A3BAC3"]);
export const yellowTheme = createTheme("yellow", ["#ffffff", "#D97706", "#FCD34D"]);

// Keep the original default theme for backwards compatibility
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

export const availableThemes = [
  defaultTheme,
  amberTheme,
  americanTheme,
  autumnTheme,
  berryTheme,
  blackTheme,
  blueTheme,
  bluesTheme,
  bootsTheme,
  bougieTheme,
  brandTheme,
  brickTheme,
  brownTheme,
  campingTheme,
  citrusTheme,
  contrastTheme,
  coralTheme,
  craftTheme,
  crimsonTheme,
  cyanTheme,
  delicateTheme,
  denimTheme,
  dewTheme,
  femaleTheme,
  foggyTheme,
  gearTheme,
  gentleTheme,
  grandmaTheme,
  grandpaTheme,
  grassTheme,
  grayTheme,
  greenTheme,
  indigoTheme,
  intenseTheme,
  julyTheme,
  lagoonTheme,
  lavendarTheme,
  lavenderTheme,
  limeTheme,
  marketTheme,
  midnightTheme,
  mintTheme,
  molesTheme,
  orangeTheme,
  peacefulTheme,
  pinkTheme,
  pinksTheme,
  playfulTheme,
  plumTheme,
  purpleTheme,
  purplesTheme,
  racingTheme,
  redTheme,
  redsTheme,
  robustTheme,
  rootsTheme,
  salmonTheme,
  seaglassTheme,
  sereneTheme,
  skinsTheme,
  skyTheme,
  smogTheme,
  softnessTheme,
  squashTheme,
  stormTheme,
  tealTheme,
  tileTheme,
  tomatoTheme,
  touchTheme,
  tweedTheme,
  vibrantTheme,
  vintageTheme,
  warmerTheme,
  winterTheme,
  yellowTheme
];

export type ThemeContextType = {
  currentTheme: GameTheme;
  setTheme: (theme: GameTheme) => void;
  availableThemes: GameTheme[];
  isInverted: boolean;
  toggleInverted: () => void;
  setInverted: (value: boolean) => void;
}; 