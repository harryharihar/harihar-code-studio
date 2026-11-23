import { Pressable, Text, View } from 'react-native';

import { describeDue } from '../../../shared/lib/dates';
import { Icon } from '../../../shared/ui/Icon';
import {
  makeStyles,
  priorityColor,
  priorityLabel,
  useTheme,
} from '../../../shared/ui/theme';
import type { LocalTask } from '../domain/task';

export function TaskCard(props: {
  task: LocalTask;
  onPress: () => void;
  onToggle: () => void;
  /** Shown on cross-project lists. */
  project?: { name: string; color: string };
}) {
  const { task } = props;
  const theme = useTheme();
  const styles = useStyles();
  const due = describeDue(task.dueAt);
  const dueColor =
    task.isCompleted || !due
      ? theme.textTertiary
      : due.tone === 'overdue'
      ? theme.danger
      : due.tone === 'today'
      ? theme.warning
      : theme.textSecondary;

  return (
    <Pressable
      testID={`task-${task.title}`}
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && { backgroundColor: theme.surfaceMuted },
      ]}
    >
      <Pressable
        testID={`toggle-${task.title}`}
        accessibilityRole="checkbox"
        accessibilityLabel={`Mark ${task.title} as ${
          task.isCompleted ? 'not done' : 'done'
        }`}
        accessibilityState={{ checked: task.isCompleted }}
        hitSlop={14}
        onPress={props.onToggle}
        style={[
          styles.check,
          {
            borderColor: task.isCompleted
              ? theme.success
              : priorityColor[task.priority],
          },
          task.isCompleted && { backgroundColor: theme.success },
        ]}
      >
        {task.isCompleted ? (
          <Icon name="check" size={14} strokeWidth={3} color="#FFFFFF" />
        ) : null}
      </Pressable>

      <View style={styles.body}>
        <Text
          style={[styles.title, task.isCompleted && styles.titleDone]}
          numberOfLines={2}
        >
          {task.title}
        </Text>
        {task.description ? (
          <Text style={styles.description} numberOfLines={1}>
            {task.description}
          </Text>
        ) : null}

        <View style={styles.meta}>
          {props.project ? (
            <View style={styles.metaItem}>
              <View
                style={[
                  styles.projectDot,
                  { backgroundColor: props.project.color },
                ]}
              />
              <Text style={styles.metaText}>{props.project.name}</Text>
            </View>
          ) : null}
          {due ? (
            <View style={styles.metaItem}>
              <Icon name="calendar" size={13} color={dueColor} />
              <Text style={[styles.metaText, { color: dueColor }]}>
                {due.label}
              </Text>
            </View>
          ) : null}
          <View style={styles.metaItem}>
            <Icon
              name="flag"
              size={13}
              color={
                task.isCompleted
                  ? theme.textTertiary
                  : priorityColor[task.priority]
              }
            />
            <Text style={styles.metaText}>{priorityLabel[task.priority]}</Text>
          </View>
          {task.syncStatus !== 'synced' ? (
            <View
              style={styles.metaItem}
              accessible
              accessibilityLabel="Saved on this device, not synced yet"
            >
              <Icon name="cloudOff" size={13} color={theme.textTertiary} />
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles(t => ({
  card: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: t.surface,
    borderWidth: t.dark ? 1 : 0,
    borderColor: t.border,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  body: { flex: 1, gap: 4 },
  title: { color: t.text, fontSize: 16, fontWeight: '600', lineHeight: 22 },
  titleDone: { color: t.textTertiary, textDecorationLine: 'line-through' },
  description: { color: t.textSecondary, fontSize: 14 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 4 },
  projectDot: { width: 8, height: 8, borderRadius: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: t.textSecondary, fontSize: 13, fontWeight: '500' },
}));
