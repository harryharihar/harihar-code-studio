import { Platform } from 'react-native';

// "Receipt paper" theme: cream paper, dark ink, saffron + teal accents
// taken from the Harihar Code Studio logo.
export const Theme = {
  bg: '#F4EEE2',
  paper: '#FFFCF6',
  paperEdge: '#E7DDCB',
  dash: '#CFC2AB',

  ink: '#1D1B18',
  inkSoft: '#3F3A33',
  inkMuted: '#7A7064',
  inkFaint: '#A99E8E',

  saffron: '#F2621B',
  saffronDeep: '#D94E0C',
  saffronSoft: 'rgba(242, 98, 27, 0.10)',

  teal: '#0E8F67',
  tealSoft: 'rgba(14, 143, 103, 0.10)',

  amber: '#D99A06',
  red: '#D6383F',
  redSoft: 'rgba(214, 56, 63, 0.08)',
  redBorder: 'rgba(214, 56, 63, 0.30)',
} as const;

export const Gradients = {
  saffron: `linear-gradient(135deg, ${Theme.saffron}, ${Theme.saffronDeep})`,
  glow: 'linear-gradient(180deg, rgba(242, 98, 27, 0.16), rgba(14, 143, 103, 0.06) 50%, rgba(244, 238, 226, 0))',
} as const;

export const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });
