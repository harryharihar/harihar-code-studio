import { useEffect, useState } from 'react';
import { Alert, Pressable, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ScreenProps } from '../../../app/navigation';
import { repositories } from '../../../app/repositories';
import {
  toFieldErrors,
  type FieldErrors,
} from '../../../shared/domain/fieldErrors';
import {
  dueOptionFromIso,
  dueOptionToIso,
  formatDateTime,
  type DueOption,
} from '../../../shared/lib/dates';
import { brandGradient } from '../../../shared/ui/Brand';
import { Button } from '../../../shared/ui/controls';
import { Gradient } from '../../../shared/ui/Gradient';
import { Icon } from '../../../shared/ui/Icon';
import { ErrorView, LoadingView } from '../../../shared/ui/StateViews';
import {
  makeStyles,
  priorityColor,
  priorityLabel,
  useTheme,
} from '../../../shared/ui/theme';
import {
  createTaskInputSchema,
  taskPrioritySchema,
  updateTaskInputSchema,
  type LocalTask,
  type TaskPriority,
} from '../domain/task';

type Form = {
  title: string;
  description: string;
  priority: TaskPriority;
  due: DueOption | 'custom'; // 'custom' = keep a date that isn't a quick pick
  isCompleted: boolean;
};

const EMPTY_FORM: Form = {
  title: '',
  description: '',
  priority: 'medium',
  due: 'none',
  isCompleted: false,
};

const DUE_OPTIONS: { value: DueOption; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'nextWeek', label: 'Next week' },
];

/** Bottom sheet for both: no taskId = create, taskId = edit. */
export function TaskEditorScreen({
  route,
  navigation,
}: ScreenProps<'TaskEditor'>) {
  const { projectId, taskId } = route.params;
  const isEdit = taskId !== undefined;
  const theme = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();

  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [task, setTask] = useState<LocalTask | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Edit mode: load the task and fill the form.
  useEffect(() => {
    if (!taskId) return;
    repositories.tasks
      .getById(taskId)
      .then(found => {
        if (!found) throw new Error('This task no longer exists.');
        setTask(found);
        setForm({
          title: found.title,
          description: found.description ?? '',
          priority: found.priority,
          due: dueOptionFromIso(found.dueAt) ?? 'custom',
          isCompleted: found.isCompleted,
        });
      })
      .catch(error =>
        setLoadError(error instanceof Error ? error.message : String(error)),
      )
      .finally(() => setLoading(false));
  }, [taskId]);

  function change<K extends keyof Form>(field: K, value: Form[K]) {
    setForm(current => ({ ...current, [field]: value }));
    setErrors(current => ({ ...current, [field]: undefined }));
  }

  async function save() {
    const values = {
      title: form.title,
      description: form.description,
      priority: form.priority,
      dueAt:
        form.due === 'custom' ? task?.dueAt ?? null : dueOptionToIso(form.due),
    };

    setSaving(true);
    try {
      if (isEdit) {
        const result = updateTaskInputSchema.safeParse({
          ...values,
          isCompleted: form.isCompleted,
        });
        if (!result.success) {
          setErrors(toFieldErrors(result.error));
          return;
        }
        await repositories.tasks.update(taskId, result.data);
      } else {
        // Same Zod schema the repository uses: one rule, from the form to the database.
        const result = createTaskInputSchema.safeParse({
          projectId,
          ...values,
        });
        if (!result.success) {
          setErrors(toFieldErrors(result.error)); // { title: 'Title is required' }
          return;
        }
        await repositories.tasks.create(result.data);
      }
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    if (!taskId) return;
    Alert.alert('Delete task?', `“${form.title}” will be deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await repositories.tasks.remove(taskId);
          navigation.goBack();
        },
      },
    ]);
  }

  if (loading) return <LoadingView />;
  if (loadError)
    return (
      <ErrorView message={loadError} onRetry={() => navigation.goBack()} />
    );

  return (
    <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
      {/* Header */}
      <View style={styles.header}>
        <Gradient colors={brandGradient} style={styles.headerIcon}>
          <Icon
            name={isEdit ? 'checkCircle' : 'plus'}
            size={22}
            strokeWidth={2.5}
            color="#FFFFFF"
          />
        </Gradient>
        <View style={styles.headerText}>
          <Text style={styles.title}>{isEdit ? 'Edit Task' : 'New Task'}</Text>
          <Text style={styles.subtitle}>
            {isEdit
              ? 'Changes are saved on this phone'
              : 'Saved on this phone, even offline'}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={12}
          onPress={() => navigation.goBack()}
          style={styles.close}
        >
          <Icon
            name="close"
            size={16}
            strokeWidth={2.5}
            color={theme.textSecondary}
          />
        </Pressable>
      </View>

      {/* Title + notes */}
      <View
        style={[styles.inputCard, errors.title ? styles.inputCardError : null]}
      >
        <TextInput
          testID="title-input"
          value={form.title}
          onChangeText={value => change('title', value)}
          placeholder="What needs to be done?"
          placeholderTextColor={theme.textTertiary}
          style={styles.titleInput}
          autoFocus={!isEdit}
          returnKeyType="next"
        />
        <TextInput
          testID="description-input"
          value={form.description}
          onChangeText={value => change('description', value)}
          placeholder="Add notes"
          placeholderTextColor={theme.textTertiary}
          style={styles.notesInput}
          multiline
        />
      </View>
      {errors.title ? <Text style={styles.error}>{errors.title}</Text> : null}
      {errors.description ? (
        <Text style={styles.error}>{errors.description}</Text>
      ) : null}

      {/* Priority */}
      <Text style={styles.label}>Priority</Text>
      <View style={styles.row}>
        {taskPrioritySchema.options.map(priority => {
          const active = form.priority === priority;
          const color = priorityColor[priority];
          return (
            <Pressable
              key={priority}
              testID={`priority-${priority}`}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => change('priority', priority)}
              style={[
                styles.pill,
                styles.pillGrow,
                { borderColor: active ? color : theme.border },
                active && { backgroundColor: color },
              ]}
            >
              <Icon
                name="flag"
                size={15}
                strokeWidth={2.5}
                color={active ? '#FFFFFF' : color}
              />
              <Text style={[styles.pillText, active && styles.pillTextActive]}>
                {priorityLabel[priority]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Due date */}
      <Text style={styles.label}>Due date</Text>
      <View style={styles.row}>
        {DUE_OPTIONS.map(option => {
          const active = form.due === option.value;
          return (
            <Pressable
              key={option.value}
              testID={`due-${option.value}`}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => change('due', option.value)}
              style={[
                styles.pill,
                styles.pillGrow,
                styles.duePill,
                { borderColor: active ? theme.primary : theme.border },
                active && { backgroundColor: theme.primarySoft },
              ]}
            >
              <Text
                style={[styles.pillText, active && { color: theme.primary }]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Edit only: completed + what the phone stored */}
      {task ? (
        <View style={styles.editBox}>
          <View style={styles.completedRow}>
            <Text style={styles.completedLabel}>Mark as completed</Text>
            <Switch
              testID="completed-switch"
              value={form.isCompleted}
              onValueChange={value => change('isCompleted', value)}
              trackColor={{ true: theme.success, false: theme.border }}
            />
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{`Version ${task.version}`}</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaText}>
              Updated {formatDateTime(task.updatedAt)}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Icon name="cloudOff" size={13} color={theme.textSecondary} />
            <Text style={styles.metaText}>
              Saved on this device · not synced yet
            </Text>
          </View>
        </View>
      ) : null}

      {/* Actions */}
      <View style={styles.actions}>
        {isEdit ? (
          <Pressable
            testID="delete-task"
            accessibilityRole="button"
            accessibilityLabel="Delete task"
            onPress={confirmDelete}
            style={({ pressed }) => [
              styles.deleteButton,
              pressed && styles.pressed,
            ]}
          >
            <Icon name="trash" size={20} color={theme.danger} />
          </Pressable>
        ) : null}
        <View style={styles.saveButton}>
          <Button
            testID="save-task"
            label={saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Task'}
            icon={isEdit ? 'check' : 'plus'}
            onPress={save}
            disabled={saving}
          />
        </View>
      </View>
    </View>
  );
}

const useStyles = makeStyles(t => ({
  sheet: {
    paddingHorizontal: 20,
    paddingTop: 28,
    gap: 12,
    backgroundColor: t.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 4,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  title: { color: t.text, fontSize: 22, fontWeight: '800' },
  subtitle: { color: t.textSecondary, fontSize: 13, marginTop: 2 },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.surfaceMuted,
  },
  inputCard: {
    borderRadius: 18,
    backgroundColor: t.background,
    borderWidth: 1.5,
    borderColor: t.border,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  inputCardError: { borderColor: t.danger },
  titleInput: {
    color: t.text,
    fontSize: 18,
    fontWeight: '700',
    paddingVertical: 10,
  },
  notesInput: {
    color: t.text,
    fontSize: 15,
    minHeight: 44,
    maxHeight: 96,
    paddingTop: 4,
    paddingBottom: 10,
    textAlignVertical: 'top',
  },
  error: {
    color: t.danger,
    fontSize: 13,
    fontWeight: '600',
    marginTop: -4,
    marginLeft: 4,
  },
  label: {
    color: t.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 4,
    marginLeft: 2,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    backgroundColor: t.surface,
  },
  pillGrow: { flexGrow: 1 },
  duePill: { paddingHorizontal: 10 },
  pillText: { color: t.text, fontSize: 14, fontWeight: '600' },
  pillTextActive: { color: '#FFFFFF' },
  editBox: {
    marginTop: 4,
    padding: 14,
    gap: 8,
    borderRadius: 16,
    backgroundColor: t.background,
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  completedLabel: { color: t.text, fontSize: 16, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: t.textSecondary, fontSize: 13 },
  metaDot: { color: t.textTertiary },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  deleteButton: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.dangerSoft,
  },
  saveButton: { flex: 1 },
  pressed: { opacity: 0.7 },
}));
