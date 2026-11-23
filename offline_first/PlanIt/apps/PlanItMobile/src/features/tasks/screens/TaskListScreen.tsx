import { useCallback, useLayoutEffect, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ScreenProps } from '../../../app/navigation';
import { repositories } from '../../../app/repositories';
import { Segmented } from '../../../shared/ui/controls';
import { AnimatedNumber } from '../../../shared/ui/AnimatedNumber';
import { brandGradient } from '../../../shared/ui/Brand';
import { Gradient } from '../../../shared/ui/Gradient';
import { Icon } from '../../../shared/ui/Icon';
import { ProgressBar } from '../../../shared/ui/ProgressBar';
import {
  EmptyView,
  ErrorView,
  LoadingView,
} from '../../../shared/ui/StateViews';
import { makeStyles, useTheme } from '../../../shared/ui/theme';
import { useScreenData } from '../../../shared/ui/useScreenData';
import { TaskCard } from '../components/TaskCard';
import type { TaskStatusFilter } from '../data/taskRepository';

export function TaskListScreen({ route, navigation }: ScreenProps<'Tasks'>) {
  const { projectId } = route.params;
  const theme = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<TaskStatusFilter>('all');
  const [search, setSearch] = useState('');

  // Header: a + button and the native search bar (iOS + Android).
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          testID="add-task"
          accessibilityRole="button"
          accessibilityLabel="New task"
          hitSlop={12}
          onPress={() => navigation.navigate('TaskEditor', { projectId })}
        >
          <Icon name="plus" size={26} color={theme.primary} />
        </Pressable>
      ),
      headerSearchBarOptions: {
        placeholder: 'Search tasks',
        hideWhenScrolling: false,
        onChangeText: event => setSearch(event.nativeEvent.text),
        onCancelButtonPress: () => setSearch(''),
      },
    });
  }, [navigation, projectId, theme]);

  // Filtering happens in the repository (with SQLite: a WHERE clause), not in the screen.
  const load = useCallback(async () => {
    const [tasks, all] = await Promise.all([
      repositories.tasks.list({ projectId, status, search }),
      repositories.tasks.list({ projectId }),
    ]);
    const done = all.filter(task => task.isCompleted).length;
    return {
      tasks,
      counts: { all: all.length, active: all.length - done, done },
    };
  }, [projectId, status, search]);
  const { state, reload } = useScreenData(load);

  const openEditor = (taskId?: string) =>
    navigation.navigate('TaskEditor', { projectId, taskId });

  async function toggle(taskId: string, isCompleted: boolean) {
    await repositories.tasks.update(taskId, { isCompleted: !isCompleted });
    reload();
  }

  // Keep the FlatList mounted in every state: iOS large titles + search bar attach to it.
  const data = state.status === 'success' ? state.data : null;
  const tasks = data?.tasks ?? [];
  const counts = data?.counts ?? { all: 0, active: 0, done: 0 };
  const progress = counts.all === 0 ? 0 : counts.done / counts.all;

  return (
    <View style={styles.screen}>
      <FlatList
        data={tasks}
        keyExtractor={task => task.id}
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 100 },
        ]}
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={
          !data ? undefined : (
            <View style={styles.header}>
              {counts.all > 0 ? (
                <Gradient colors={brandGradient} style={styles.progress}>
                  <View style={styles.progressTop}>
                    <Text style={styles.progressText}>
                      {counts.done} of {counts.all} completed
                    </Text>
                    <AnimatedNumber
                      value={Math.round(progress * 100)}
                      suffix="%"
                      style={styles.progressPercent}
                    />
                  </View>
                  <ProgressBar
                    progress={progress}
                    colors={['#FDE68A', '#FBBF24', '#FB923C']}
                    trackColor="rgba(255,255,255,0.22)"
                    height={10}
                  />
                </Gradient>
              ) : null}
              <Segmented
                testIDPrefix="filter"
                value={status}
                onChange={setStatus}
                options={[
                  { value: 'all', label: `All ${counts.all}` },
                  { value: 'active', label: `Active ${counts.active}` },
                  { value: 'done', label: `Done ${counts.done}` },
                ]}
              />
            </View>
          )
        }
        ListEmptyComponent={
          state.status === 'loading' ? (
            <LoadingView />
          ) : state.status === 'error' ? (
            <ErrorView message={state.message} onRetry={reload} />
          ) : search || status !== 'all' ? (
            <EmptyView
              icon="search"
              title="No matching tasks"
              message={
                search
                  ? `Nothing found for “${search}”.`
                  : 'No tasks in this list.'
              }
            />
          ) : (
            <EmptyView
              title="No tasks yet"
              message="Add your first task. It is saved on this phone straight away."
              actionLabel="Add Task"
              onAction={() => openEditor()}
            />
          )
        }
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            onPress={() => openEditor(item.id)}
            onToggle={() => toggle(item.id, item.isCompleted)}
          />
        )}
      />
    </View>
  );
}

function Separator() {
  return <View style={separatorStyle} />;
}

const separatorStyle = { height: 10 };

const useStyles = makeStyles(() => ({
  screen: { flex: 1 },
  list: { paddingHorizontal: 16, flexGrow: 1 },
  header: { gap: 14, paddingTop: 4, paddingBottom: 16 },
  progress: { gap: 12, padding: 16, borderRadius: 18 },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between' },
  progressText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  progressPercent: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
}));
