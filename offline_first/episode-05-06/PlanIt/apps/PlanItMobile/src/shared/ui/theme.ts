import { useMemo } from 'react';
import {
  StyleSheet,
  useColorScheme,
  type ImageStyle,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import type { TaskPriority } from '../../features/tasks/domain/task';

const light = {
  dark: false,
  background: '#F4F5F8',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF0F4',
  text: '#11131A',
  textSecondary: '#5E6675',
  textTertiary: '#9AA1AD',
  border: '#E3E6EC',
  primary: '#7C3AED',
  primarySoft: '#F1EAFE',
  onPrimary: '#FFFFFF',
  danger: '#E5484D',
  dangerSoft: '#FDECEC',
  success: '#12A594',
  successSoft: '#E3F6F3',
  warning: '#E38A00',
  warningSoft: '#FFF3DF',
};

const dark: typeof light = {
  dark: true,
  background: '#0C0D12',
  surface: '#16181F',
  surfaceMuted: '#1F222B',
  text: '#F2F3F6',
  textSecondary: '#A4AAB6',
  textTertiary: '#6C7280',
  border: '#272A34',
  primary: '#A78BFA',
  primarySoft: '#2A1F4A',
  onPrimary: '#FFFFFF',
  danger: '#FF6369',
  dangerSoft: '#3A1D20',
  success: '#2EC4B0',
  successSoft: '#13302C',
  warning: '#FFB13D',
  warningSoft: '#3A2C14',
};

export type Theme = typeof light;

/** Follows the phone's light / dark setting. */
export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

/** Theme-aware StyleSheet: `const useStyles = makeStyles(t => ({ ... }))`. */
type NamedStyles<T> = { [K in keyof T]: ViewStyle | TextStyle | ImageStyle };

export function makeStyles<T extends NamedStyles<T>>(
  factory: (theme: Theme) => T,
) {
  return function useStyles() {
    const theme = useTheme();
    return useMemo(() => StyleSheet.create(factory(theme)), [theme]);
  };
}

export const priorityColor: Record<TaskPriority, string> = {
  high: '#E5484D',
  medium: '#E38A00',
  low: '#3E8EED',
};

export const priorityLabel: Record<TaskPriority, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

/** Two-tone gradients for project tiles; [0] is also the solid colour. */
const PROJECT_GRADIENTS = [
  ['#6366F1', '#8B5CF6'],
  ['#10B981', '#14B8A6'],
  ['#F97316', '#F59E0B'],
  ['#EC4899', '#F43F5E'],
  ['#0EA5E9', '#6366F1'],
  ['#A855F7', '#EC4899'],
] as const;

/** A distinct gradient per project, by its position in the list (oldest first). */
export function projectGradient(index: number): readonly [string, string] {
  return PROJECT_GRADIENTS[index % PROJECT_GRADIENTS.length];
}

export function projectColor(index: number): string {
  return projectGradient(index)[0];
}
