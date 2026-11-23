import { ActivityIndicator, Text, View } from 'react-native';

import { Button } from './controls';
import { Icon, type IconName } from './Icon';
import { makeStyles, useTheme } from './theme';

export function LoadingView() {
  const theme = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.center} testID="loading-view">
      <ActivityIndicator color={theme.primary} />
    </View>
  );
}

export function ErrorView({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  const theme = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.center} testID="error-view">
      <View style={[styles.iconCircle, { backgroundColor: theme.dangerSoft }]}>
        <Icon name="alert" size={28} color={theme.danger} />
      </View>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message}>{message}</Text>
      <Button label="Try again" variant="secondary" onPress={onRetry} />
    </View>
  );
}

export function EmptyView(props: {
  icon?: IconName;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const theme = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.center} testID="empty-view">
      <View style={[styles.iconCircle, { backgroundColor: theme.primarySoft }]}>
        <Icon name={props.icon ?? 'inbox'} size={28} color={theme.primary} />
      </View>
      <Text style={styles.title}>{props.title}</Text>
      {props.message ? (
        <Text style={styles.message}>{props.message}</Text>
      ) : null}
      {props.actionLabel && props.onAction ? (
        <Button
          label={props.actionLabel}
          icon="plus"
          onPress={props.onAction}
        />
      ) : null}
    </View>
  );
}

const useStyles = makeStyles(t => ({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 48,
    gap: 8,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    color: t.text,
    fontSize: 19,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    color: t.textSecondary,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 16,
  },
}));
