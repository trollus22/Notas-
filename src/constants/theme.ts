import { Platform } from 'react-native';

/** Colours measured from the reference recording (light) and their dark counterparts. */
export const Colors = {
  light: {
    text: '#2C2C2B',
    textSecondary: '#767573',
    textTertiary: '#A3A19F',
    background: '#FFFFFF',
    /** Home, settings and sheets. */
    sidebar: '#F7F6F5',
    surface: '#F0F0EF',
    surfacePressed: '#E9E8E6',
    tabSelected: '#E6E5E3',
    tabIdle: '#EDECEA',
    border: '#E6E5E3',
    hairline: '#EDEDEC',
    accent: '#2A78D4',
    danger: '#E03E3E',
    star: '#F5B400',
    codeBackground: '#F7F6F3',
    card: '#FFFFFF',
    floating: '#FFFFFF',
    overlay: 'rgba(0, 0, 0, 0.22)',
    shadow: '#000000',
  },
  dark: {
    text: '#D4D4D4',
    textSecondary: '#9B9B9B',
    textTertiary: '#6B6B6B',
    background: '#191919',
    sidebar: '#202020',
    surface: '#2A2A2A',
    surfacePressed: '#333333',
    tabSelected: '#373737',
    tabIdle: '#2C2C2C',
    border: '#373737',
    hairline: '#2F2F2F',
    accent: '#2A78D4',
    danger: '#EB5757',
    star: '#F5B400',
    codeBackground: '#252525',
    card: '#252525',
    floating: '#2A2A2A',
    overlay: 'rgba(0, 0, 0, 0.5)',
    shadow: '#000000',
  },
} as const;

export type Palette = { [K in keyof typeof Colors.light]: string };
export type Scheme = keyof typeof Colors;

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', serif: 'ui-serif', mono: 'ui-monospace' },
  web: {
    sans: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif',
    serif: 'Georgia, "Times New Roman", serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
  },
  default: { sans: 'normal', serif: 'serif', mono: 'monospace' },
});

/** Horizontal padding of page content. */
export const PageGutter = 26;

/** Space kept free at the bottom of scrolling screens for the floating bar. */
export const FloatingBarSpace = 96;
