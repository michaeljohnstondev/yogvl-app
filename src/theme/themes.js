const theme = {
  colors: {
    background: '#001020',
    backgroundGradient: ['#001020', '#001840', '#002060'],
    buttonGradient: ['#00c6ff', '#0072ff'],
    royalPurpleGradient: ['#4B0082', '#0066FF', '#4B0082', '#0066FF', '#4B0082'],
    textPrimary: '#FFFFFF',
    textSecondary: '#778DA9',
    inputBorder: '#555',
    inputBackground: 'rgba(255,255,255,0.05)',
    alertButton: '#00c6ff',

    //vibeColors
    vibeBlue: '#00C6FF',
    vibeGreen: '#00FF41',
    vibeForest: '#228B22', // Forest green - for positive actions
    vibeOrange: '#FFCC66',
    vibePurple: '#6B00CC',
    vibeYellow: '#FFD700', // Gold - slightly more yellow
    vibePink: '#FF10F0',
    vibeRed: '#FF4444',
    vibeCyan: '#00FFFF',
    vibeTurquoise: '#40E0D0',
    vibeAqua: '#00FFF7',
    vibeTeal: '#00FFD4',
    vibeElectricBlue: '#007FFF',
    vibeRoyalBlue: '#4169E1',

    // Basic colors
    white: '#FFFFFF',
    black: '#000000',
    gray: '#778DA9',
    darkGray: '#2d2d2d',

    // UI accent colors
    headerBackground: '#001020', // Match header gradient top
    statusBarBackground: '#001020', // Match header gradient top

    // VibeBackgroundColors
    vibeBackgroundBlue: 'rgba(0, 198, 255, 0.1)',
    vibeBackgroundGreen: 'rgba(0, 255, 65, 0.1)',
    vibeBackgroundOrange: 'rgba(253, 126, 20, 0.1)',
    vibeBackgroundPurple: 'rgba(139, 0, 255, 0.1)',
    vibeBackgroundYellow: 'rgba(255, 255, 0, 0.1)',
    vibeBackgroundPink: 'rgba(255, 16, 240, 0.1)',
    vibeBackgroundCyan: 'rgba(0, 255, 255, 0.1)',
    vibeBackgroundTurquoise: 'rgba(64, 224, 208, 0.2)',
    vibeBackgroundAqua: 'rgba(0, 255, 247, 0.1)',
    vibeBackgroundTeal: 'rgba(0, 255, 212, 0.1)',
    vibeBackgroundElectricBlue: 'rgba(0, 127, 255, 0.1)',
    vibeBackgroundRoyalBlue: 'rgba(65, 105, 225, 0.1)',

    // Comment role colors
    commentUser: '#28a745',
    commentAdmin: '#6f42c1',
    commentHost: '#fd7e14',
    commentOther: '#007bff',

    // Comment background colors (with transparency)
    commentUserBg: 'rgba(40, 167, 69, 0.1)',
    commentAdminBg: 'rgba(111, 66, 193, 0.1)',
    commentHostBg: 'rgba(253, 126, 20, 0.1)',
    commentOtherBg: 'rgba(0, 123, 255, 0.1)',
  },
  fonts: {
    // Comic Neue (fun, casual)
    comic: 'ComicNeue_400Regular',
    comicBold: 'ComicNeue_700Bold',

    // System fonts (clean, professional)
    main: 'System',
    bold: 'System',
  },
  sizes: {
    borderRadius: 12,
    buttonRadius: 12,
    inputPadding: 12,
  },
  // UI Restrictions: NO glow effects - Use sharp neon borders instead
  // shadows: Removed - glow effects not allowed in punk aesthetic
};

export default theme;

/**
 * Light ("Pro") theme — a clean, white, corporate counterpart to the neon look.
 *
 * Not an inversion of the dark palette: neon on white is unreadable, and the
 * 3px neon borders read as loud on a lit surface. Pro swaps the treatment —
 * white surfaces, hairline grey borders, near-black text, one brand blue.
 *
 * Migrated components read `semantic`; un-migrated ones keep importing the
 * default `theme` (dark) until their batch lands, so nothing breaks mid-rollout.
 */
export const darkTheme = {
  ...theme,
  isDark: true,
  semantic: {
    background: theme.colors.background,
    backgroundGradient: theme.colors.backgroundGradient,
    header: theme.colors.headerBackground,
    headerGradient: ['#001020', '#001840'],
    headerBorder: theme.colors.vibeBlue,
    headerBorderWidth: 3,
    surface: theme.colors.vibeBackgroundBlue,
    border: theme.colors.vibeBlue,
    borderWidth: 3,
    text: theme.colors.textPrimary,
    textMuted: theme.colors.textSecondary,
    accent: theme.colors.vibeBlue,
    palette: {
      blue: theme.colors.vibeBlue,
      teal: theme.colors.vibeTeal,
      purple: theme.colors.vibePurple,
      green: theme.colors.vibeGreen,
      red: theme.colors.vibeRed,
      orange: theme.colors.vibeOrange,
      pink: theme.colors.vibePink,
      yellow: theme.colors.vibeYellow,
      gray: theme.colors.gray,
    },
    searchBg: 'rgba(255, 255, 255, 0.04)',
    searchBorder: '#444',
    statusBar: 'light',
  },
};

export const lightTheme = {
  ...theme,
  isDark: false,
  semantic: {
    background: '#FFFFFF',
    backgroundGradient: ['#FFFFFF', '#FFFFFF'],
    header: '#FFFFFF',
    headerGradient: ['#FFFFFF', '#FFFFFF'],
    headerBorder: '#E5E7EB',
    headerBorderWidth: 1,
    surface: '#FFFFFF',
    border: '#E5E7EB',
    borderWidth: 1,
    text: '#0F172A',
    textMuted: '#64748B',
    accent: '#1877F2',
    // Matte palette: flat, mid-saturation hues that hold up on white —
    // the calm counterparts of the neon vibe colours (same keys, same roles).
    palette: {
      blue: '#1877F2',
      teal: '#2A9D8F',
      purple: '#6E5BC7',
      green: '#43A047',
      red: '#D9534F',
      orange: '#E8873A',
      pink: '#D6649A',
      yellow: '#E3B23C',
      gray: '#8A94A6',
    },
    searchBg: '#F3F4F6',
    searchBorder: '#E5E7EB',
    statusBar: 'dark',
  },
};

export const themes = { dark: darkTheme, light: lightTheme };
