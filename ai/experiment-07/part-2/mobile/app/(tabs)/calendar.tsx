import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { BrandHeader, Button, Card, Screen, SectionTitle } from "../../src/components/ui";
import { useMission } from "../../src/store";
import { C, F } from "../../src/theme";
import type { Task } from "../../src/types";

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function parts(d: string) {
  const date = new Date(`${d}T12:00:00`);
  return {
    weekday: date.toLocaleDateString("en-IN", { weekday: "short" }),
    day: date.getDate(),
    month: date.toLocaleDateString("en-IN", { month: "short" }),
  };
}

function hours(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h${m ? ` ${m}m` : ""}` : `${m}m`;
}

export default function Calendar() {
  const router = useRouter();
  const { tasks, loadTasks, toggle } = useMission();
  useFocusEffect(useCallback(() => { loadTasks(); }, [loadTasks]));

  const done = tasks.filter((t) => t.done).length;
  const total = tasks.reduce((sum, t) => sum + t.minutes, 0);
  const days = [...new Set(tasks.map((t) => t.day))];

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
        <BrandHeader title="My Plan" subtitle="Every task here is from a plan you accepted" />
        <View style={s.body}>
          {tasks.length === 0 ? (
            <Card style={s.empty}>
              <View style={s.emptyIcon}>
                <Ionicons name="calendar-clear-outline" size={30} color={C.orange} />
              </View>
              <Text style={s.emptyTitle}>Nothing planned yet</Text>
              <Text style={s.emptyText}>Make a plan and accept it. Its tasks will fill this page, one day at a time.</Text>
              <View style={{ alignSelf: "stretch", marginTop: 20 }}>
                <Button title="Make a plan" onPress={() => router.push("/")} />
              </View>
            </Card>
          ) : (
            <>
              <Card>
                <View style={s.summaryTop}>
                  <View>
                    <Text style={s.big}>{done}<Text style={s.of}> / {tasks.length}</Text></Text>
                    <Text style={s.small}>sessions done</Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 6 }}>
                    <Text style={s.meta}><Ionicons name="time-outline" size={13} /> {hours(total)} planned</Text>
                    <Text style={s.meta}><Ionicons name="calendar-outline" size={13} /> {days.length} days</Text>
                  </View>
                </View>
                {/* one segment per task: green when it is done */}
                <View style={s.segments}>
                  {tasks.map((t) => (
                    <View key={t.id} style={[s.segment, t.done && { backgroundColor: C.green }]} />
                  ))}
                </View>
              </Card>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.week}>
                {days.map((d) => {
                  const p = parts(d);
                  const list = tasks.filter((t) => t.day === d);
                  const allDone = list.every((t) => t.done);
                  const today = d === todayKey();
                  return (
                    <View key={d} style={[s.dayChip, today && s.dayChipToday]}>
                      <Text style={[s.dayWeek, today && { color: C.paper }]}>{p.weekday}</Text>
                      <Text style={[s.dayNum, today && { color: C.paper }]}>{p.day}</Text>
                      <View style={[s.dayDot, { backgroundColor: allDone ? C.green : C.orange }]} />
                    </View>
                  );
                })}
              </ScrollView>

              <View>
                <SectionTitle>Day by day</SectionTitle>
                <View style={{ gap: 10 }}>
                  {tasks.map((t) => (
                    <TaskCard key={t.id} t={t} n={days.indexOf(t.day) + 1} onToggle={toggle} />
                  ))}
                </View>
              </View>
            </>
          )}
          <Text style={s.footer}>Built on Harihar Code Studio</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

function TaskCard({ t, n, onToggle }: { t: Task; n: number; onToggle: (id: string) => void }) {
  const p = parts(t.day);
  const today = t.day === todayKey();
  return (
    <Pressable onPress={() => onToggle(t.id)} style={({ pressed }) => [s.task, t.done && s.taskDone, pressed && { opacity: 0.85 }]}>
      <View style={s.date}>
        <Text style={s.dateMonth}>{p.month.toUpperCase()}</Text>
        <Text style={s.dateDay}>{p.day}</Text>
        <Text style={s.dateWeek}>{p.weekday}</Text>
      </View>
      <View style={s.taskBody}>
        <Text style={s.dayLabel}>DAY {n}{today ? "  ·  TODAY" : ""}</Text>
        <Text style={[s.title, t.done && s.titleDone]} numberOfLines={2}>{t.title}</Text>
        {!!t.notes && <Text style={s.notes} numberOfLines={2}>{t.notes}</Text>}
        <Text style={s.minutes}>{t.minutes} min</Text>
      </View>
      <View style={[s.check, t.done && s.checked]}>
        {t.done && <Ionicons name="checkmark" size={16} color="#fff" />}
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  body: { paddingHorizontal: 16, gap: 16 },
  empty: { alignItems: "center", paddingVertical: 32 },
  emptyIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: C.orangeSoft, alignItems: "center", justifyContent: "center" },
  emptyTitle: { color: C.ink, fontFamily: F.serif, fontSize: 22, fontWeight: "700", marginTop: 14 },
  emptyText: { color: C.muted, fontSize: 14, textAlign: "center", marginTop: 6, lineHeight: 20, paddingHorizontal: 8 },

  summaryTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  big: { color: C.ink, fontFamily: F.serif, fontSize: 40, fontWeight: "700", letterSpacing: -1 },
  of: { color: C.faint, fontSize: 24 },
  small: { color: C.muted, fontSize: 13, fontWeight: "700" },
  meta: { color: C.inkSoft, fontSize: 12.5, fontWeight: "700" },
  segments: { flexDirection: "row", gap: 5, marginTop: 16 },
  segment: { flex: 1, height: 9, borderRadius: 5, backgroundColor: C.paperDeep },

  week: { gap: 8, paddingRight: 8 },
  dayChip: { width: 54, alignItems: "center", paddingVertical: 10, borderRadius: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  dayChipToday: { backgroundColor: C.ink, borderColor: C.ink },
  dayWeek: { color: C.muted, fontSize: 11, fontWeight: "800" },
  dayNum: { color: C.ink, fontFamily: F.serif, fontSize: 21, fontWeight: "700", marginTop: 2 },
  dayDot: { width: 6, height: 6, borderRadius: 3, marginTop: 5 },

  task: { flexDirection: "row", alignItems: "center", gap: 14, padding: 12, borderRadius: 20, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  taskDone: { opacity: 0.5 },
  date: { width: 58, alignSelf: "stretch", alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: C.paper, borderWidth: 1, borderColor: C.line, paddingVertical: 8 },
  dateMonth: { color: C.orange, fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  dateDay: { color: C.ink, fontFamily: F.serif, fontSize: 24, fontWeight: "700" },
  dateWeek: { color: C.muted, fontSize: 10.5, fontWeight: "700" },
  taskBody: { flex: 1 },
  dayLabel: { color: C.orange, fontSize: 10.5, fontWeight: "900", letterSpacing: 1 },
  title: { color: C.ink, fontSize: 15.5, fontWeight: "800", lineHeight: 20, marginTop: 3 },
  titleDone: { textDecorationLine: "line-through", color: C.muted },
  notes: { color: C.muted, fontSize: 12.5, lineHeight: 17, marginTop: 3 },
  minutes: { color: C.inkSoft, fontSize: 12, fontWeight: "800", marginTop: 6 },
  check: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: C.faint, alignItems: "center", justifyContent: "center" },
  checked: { backgroundColor: C.green, borderColor: C.green },

  footer: { color: C.faint, fontSize: 11.5, fontWeight: "700", textAlign: "center", marginTop: 4, letterSpacing: 0.4 },
});
