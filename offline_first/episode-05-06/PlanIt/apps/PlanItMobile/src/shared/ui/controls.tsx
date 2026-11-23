import { Pressable, StyleSheet, Text, View } from 'react-native';

import { brandGradient } from './Brand';
import { Gradient } from './Gradient';
import { Icon, type IconName } from './Icon';
import { makeStyles, useTheme } from './theme';

export function Button(props: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: IconName;
  disabled?: boolean;
  testID?: string;
}) {
  const theme = useTheme();
  const styles = useStyles();
  const variant = props.variant ?? 'primary';
  const color =
    variant === 'primary'
      ? theme.onPrimary
      : variant === 'danger'
      ? theme.danger
      : theme.text;

  return (
    <Pressable
      testID={props.testID}
      accessibilityRole="button"
      onPress={props.onPress}
      disabled={props.disabled}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        (pressed || props.disabled) && styles.pressed,
      ]}
    >
      {variant === 'primary' ? (
        <Gradient colors={brandGradient} style={StyleSheet.absoluteFill} />
      ) : null}
      {props.icon ? <Icon name={props.icon} size={18} color={color} /> : null}
      <Text style={[styles.buttonLabel, { color }]}>{props.label}</Text>
    </Pressable>
  );
}

/** Text button for navigation headers (Cancel, Save…). */
export function HeaderButton(props: {
  label: string;
  onPress: () => void;
  bold?: boolean;
  testID?: string;
}) {
  const theme = useTheme();
  const styles = useStyles();
  return (
    <Pressable
      testID={props.testID}
      accessibilityRole="button"
      hitSlop={12}
      onPress={props.onPress}
    >
      <Text
        style={[
          styles.headerButton,
          { color: theme.primary },
          props.bold && styles.headerButtonBold,
        ]}
      >
        {props.label}
      </Text>
    </Pressable>
  );
}

/** iOS-style segmented control. */
export function Segmented<T extends string>(props: {
  options: { value: T; label: string; color?: string }[];
  value: T;
  onChange: (value: T) => void;
  testIDPrefix?: string;
}) {
  const theme = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.segmented}>
      {props.options.map(option => {
        const active = option.value === props.value;
        return (
          <Pressable
            key={option.value}
            testID={
              props.testIDPrefix
                ? `${props.testIDPrefix}-${option.value}`
                : undefined
            }
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => props.onChange(option.value)}
            style={[styles.segment, active && styles.segmentActive]}
          >
            {option.color ? (
              <View style={[styles.dot, { backgroundColor: option.color }]} />
            ) : null}
            <Text
              style={[
                styles.segmentLabel,
                { color: active ? theme.text : theme.textSecondary },
                active && styles.segmentLabelActive,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles(t => ({
  button: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    height: 52,
    borderRadius: 16,
    overflow: 'hidden',
  },
  primary: { backgroundColor: t.primary },
  secondary: {
    backgroundColor: t.surface,
    borderWidth: 1,
    borderColor: t.border,
  },
  danger: { backgroundColor: t.dangerSoft },
  pressed: { opacity: 0.7 },
  buttonLabel: { fontSize: 16, fontWeight: '600' },
  segmented: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 12,
    backgroundColor: t.surfaceMuted,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    height: 34,
    borderRadius: 9,
  },
  segmentActive: {
    backgroundColor: t.dark ? t.border : t.surface,
    shadowColor: '#000',
    shadowOpacity: t.dark ? 0 : 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  segmentLabel: { fontSize: 14, fontWeight: '500' },
  segmentLabelActive: { fontWeight: '600' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  headerButton: { fontSize: 17 },
  headerButtonBold: { fontWeight: '700' },
}));
