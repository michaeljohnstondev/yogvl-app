const theme = {
  colors: {
    background: '#080B1E',
    backgroundGradient: ['#080B1E', '#0B1125', '#1A053E'],
    buttonGradient: ['#00c6ff', '#0072ff'],
    textPrimary: '#FFFFFF',
    textSecondary: '#778DA9',
    inputBorder: '#555',
    inputBackground: 'rgba(255,255,255,0.05)',
    shadowGlow: '#00FFFF',
    alertButton: '#00c6ff',

    //vibeColors
    vibeBlue: '#00C6FF',
    vibeGreen: '#00FF41',
    vibeOrange: '#fd7e14',
    vibePurple: '#8B00FF',
    vibeYellow: '#FFFF00',
    vibePink: '#FF10F0',

    // VibeBackgroundColors
    vibeBackgroundBlue: 'rgba(0, 198, 255, 0.1)',
    vibeBackgroundGreen: 'rgba(0, 255, 65, 0.1)',
    vibeBackgroundOrange: 'rgba(253, 126, 20, 0.1)',
    vibeBackgroundPurple: 'rgba(139, 0, 255, 0.1)',
    vibeBackgroundYellow: 'rgba(255, 255, 0, 0.1)',
    vibeBackgroundPink: 'rgba(255, 16, 240, 0.1)',

    // Comment role colors
    commentUser: '#28a745', // Green for current user
    commentAdmin: '#6f42c1', // Purple for admin
    commentHost: '#fd7e14', // Golden orange for host
    commentOther: '#007bff', // Blue for others

    // Comment background colors (with transparency)
    commentUserBg: 'rgba(40, 167, 69, 0.1)',
    commentAdminBg: 'rgba(111, 66, 193, 0.1)',
    commentHostBg: 'rgba(253, 126, 20, 0.1)',
    commentOtherBg: 'rgba(0, 123, 255, 0.1)',
  },
  fonts: {
    main: 'Segoe UI',
  },
  sizes: {
    borderRadius: 12,
    buttonRadius: 12,
    inputPadding: 16,
  },
  shadows: {
    textGlow: {
      textShadowColor: '#00FFFF',
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 30,
    },
  },
};

export default theme;
