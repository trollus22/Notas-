import type { BlockColor } from '@/lib/types';

import type { Scheme } from './theme';

interface ColorSet {
  /** Text colour for coloured text. */
  text: string;
  /** Tag / status pill background and text. */
  tagBackground: string;
  tagText: string;
  /** Callout background. */
  callout: string;
  /** Status dot. */
  dot: string;
}

type Table = Record<BlockColor, ColorSet>;

const LIGHT: Table = {
  default: { text: '#2C2C2B', tagBackground: '#E3E2E0', tagText: '#32302C', callout: '#F1F1EF', dot: '#8F8C89' },
  gray: { text: '#787774', tagBackground: '#E3E2E0', tagText: '#32302C', callout: '#F1F1EF', dot: '#8F8C89' },
  brown: { text: '#9F6B53', tagBackground: '#EEE0DA', tagText: '#442A1E', callout: '#F4EEEE', dot: '#9F6B53' },
  orange: { text: '#D9730D', tagBackground: '#FADEC9', tagText: '#49290E', callout: '#FBECDD', dot: '#D9730D' },
  yellow: { text: '#CB912F', tagBackground: '#FDECC8', tagText: '#402C1B', callout: '#FBF3DB', dot: '#CB912F' },
  green: { text: '#448361', tagBackground: '#DBEDDB', tagText: '#1C3829', callout: '#EDF3EC', dot: '#44A265' },
  blue: { text: '#337EA9', tagBackground: '#D3E5EF', tagText: '#183347', callout: '#E7F3F8', dot: '#2B79D2' },
  purple: { text: '#9065B0', tagBackground: '#E8DEEE', tagText: '#412454', callout: '#F6F3F9', dot: '#9065B0' },
  pink: { text: '#C14C8A', tagBackground: '#F5E0E9', tagText: '#4C2337', callout: '#FAF1F5', dot: '#C14C8A' },
  red: { text: '#D44C47', tagBackground: '#FFE2DD', tagText: '#5D1715', callout: '#FDEBEC', dot: '#D44C47' },
};

const DARK: Table = {
  default: { text: '#D4D4D4', tagBackground: '#373737', tagText: '#D4D4D4', callout: '#2F2F2F', dot: '#8F8C89' },
  gray: { text: '#9B9B9B', tagBackground: '#373737', tagText: '#D4D4D4', callout: '#2F2F2F', dot: '#8F8C89' },
  brown: { text: '#BA856F', tagBackground: '#4A3228', tagText: '#E8D5CC', callout: '#4A3228', dot: '#BA856F' },
  orange: { text: '#C77D48', tagBackground: '#5C3B23', tagText: '#F2DCC9', callout: '#5C3B23', dot: '#C77D48' },
  yellow: { text: '#CA9849', tagBackground: '#564328', tagText: '#F2E3C4', callout: '#4A3F2A', dot: '#CA9849' },
  green: { text: '#529E72', tagBackground: '#243D30', tagText: '#CFE6D6', callout: '#243D30', dot: '#52A86E' },
  blue: { text: '#5E87C9', tagBackground: '#143A4E', tagText: '#CDE3F1', callout: '#143A4E', dot: '#4C8EE0' },
  purple: { text: '#9D68D3', tagBackground: '#3C2D49', tagText: '#E3D5EF', callout: '#3C2D49', dot: '#9D68D3' },
  pink: { text: '#D15796', tagBackground: '#4E2C3C', tagText: '#F2D3E2', callout: '#4E2C3C', dot: '#D15796' },
  red: { text: '#DF5452', tagBackground: '#522E2A', tagText: '#F7D3CF', callout: '#522E2A', dot: '#DF5452' },
};

export function notionColor(scheme: Scheme, color: BlockColor | undefined): ColorSet {
  return (scheme === 'dark' ? DARK : LIGHT)[color ?? 'default'];
}
