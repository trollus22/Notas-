import { useWindowDimensions } from 'react-native';

/** iPads and other wide screens get the two-column layout. Phones keep the single column. */
export const TABLET_MIN_WIDTH = 768;

export function useIsTablet(): boolean {
  return useWindowDimensions().width >= TABLET_MIN_WIDTH;
}
