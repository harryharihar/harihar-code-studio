import { useIsFocused } from '@react-navigation/native';
import { Pressable, ScrollView, StatusBar, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ScreenProps } from '../../../app/navigation';
import { repositories } from '../../../app/repositories';
import { formatToday, isDueToday } from '../../../shared/lib/dates';
import { AnimatedNumber } from '../../../shared/ui/AnimatedNumber';
import {
  BRAND_NAME,
  BrandLogo,
  BrandMark,
  brandGradient,
} from '../../../shared/ui/Brand';
import { Gradient } from '../../../shared/ui/Gradient';
import { Icon, type IconName } from '../../../shared/ui/Icon';
import { ProgressBar } from '../../../shared/ui/ProgressBar';
import { ErrorView, LoadingView } from '../../../shared/ui/StateViews';
import {
  makeStyles,
  projectGradient,
  useTheme,
} from '../../../shared/ui/theme';
import { useScreenData } from '../../../shared/ui/useScreenData';

type Navigation = ScreenProps<'Home'>['navigation'];

/** Dashboard: branded header, today's numbers, every project with its progress. */
export function HomeScreen({ navigation }: ScreenProps<'Home'>) {
  const styles = useStyles();
  const { state, reload } = useScreenData(loadDashboard);

  // White status bar text over the gradient, only while Home is on screen.
  const isFocused = useIsFocused();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {isFocused ? <StatusBar barStyle="light-content" /> : null}
      <Hero
        data={state.status === 'success' ? state.data : null}
        navigation={navigation}
      />
      <View style={styles.body}>
        {state.status === 'loading' ? <LoadingView /> : null}
        {state.status === 'error' ? (
          <ErrorView message={state.message} onRetry={reload} />
        ) : null}
        {state.status === 'success' ? (
          <Dashboard {...state.data} navigation={navigation} />
        ) : null}
      </View>
    </ScrollView>
  );
}

type DashboardData = Awaited<ReturnType<typeof loadDashboard>>;

async function loadDashboard() {
  const projects = await repositories.projects.list();
  const rows = await Promise.all(
    projects.map(async project => {
      const tasks = await repositories.tasks.list({ projectId: project.id });
      const done = tasks.filter(task => task.isCompleted).length;
      const dueToday = tasks.filter(
        task => !task.isCompleted && isDueToday(task.dueAt),
      ).length;
      return { project, total: tasks.length, done, dueToday };
    }),
  );
  const sum = (pick: (row: (typeof rows)[number]) => number) =>
    rows.reduce((total, row) => total + pick(row), 0);
  return {
    rows,
    stats: {
      total: sum(row => row.total),
      active: sum(row => row.total - row.done),
      dueToday: sum(row => row.dueToday),
      done: sum(row => row.done),
    },
  };
}

function greeting(now = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Full-width brand gradient with today's overall progress. */
function Hero({
  data,
  navigation,
}: {
  data: DashboardData | null;
  navigation: Navigation;
}) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const stats = data?.stats;
  const percent =
    stats && stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  return (
    <Gradient
      colors={brandGradient}
      style={[styles.hero, { paddingTop: insets.top + 12 }]}
    >
      <View style={styles.heroTop}>
        <BrandMark />
        <Pressable
          testID="new-project"
          accessibilityRole="button"
          accessibilityLabel="New project"
          hitSlop={8}
          onPress={() => navigation.navigate('NewProject')}
          style={({ pressed }) => [
            styles.heroButton,
            pressed && styles.pressed,
          ]}
        >
          <Icon name="plus" size={22} strokeWidth={2.5} color="#FFFFFF" />
        </Pressable>
      </View>

      <Text style={styles.greeting}>{greeting()} 👋</Text>
      <Text style={styles.appName}>PlanIt</Text>
      <Text style={styles.date}>{formatToday()}</Text>

      {stats ? (
        <Pressable
          testID="hero-progress"
          accessibilityRole="button"
          accessibilityLabel="View all tasks"
          onPress={() => navigation.navigate('Overview', { view: 'all' })}
          style={({ pressed }) => [
            styles.heroProgress,
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.heroProgressTop}>
            <Text style={styles.heroProgressText}>
              {stats.done} of {stats.total} tasks done
            </Text>
            <AnimatedNumber
              value={percent}
              suffix="%"
              style={styles.heroPercent}
            />
          </View>
          <ProgressBar
            progress={percent / 100}
            colors={['#FDE68A', '#FBBF24', '#FB923C']}
            trackColor="rgba(255,255,255,0.22)"
            height={10}
          />
          <View style={styles.heroLink}>
            <Text style={styles.heroLinkText}>View all tasks</Text>
            <Icon
              name="chevronRight"
              size={14}
              strokeWidth={2.5}
              color="#FFFFFF"
            />
          </View>
        </Pressable>
      ) : null}
    </Gradient>
  );
}

function Dashboard({
  rows,
  stats,
  navigation,
}: DashboardData & { navigation: Navigation }) {
  const theme = useTheme();
  const styles = useStyles();

  return (
    <>
      <View style={styles.stats}>
        <StatCard
          icon="clock"
          label="To do"
          value={stats.active}
          colors={['#6366F1', '#8B5CF6']}
          onPress={() => navigation.navigate('Overview', { view: 'active' })}
        />
        <StatCard
          icon="calendar"
          label="Due today"
          value={stats.dueToday}
          colors={['#F97316', '#F59E0B']}
          onPress={() => navigation.navigate('Overview', { view: 'today' })}
        />
        <StatCard
          icon="checkCircle"
          label="Completed"
          value={stats.done}
          colors={['#10B981', '#14B8A6']}
          onPress={() => navigation.navigate('Overview', { view: 'done' })}
        />
      </View>

      <View style={styles.sectionRow}>
        <Text style={styles.section}>My Projects</Text>
        <Text style={styles.sectionCount}>{rows.length}</Text>
      </View>

      <View style={styles.projects}>
        {rows.map(({ project, total, done }, index) => {
          const colors = projectGradient(index);
          const percent = total === 0 ? 0 : Math.round((done / total) * 100);
          return (
            <Pressable
              key={project.id}
              testID={`project-${project.name}`}
              onPress={() =>
                navigation.navigate('Tasks', {
                  projectId: project.id,
                  projectName: project.name,
                })
              }
              style={({ pressed }) => [
                styles.projectCard,
                pressed && styles.pressed,
              ]}
            >
              <Gradient colors={colors} style={styles.projectIcon}>
                <Icon name="folder" size={20} color="#FFFFFF" />
              </Gradient>
              <View style={styles.projectBody}>
                <View style={styles.projectTop}>
                  <Text style={styles.projectName} numberOfLines={1}>
                    {project.name}
                  </Text>
                  <AnimatedNumber
                    value={percent}
                    suffix="%"
                    style={[styles.projectPercent, { color: colors[0] }]}
                  />
                </View>
                <Text style={styles.projectMeta}>
                  {total - done} open · {done} done
                </Text>
                <View style={styles.projectBar}>
                  <ProgressBar
                    progress={percent / 100}
                    colors={colors}
                    trackColor={theme.surfaceMuted}
                    height={7}
                  />
                </View>
              </View>
              <Icon name="chevronRight" size={18} color={theme.textTertiary} />
            </Pressable>
          );
        })}

        <Pressable
          onPress={() => navigation.navigate('NewProject')}
          style={({ pressed }) => [
            styles.newProject,
            pressed && styles.pressed,
          ]}
        >
          <Icon name="plus" size={18} color={theme.primary} />
          <Text style={styles.newProjectText}>New Project</Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Text style={styles.tagline}>No internet? No problem. ⚡</Text>
        <Text style={styles.taglineSub}>
          Your tasks live on your phone first and sync when you're back online.
        </Text>
        <View style={styles.footerDivider} />
        <View style={styles.crafted}>
          <BrandLogo size={22} />
          <Text style={styles.craftedText}>
            Crafted with ❤️ by{' '}
            <Text style={styles.craftedBrand}>{BRAND_NAME}</Text>
          </Text>
        </View>
      </View>
    </>
  );
}

function StatCard(props: {
  icon: IconName;
  label: string;
  value: number;
  colors: readonly string[];
  onPress: () => void;
}) {
  const styles = useStyles();
  return (
    <Pressable
      testID={`stat-${props.label}`}
      accessibilityRole="button"
      accessibilityLabel={`${props.value} ${props.label}`}
      onPress={props.onPress}
      style={({ pressed }) => [styles.statPress, pressed && styles.pressed]}
    >
      <Gradient colors={props.colors} style={styles.stat}>
        <View style={styles.statTop}>
          <View style={styles.statIcon}>
            <Icon name={props.icon} size={16} color="#FFFFFF" />
          </View>
          <Icon
            name="chevronRight"
            size={16}
            strokeWidth={2.5}
            color="rgba(255,255,255,0.8)"
          />
        </View>
        <AnimatedNumber value={props.value} style={styles.statValue} />
        <Text style={styles.statLabel}>{props.label}</Text>
      </Gradient>
    </Pressable>
  );
}

const useStyles = makeStyles(t => ({
  screen: { backgroundColor: t.background },
  content: { paddingBottom: 40 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },

  // Hero
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 26,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  greeting: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 22,
  },
  appName: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1,
    marginTop: 2,
  },
  date: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
    fontWeight: '500',
    marginTop: 2,
  },
  heroProgress: {
    marginTop: 20,
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.16)',
    gap: 10,
  },
  heroLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
  },
  heroLinkText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  heroProgressTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  heroProgressText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  heroPercent: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },

  body: { paddingHorizontal: 16, paddingTop: 18 },

  // Stats
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, padding: 14, borderRadius: 18 },
  statPress: { flex: 1 },
  statTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginBottom: 12,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },

  // Projects
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 28,
    marginBottom: 12,
  },
  section: { color: t.text, fontSize: 20, fontWeight: '800' },
  sectionCount: {
    color: t.primary,
    backgroundColor: t.primarySoft,
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  projects: { gap: 10 },
  projectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 18,
    backgroundColor: t.surface,
    borderWidth: t.dark ? 1 : 0,
    borderColor: t.border,
    shadowColor: '#1E1B4B',
    shadowOpacity: t.dark ? 0 : 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  projectIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectBody: { flex: 1, gap: 4 },
  projectTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  projectName: { flex: 1, color: t.text, fontSize: 17, fontWeight: '700' },
  projectPercent: {
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  projectMeta: { color: t.textSecondary, fontSize: 13, fontWeight: '500' },
  projectBar: { marginTop: 6 },
  newProject: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: t.primary,
    backgroundColor: t.primarySoft,
  },
  newProjectText: { color: t.primary, fontSize: 16, fontWeight: '700' },

  footer: {
    marginTop: 28,
    padding: 18,
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: t.surface,
    borderWidth: 1,
    borderColor: t.dark ? t.border : t.primarySoft,
  },
  tagline: {
    color: t.primary,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  taglineSub: {
    color: t.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 6,
  },
  footerDivider: {
    alignSelf: 'stretch',
    height: 1,
    backgroundColor: t.border,
    marginVertical: 14,
  },
  crafted: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  craftedText: { color: t.textSecondary, fontSize: 13, fontWeight: '500' },
  craftedBrand: { color: t.text, fontWeight: '800' },
}));
