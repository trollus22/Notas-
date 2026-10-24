import { Colors, type Palette } from '@/constants/theme';
import { usePreferences } from '@/store/workspace-context';

import { useColorScheme } from './use-color-scheme';

/** Light or dark, following the theme chosen in Configuración. */
export function useScheme(): 'light' | 'dark' {
  const system = useColorScheme();
  const [{ theme }] = usePreferences();
  if (theme !== 'system') return theme;
  return system === 'dark' ? 'dark' : 'light';
}

export function useColors(): Palette {
  return Colors[useScheme()];
}
