import { useCallback, useLayoutEffect } from 'react';
import { FlatList, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { OverviewView, ScreenProps } from '../../../app/navigation';
import { repositories } from '../../../app/repositories';
import { dueOptionToIso } from '../../../shared/lib/dates';
import { AnimatedNumber } from '../../../shared/ui/AnimatedNumber';
import { Segmented } from '../../../shared/ui/controls';
import { Gradient } from '../../../shared/ui/Gradient';
import { Icon, type IconName } from '../../../shared/ui/Icon';
import {
  EmptyView,
  ErrorView,
  LoadingView,
} from '../../../shared/ui/StateViews';
import { makeStyles, projectColor } from '../../../shared/ui/theme';
import { useScreenData } from '../../../shared/ui/useScreenData';
import { TaskCard } from '../components/TaskCard';
import type { TaskFilter } from '../data/taskRepository';

/** Everything that changes per tab: title, colours, filter, empty message. */
const VIEWS: Record<
  OverviewView,
  {
    title: string;
    tab: string;
    icon: IconName;
    colors: readonly string[];
    caption: string;
    filter: () => Omit<TaskFilter, 'projectId'>;
    empty: { title: string; message: string };
  }
> = {
  all: {
    title: 'All Tasks',
    tab: 'All',
    icon: 'inbox',
    colors: ['#4F46E5', '#7C3AED', '#DB2777'],
    caption: 'tasks across all projects',
    filter: () => ({}),
    empty: {
      title: 'No tasks yet',
      message: 'Open a project and add your first task.',
    },
  },
  active: {
    title: 'To Do',
    tab: 'To do',
    icon: 'clock',
    colors: ['#6366F1', '#8B5CF6'],
    caption: 'tasks still open',
    filter: () => ({ status: 'active' }),
    empty: { title: 'All caught up! 🎉', message: 'Nothing left to do.' },
  },
  today: {
    title: 'Due Today',
    tab: 'Today',
    icon: 'calendar',
    colors: ['#F97316', '#F59E0B'],
    caption: 'due today or overdue',
    filter: () => ({
      status: 'active',
      dueBefore: dueOptionToIso('today') ?? undefined,
    }),
    empty: { title: 'Nothing due today ☀️', message: 'Enjoy the free time.' },
  },
  done: {
    title: 'Completed',
    tab: 'Done',
    icon: 'checkCircle',
    colors: ['#10B981', '#14B8A6'],
    caption: 'tasks completed',
    filter: () => ({ status: 'done' }),
    empty: {
      title: 'Nothing completed yet',
      message: 'Tick a task to see it here.',
    },
  },
};

const TABS = (Object.keys(VIEWS) as OverviewView[]).map(value => ({
  value,
  label: VIEWS[value].tab,
}));

/** Tasks from every project, opened from the Home summary cards. */
export function TaskOverviewScreen({
  route,
  navigation,
}: ScreenProps<'Overview'>) {
  const { view } = route.params;
  const config = VIEWS[view];
  const styles = useStyles();
  const insets = useSafeAreaInsets();

  useLayoutEffect(() => {
    navigation.setOptions({ title: config.title });
  }, [navigation, config.title]);

  const load = useCallback(async () => {
    const [tasks, projects] = await Promise.all([
      repositories.tasks.list(VIEWS[view].filter()),
      repositories.projects.list(),
    ]);
    // Same colour per project as on Home (by position in the list).
    const projectById = new Map(
      projects.map((project, index) => [
        project.id,
        { name: project.name, color: projectColor(index) },
      ]),
    );
    return { tasks, projectById };
  }, [view]);
  const { state, reload } = useScreenData(load);

  async function toggle(taskId: string, isCompleted: boolean) {
    await repositories.tasks.update(taskId, { isCompleted: !isCompleted });
    reload();
  }

  const data = state.status === 'success' ? state.data : null;

  return (
    <FlatList
      data={data?.tasks ?? []}
      keyExtractor={task => task.id}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[
        styles.list,
        { paddingBottom: insets.bottom + 24 },
      ]}
      ItemSeparatorComponent={Separator}
      ListHeaderComponent={
        <View style={styles.header}>
          <Segmented
            testIDPrefix="view"
            value={view}
            onChange={next => navigation.setParams({ view: next })}
            options={TABS}
          />
          <Gradient colors={config.colors} style={styles.summary}>
            <View style={styles.summaryIcon}>
              <Icon name={config.icon} size={22} color="#FFFFFF" />
            </View>
            <View>
              <AnimatedNumber
                value={data?.tasks.length ?? 0}
                style={styles.summaryCount}
              />
              <Text style={styles.summaryCaption}>{config.caption}</Text>
            </View>
          </Gradient>
        </View>
      }
      ListEmptyComponent={
        state.status === 'loading' ? (
          <LoadingView />
        ) : state.status === 'error' ? (
          <ErrorView message={state.message} onRetry={reload} />
        ) : (
          <EmptyView
            icon={config.icon}
            title={config.empty.title}
            message={config.empty.message}
          />
        )
      }
      renderItem={({ item }) => (
        <TaskCard
          task={item}
          project={data?.projectById.get(item.projectId)}
          onPress={() =>
            navigation.navigate('TaskEditor', {
              projectId: item.projectId,
              taskId: item.id,
            })
          }
          onToggle={() => toggle(item.id, item.isCompleted)}
        />
      )}
    />
  );
}

function Separator() {
  return <View style={separatorStyle} />;
}

const separatorStyle = { height: 10 };

const useStyles = makeStyles(() => ({
  list: { paddingHorizontal: 16, flexGrow: 1 },
  header: { gap: 14, paddingTop: 8, paddingBottom: 16 },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: 20,
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  summaryCount: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  summaryCaption: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '600',
  },
}));
