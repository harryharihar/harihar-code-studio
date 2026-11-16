import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Glass, OS, usePulse } from "../../src/components/os";
import { BrandHeader, Screen, SectionTitle } from "../../src/components/ui";
import { useMission } from "../../src/store";
import { F } from "../../src/theme";

// Part 4: long-term memory, as the agent's memory bank. A glowing core, then every saved fact as a memory cell.
// Tap ✕ to wipe a fact, or type a new one into the command line.
const CELL = ["#22D3EE", "#A78BFA", "#F472B6", "#34D399", "#FBBF24"];

export default function Memory() {
  const { notes, loadNotes, addNote, deleteNote } = useMission();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  useFocusEffect(useCallback(() => { loadNotes(); }, [loadNotes]));
  const p = usePulse(true, 1800);

  const save = async () => {
    if (text.trim().length < 4) return;
    const e = await addNote(text);
    setError(e);
    if (!e) setText("");
  };
  const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 130 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <BrandHeader tag="LONG-TERM MEMORY" title="Memory Bank" subtitle="The agent reads this before every new plan." />

          <View style={s.body}>
            {/* the core */}
            <Glass glow={OS.cyan} style={s.core}>
              <View style={s.orbWrap}>
                <Animated.View style={[s.orbRing, { opacity: p.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] }), transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] }) }] }]} />
                <View style={s.orb}><Ionicons name="sparkles" size={26} color="#fff" /></View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.coreNum}>{notes.length}</Text>
                <Text style={s.coreLabel}>{notes.length === 1 ? "FACT REMEMBERED" : "FACTS REMEMBERED"}</Text>
                <Text style={s.coreSub}>Saved in PostgreSQL · used in every plan</Text>
              </View>
            </Glass>

            <SectionTitle>Memory cells</SectionTitle>
            {notes.length === 0 && <Text style={s.hint}>Empty. Say something in your goal, like “She is vegetarian”, and the agent saves it here.</Text>}
            <View style={{ gap: 10 }}>
              {notes.map((n, i) => {
                const c = CELL[i % CELL.length];
                return (
                  <View key={n.id} style={[s.cell, { borderColor: c + "55" }]}>
                    <View style={[s.cellGlow, { backgroundColor: c, shadowColor: c }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[s.cellId, { color: c }]}>MEM-{String(i + 1).padStart(2, "0")} · {day(n.createdAt)}</Text>
                      <Text style={s.note}>{n.content.replace(/\.$/, "")}</Text>
                    </View>
                    <Pressable onPress={() => deleteNote(n.id)} hitSlop={12} style={({ pressed }) => [s.wipe, pressed && { opacity: 0.4 }]}>
                      <Ionicons name="close" size={16} color={OS.soft} />
                    </Pressable>
                  </View>
                );
              })}
            </View>

            {/* teach it something: a command line */}
            <View style={s.cmd}>
              <Text style={s.prompt}>›</Text>
              <TextInput
                value={text}
                onChangeText={(t) => { setText(t); setError(null); }}
                onSubmitEditing={save}
                returnKeyType="done"
                placeholder={notes.length ? "remember something new…" : "e.g. Riya is vegetarian"}
                placeholderTextColor={OS.faint}
                style={s.input}
                selectionColor={OS.cyan}
              />
              <Pressable onPress={save} disabled={text.trim().length < 4} style={[s.saveBtn, text.trim().length < 4 && { opacity: 0.35 }]}>
                <Ionicons name="arrow-up" size={18} color="#0B0F1E" />
              </Pressable>
            </View>
            {!!error && <Text style={s.error}>{error}</Text>}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const s = StyleSheet.create({
  body: { paddingHorizontal: 16, gap: 14 },
  core: { flexDirection: "row", alignItems: "center", gap: 18 },
  orbWrap: { width: 72, height: 72, alignItems: "center", justifyContent: "center" },
  orbRing: { position: "absolute", width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: OS.cyan },
  orb: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#0891B2", borderWidth: 2, borderColor: OS.cyan, alignItems: "center", justifyContent: "center", shadowColor: OS.cyan, shadowOpacity: 1, shadowRadius: 16 },
  coreNum: { color: OS.text, fontSize: 40, fontWeight: "900", letterSpacing: -1, lineHeight: 44 },
  coreLabel: { color: OS.cyan, fontSize: 10.5, fontWeight: "900", letterSpacing: 1.6, fontFamily: F.mono },
  coreSub: { color: OS.soft, fontSize: 12, fontWeight: "600", marginTop: 4 },
  hint: { color: OS.soft, fontSize: 13.5, lineHeight: 19, fontWeight: "600" },
  cell: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 16, paddingVertical: 12, paddingRight: 12, paddingLeft: 14, backgroundColor: "rgba(255,255,255,0.04)" },
  cellGlow: { width: 8, height: 8, borderRadius: 4, shadowOpacity: 1, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
  cellId: { fontSize: 10, fontWeight: "900", letterSpacing: 1.2, fontFamily: F.mono },
  note: { color: OS.text, fontSize: 16.5, fontWeight: "800", lineHeight: 22, marginTop: 3 },
  wipe: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  cmd: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: "rgba(34,211,238,0.4)", borderRadius: 16, backgroundColor: "rgba(3,6,16,0.75)", paddingLeft: 14, paddingRight: 6, height: 54, marginTop: 4 },
  prompt: { color: OS.cyan, fontSize: 22, fontWeight: "900", fontFamily: F.mono },
  input: { flex: 1, color: OS.text, fontSize: 15, fontFamily: F.mono, padding: 0 },
  saveBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: OS.cyan, alignItems: "center", justifyContent: "center" },
  error: { color: OS.red, fontWeight: "700", fontSize: 13 },
});
