import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type ScrollViewInstance } from "react-native";
import { LoopDial, RunStats, Timeline } from "../../src/components/Timeline";
import { BrandHeader, Button, Card, Screen, SectionTitle, StatusPill } from "../../src/components/ui";
import { useMission } from "../../src/store";
import { C, F } from "../../src/theme";

const EXAMPLES = [
  { icon: "briefcase-outline", text: "Prepare me for a Senior React Native interview in seven days." },
  { icon: "code-slash-outline", text: "Plan my week to learn TypeScript generics, 1 hour a day." },
] as const;

export default function Mission() {
  const router = useRouter();
  const { goal, setGoal, start, poll, status, events, error } = useMission();
  const running = status === "running";
  const [focused, setFocused] = useState(false);
  const scroll = useRef<ScrollViewInstance>(null);
  const [shown, setShown] = useState(0);

  // While the agent works, ask the server for news once a second.
  useEffect(() => {
    if (!running) return;
    const t = setInterval(poll, 1000);
    return () => clearInterval(t);
  }, [running, poll]);

  // One poll can bring several events: reveal them one by one so the dial lights up every beat.
  useEffect(() => {
    if (shown > events.length) return setShown(events.length);
    if (shown === events.length) return;
    const t = setTimeout(() => setShown((n) => n + 1), 450);
    return () => clearTimeout(t);
  }, [events.length, shown]);

  const visible = events.slice(0, shown);
  const live = running || shown < events.length;

  // Follow the newest event while the run is live.
  useEffect(() => {
    if (live && visible.length) setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 120);
  }, [visible.length, live]);

  const toolCalls = visible.filter((e) => e.kind === "act").length;

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        {/* the dial stays pinned on top while the timeline grows below it */}
        <ScrollView ref={scroll} contentContainerStyle={s.content} stickyHeaderIndices={live ? [2] : []} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <BrandHeader title="Mission Control" subtitle="Intro to Agentic AI · a chatbot tells you, an agent does it" right={<StatusPill status={live ? "running" : status} />} />

          <View style={s.goalWrap}>
            <Card>
              <Text style={s.ask}>What do you want to achieve?</Text>
              <View style={[s.field, focused && s.fieldFocused]}>
                <TextInput
                  value={goal}
                  onChangeText={setGoal}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder="Type a goal, or pick one below…"
                  placeholderTextColor={C.faint}
                  multiline
                  style={s.input}
                  editable={!running}
                  selectionColor={C.orange}
                />
              </View>

              <View style={s.examples}>
                {EXAMPLES.map((e) => {
                  const on = goal === e.text;
                  return (
                    <Pressable key={e.text} onPress={() => setGoal(e.text)} disabled={running} style={({ pressed }) => [s.example, on && s.exampleOn, pressed && { opacity: 0.75 }]}>
                      <Ionicons name={e.icon} size={16} color={on ? C.orange : C.inkSoft} />
                      <Text style={[s.exampleText, on && { color: C.ink }]} numberOfLines={2}>{e.text}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Button title={running ? "Agent is working…" : "Launch the agent"} busy={running} onPress={start} disabled={running || goal.trim().length < 5} />
              {!!error && (
                <View style={s.error}>
                  <Ionicons name="cloud-offline-outline" size={16} color={C.red} />
                  <Text style={s.errorText}>{error}</Text>
                </View>
              )}
            </Card>
          </View>

          <View style={s.dialWrap}>
            <Card>
              <SectionTitle right={live ? <Text style={s.live}>● LIVE</Text> : undefined}>
                {status === "idle" ? "How the agent works" : "The agent loop"}
              </SectionTitle>
              <LoopDial current={live ? visible.at(-1)?.kind : undefined} steps={toolCalls} />
              {status !== "idle" && <RunStats events={visible} />}
            </Card>
          </View>

          <View style={s.body}>
            {visible.length > 0 && (
              <Card>
                <SectionTitle right={<Text style={s.count}>{visible.length} {visible.length === 1 ? "step" : "steps"}</Text>}>What the agent did</SectionTitle>
                <Timeline events={visible} />
              </Card>
            )}

            {status === "done" && !live && (
              <Pressable onPress={() => router.push("/calendar")} style={({ pressed }) => [s.doneCard, pressed && { opacity: 0.85 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.doneTitle}>Your plan is ready</Text>
                  <Text style={s.doneSub}>See it on My Plan</Text>
                </View>
                <View style={s.doneDisc}>
                  <Ionicons name="calendar" size={20} color={C.green} />
                </View>
              </Pressable>
            )}

            <Text style={s.footer}>Built on Harihar Code Studio</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { paddingBottom: 30 },
  goalWrap: { paddingHorizontal: 16, paddingBottom: 7 },
  dialWrap: { paddingHorizontal: 16, paddingVertical: 7, backgroundColor: C.paper },
  body: { paddingHorizontal: 16, paddingTop: 7, gap: 14 },
  ask: { color: C.ink, fontFamily: F.serif, fontSize: 21, fontWeight: "700", marginBottom: 12 },
  field: { backgroundColor: C.paper, borderRadius: 16, borderWidth: 1.5, borderColor: C.line, paddingHorizontal: 14, paddingVertical: 12 },
  fieldFocused: { borderColor: C.orange, backgroundColor: C.card },
  input: { minHeight: 60, fontSize: 16.5, color: C.ink, fontWeight: "600", padding: 0, textAlignVertical: "top", lineHeight: 22 },
  examples: { gap: 8, marginTop: 12, marginBottom: 16 },
  example: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: C.line, borderStyle: "dashed" },
  exampleOn: { borderStyle: "solid", borderColor: C.orange, backgroundColor: C.orangeSoft },
  exampleText: { flex: 1, color: C.inkSoft, fontSize: 13.5, fontWeight: "600", lineHeight: 18 },
  error: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12, backgroundColor: C.redSoft, borderRadius: 12, padding: 10 },
  errorText: { flex: 1, color: C.red, fontWeight: "600", fontSize: 13 },
  live: { color: C.red, fontSize: 11, fontWeight: "900", letterSpacing: 1 },
  count: { color: C.muted, fontSize: 12, fontWeight: "700" },
  doneCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 18, borderRadius: 22, backgroundColor: C.green },
  doneTitle: { color: "#fff", fontFamily: F.serif, fontSize: 20, fontWeight: "700" },
  doneSub: { color: "rgba(255,255,255,0.85)", fontSize: 13.5, fontWeight: "600", marginTop: 2 },
  doneDisc: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  footer: { color: C.faint, fontSize: 11.5, fontWeight: "700", textAlign: "center", marginTop: 4, letterSpacing: 0.4 },
});
