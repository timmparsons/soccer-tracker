/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

// src/constants/theme.ts
import { TextStyle, ViewStyle } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

//
// 🎨 COLORS
//
export const ColorsNew = {
  primary: '#007AFF',
  secondary: '#34C759',
  accent: '#FF9500',
  background: '#FFFFFF',
  textPrimary: '#1C1C1E',
  textSecondary: '#8E8E93',
  border: '#E5E5EA',
} as const;

//
// 🧍‍♂️ SPACING
//
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

//
// 📝 TYPOGRAPHY
//
type NamedTextStyles = {
  mainHeader: TextStyle;
  sectionTitle: TextStyle;
  body: TextStyle;
  caption: TextStyle;
};

export const Typography: NamedTextStyles = {
  mainHeader: {
    fontSize: 22,
    fontWeight: '700',
    color: ColorsNew.textPrimary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: ColorsNew.textPrimary,
  },
  body: {
    fontSize: 16,
    color: ColorsNew.textPrimary,
  },
  caption: {
    fontSize: 14,
    color: ColorsNew.textSecondary,
  },
};

//
// 🧩 COMPONENT STYLES (optional shared UI)
//
type NamedViewStyles = {
  card: ViewStyle;
  tile: ViewStyle;
};

export const Layout: NamedViewStyles = {
  card: {
    backgroundColor: ColorsNew.background,
    borderRadius: 16,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 2,
  },
  tile: {
    borderRadius: 12,
    padding: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
};
