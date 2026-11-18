/**
 * Episode 04 demo app.
 *
 * - Sync Lab: two phones + one server, junior vs senior data model.
 * - Models:   create / update tasks and watch IDs, versions and validation.
 *
 * Real screens arrive in Ep 05; real SQLite in Ep 07; real sync in Ep 12.
 */

import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { z } from 'zod';

import {
  runScenario,
  SCENARIOS,
  shortId,
  type CardView,
  type Mode,
  type Outcome,
  type ScenarioId,
} from './src/dev/syncLab';
import { createProject } from './src/features/projects/domain/project';
import {
  createTask,
  createTaskInputSchema,
  updateTask,
  type LocalTask,
} from './src/features/tasks/domain/task';

const C = {
  bg: '#0A0E11',
  surface: '#12181C',
  raised: '#1A2228',
  border: '#232D34',
  text: '#F3F6F5',
  soft: '#DCE3E0',
  muted: '#95A29E',
  green: '#22C08F',
  greenSoft: 'rgba(34,192,143,0.14)',
  orange: '#FF8A1F',
  orangeSoft: 'rgba(255,138,31,0.14)',
  red: '#FF7A66',
  redSoft: 'rgba(255,122,102,0.14)',
};

const STEP_MS = 1100;

type Tab = 'lab' | 'models';

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <Root />
    </SafeAreaProvider>
  );
}

function Root() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('lab');

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <Text style={styles.eyebrow}>PLANIT · EPISODE 04</Text>
      <View style={styles.tabs}>
        <Pill label="Sync Lab" active={tab === 'lab'} onPress={() => setTab('lab')} />
        <Pill label="Models" active={tab === 'models'} onPress={() => setTab('models')} />
      </View>
      {tab === 'lab' ? <SyncLab bottom={insets.bottom} /> : <Models bottom={insets.bottom} />}
    </View>
  );
}

// ---------------------------------------------------------------- Sync Lab

function SyncLab({ bottom }: { bottom: number }) {
  const [mode, setMode] = useState<Mode>('junior');
  const [scenario, setScenario] = useState<ScenarioId | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!outcome || shown >= outcome.steps.length) {
      return;
    }
    const timer = setTimeout(() => setShown(n => n + 1), STEP_MS);
    return () => clearTimeout(timer);
  }, [outcome, shown]);

  function run(id: ScenarioId, nextMode: Mode = mode) {
    setScenario(id);
    setOutcome(runScenario(id, nextMode));
    setShown(1);
  }

  function switchMode(next: Mode) {
    setMode(next);
    if (scenario) {
      run(scenario, next);
    }
  }

  const step = outcome && shown > 0 ? outcome.steps[shown - 1] : null;
  const finished = outcome !== null && shown >= outcome.steps.length;

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: bottom + 24 }}>
      <Text style={styles.title}>
        Two phones. <Text style={{ color: C.green }}>One server.</Text>
      </Text>
      <Text style={styles.muted}>Both phones are offline. Then they sync.</Text>

      <View style={styles.row}>
        <ModeButton
          label="Junior model"
          hint="counter IDs · no checks"
          active={mode === 'junior'}
          color={C.orange}
          onPress={() => switchMode('junior')}
        />
        <ModeButton
          label="Senior model"
          hint="UUID v7 · tombstone · Zod"
          active={mode === 'senior'}
          color={C.green}
          onPress={() => switchMode('senior')}
        />
      </View>

      <View style={styles.row}>
        {SCENARIOS.map(s => (
          <Pill
            key={s.id}
            label={s.label}
            active={scenario === s.id}
            onPress={() => run(s.id)}
          />
        ))}
      </View>

      <Lane icon="📱" name="Phone A" cards={step?.state.phoneA ?? []} />
      <Lane icon="☁️" name="Server" cards={step?.state.server ?? []} />
      <Lane icon="📱" name="Phone B" cards={step?.state.phoneB ?? []} />

      {outcome === null ? (
        <Text style={[styles.muted, styles.center]}>Pick a story above to start.</Text>
      ) : (
        <View style={styles.log}>
          {outcome.steps.slice(0, shown).map((s, i) => (
            <Text
              key={`${i}-${s.log}`}
              style={[
                styles.logLine,
                s.tone === 'bad' && { color: C.red },
                s.tone === 'good' && { color: C.green },
                i === shown - 1 && styles.logCurrent,
              ]}
            >
              {i + 1}. {s.log}
            </Text>
          ))}
        </View>
      )}

      {finished && outcome && (
        <View
          style={[
            styles.verdict,
            outcome.verdictTone === 'good'
              ? { backgroundColor: C.greenSoft, borderColor: C.green }
              : { backgroundColor: C.redSoft, borderColor: C.red },
          ]}
        >
          <Text
            style={[
              styles.verdictText,
              { color: outcome.verdictTone === 'good' ? C.green : C.red },
            ]}
          >
            {outcome.verdictTone === 'good' ? '✓ ' : '✕ '}
            {outcome.verdict}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

function Lane({ icon, name, cards }: { icon: string; name: string; cards: CardView[] }) {
  return (
    <View style={styles.lane}>
      <Text style={styles.laneName}>
        {icon} {name}
      </Text>
      <View style={styles.cards}>
        {cards.length === 0 ? (
          <Text style={styles.empty}>empty</Text>
        ) : (
          cards.map(card => (
            <View
              key={card.key}
              style={[
                styles.card,
                card.tone === 'error' && { borderColor: C.red, backgroundColor: C.redSoft },
                card.tone === 'deleted' && styles.cardDeleted,
              ]}
            >
              <Text
                style={[styles.cardTitle, card.tone === 'deleted' && styles.strike]}
                numberOfLines={1}
              >
                {card.title}
              </Text>
              <Text style={styles.mono}>{card.id}</Text>
              {card.note ? (
                <Text style={[styles.mono, card.tone === 'error' && { color: C.red }]}>
                  {card.note}
                </Text>
              ) : null}
            </View>
          ))
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------- Models

const project = createProject({ name: 'Ghar ka kaam' });
const sampleTitles = ['Bijli bill pay karna', 'Doodh lana', 'Gas cylinder book karna'];

function Models({ bottom }: { bottom: number }) {
  const [tasks, setTasks] = useState<LocalTask[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  function addTask() {
    const title = sampleTitles[tasks.length % sampleTitles.length];
    setTasks(current => [createTask({ projectId: project.id, title, priority: 'high' }), ...current]);
    setErrors([]);
  }

  function toggleFirst() {
    setTasks(([first, ...rest]) =>
      first ? [updateTask(first, { isCompleted: !first.isCompleted }), ...rest] : rest,
    );
  }

  function tryInvalid() {
    const result = createTaskInputSchema.safeParse({
      projectId: project.id,
      title: '   ',
      dueAt: 'kal shaam',
    });
    if (!result.success) {
      const { fieldErrors } = z.flattenError(result.error);
      setErrors(
        Object.entries(fieldErrors).map(([field, m]) => `${field}: ${(m ?? []).join(', ')}`),
      );
    }
  }

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: bottom + 24 }}>
      <Text style={styles.title}>
        Created <Text style={{ color: C.green }}>on the phone.</Text>
      </Text>
      <Text style={styles.muted}>Project: {project.name}</Text>
      <Text style={styles.mono}>{project.id}</Text>

      <View style={styles.row}>
        <Pill label="+ Task" active onPress={addTask} />
        <Pill label="Toggle done" onPress={toggleFirst} />
        <Pill label="Invalid" onPress={tryInvalid} />
      </View>

      {errors.map(message => (
        <Text key={message} style={styles.error}>
          ✕ {message}
        </Text>
      ))}

      {tasks.map(task => (
        <View key={task.id} style={styles.bigCard}>
          <Text style={styles.cardTitle}>
            {task.isCompleted ? '✅ ' : ''}
            {task.title}
          </Text>
          <Text style={styles.mono}>id: {task.id}</Text>
          <Text style={styles.mono}>short: {shortId(task.id)}</Text>
          <Text style={styles.mono}>updatedAt: {task.updatedAt}</Text>
          <Text style={styles.mono}>
            version: {task.version} · sync: {task.syncStatus} · priority: {task.priority}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

// ---------------------------------------------------------------- shared UI

function Pill({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.pill, active && styles.pillActive]}>
      <Text style={[styles.pillText, active && { color: C.bg }]}>{label}</Text>
    </Pressable>
  );
}

function ModeButton(props: {
  label: string;
  hint: string;
  active: boolean;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={props.onPress}
      style={[styles.mode, props.active && { borderColor: props.color, backgroundColor: C.raised }]}
    >
      <Text style={[styles.modeLabel, props.active && { color: props.color }]}>{props.label}</Text>
      <Text style={styles.modeHint}>{props.hint}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16, backgroundColor: C.bg },
  eyebrow: { color: C.green, fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  tabs: { flexDirection: 'row', gap: 8, marginTop: 10, marginBottom: 14 },
  title: { color: C.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  muted: { color: C.muted, marginTop: 4 },
  center: { textAlign: 'center', marginTop: 16 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  pillActive: { backgroundColor: C.green, borderColor: C.green },
  pillText: { color: C.soft, fontWeight: '700', fontSize: 13 },
  mode: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  modeLabel: { color: C.soft, fontWeight: '800', fontSize: 15 },
  modeHint: { color: C.muted, fontSize: 11, marginTop: 2 },
  lane: {
    marginTop: 12,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  laneName: { color: C.muted, fontSize: 12, fontWeight: '800', marginBottom: 6 },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  empty: { color: C.muted, fontStyle: 'italic', fontSize: 12 },
  card: {
    minWidth: 140,
    maxWidth: '100%',
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.raised,
  },
  cardDeleted: { opacity: 0.6, borderStyle: 'dashed' },
  cardTitle: { color: C.text, fontWeight: '700', fontSize: 14, marginBottom: 2 },
  strike: { textDecorationLine: 'line-through' },
  mono: { color: C.muted, fontFamily: 'Menlo', fontSize: 11 },
  log: { marginTop: 14, gap: 4 },
  logLine: { color: C.muted, fontSize: 13, lineHeight: 18 },
  logCurrent: { fontWeight: '700' },
  verdict: { marginTop: 14, padding: 14, borderRadius: 14, borderWidth: 1.5 },
  verdictText: { fontSize: 17, fontWeight: '800' },
  error: { color: C.red, marginTop: 8 },
  bigCard: {
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
});

export default App;
