import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { BrandHeader, Screen } from "../../src/components/ui";
import { useMission } from "../../src/store";
import { C, F } from "../../src/theme";

// Part 4: long-term memory, drawn as one page of a notebook.
// Every note is a line on the page. Cross a line out to forget it, or write on the next empty line.
const RULE = "#CFDDE8"; // the blue ruled lines
const MARGIN = "#E59A93"; // the red margin line
const LINE = 58;

export default function Memory() {
  const { notes, loadNotes, addNote, deleteNote } = useMission();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  useFocusEffect(useCallback(() => { loadNotes(); }, [loadNotes]));

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
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <BrandHeader tag="LONG-TERM MEMORY" title="What I remember" subtitle="I read this page before every new plan" />

          <View style={s.page}>
            {/* binder holes */}
            <View style={s.holes}>{[0, 1, 2, 3, 4].map((i) => <View key={i} style={s.hole} />)}</View>
            <View style={s.margin} />
            <Text style={s.pageTitle}>Notes about you</Text>

            {notes.map((n) => (
              <View key={n.id} style={s.line}>
                <Text style={s.date}>{day(n.createdAt)}</Text>
                <Text style={s.note} numberOfLines={2}>{n.content.replace(/\.$/, "")}</Text>
                <Pressable onPress={() => deleteNote(n.id)} hitSlop={14} style={({ pressed }) => [s.cross, pressed && { opacity: 0.4 }]}>
                  <Text style={s.crossText}>✕</Text>
                </Pressable>
              </View>
            ))}

            {/* the next empty line: write on it */}
            <View style={s.line}>
              <Text style={s.date}>new</Text>
              <TextInput
                value={text}
                onChangeText={(t) => { setText(t); setError(null); }}
                onSubmitEditing={save}
                returnKeyType="done"
                placeholder={notes.length ? "Write another note…" : "e.g. Riya is vegetarian"}
                placeholderTextColor="#B9B2A4"
                style={s.write}
                selectionColor={C.orange}
              />
              {text.trim().length >= 4 && (
                <Pressable onPress={save} hitSlop={10}>
                  <Text style={s.save}>Save</Text>
                </Pressable>
              )}
            </View>
            <View style={s.line} />
            <View style={[s.line, { borderBottomWidth: 0 }]} />
          </View>

          {!!error && <Text style={s.error}>{error}</Text>}
          <Text style={s.hint}>
            {notes.length === 0
              ? "Empty page. Say something in your goal, like “She is vegetarian”, and I’ll write it here."
              : "Tap ✕ to cross out anything you don’t want me to remember."}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const s = StyleSheet.create({
  page: {
    marginHorizontal: 16, marginTop: 4, paddingTop: 34, paddingRight: 16, backgroundColor: "#FFFDF8", borderRadius: 4,
    shadowColor: "#3A2A14", shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  holes: { position: "absolute", top: 12, left: 0, right: 0, flexDirection: "row", justifyContent: "space-evenly" },
  hole: { width: 12, height: 12, borderRadius: 6, backgroundColor: C.paper, borderWidth: 1, borderColor: "#E2D8C6" },
  margin: { position: "absolute", left: 62, top: 0, bottom: 0, width: 1.5, backgroundColor: MARGIN },
  pageTitle: { marginLeft: 76, marginTop: 8, marginBottom: 4, color: C.orange, fontFamily: F.serif, fontStyle: "italic", fontSize: 15, fontWeight: "700" },
  line: { minHeight: LINE, flexDirection: "row", alignItems: "flex-end", paddingBottom: 9, borderBottomWidth: 1, borderBottomColor: RULE },
  date: { width: 62, paddingRight: 8, textAlign: "right", color: "#B0A795", fontSize: 10.5, fontWeight: "700", marginBottom: 4 },
  note: { flex: 1, marginLeft: 14, color: "#1F2A44", fontFamily: F.serif, fontStyle: "italic", fontSize: 21, lineHeight: 26 },
  cross: { paddingHorizontal: 6, paddingBottom: 3 },
  crossText: { color: "#C9B9A3", fontSize: 15, fontWeight: "700" },
  write: { flex: 1, marginLeft: 14, color: "#1F2A44", fontFamily: F.serif, fontStyle: "italic", fontSize: 19, padding: 0 },
  save: { color: C.orange, fontSize: 14, fontWeight: "900", textDecorationLine: "underline", paddingBottom: 3 },
  error: { marginHorizontal: 24, marginTop: 12, color: C.red, fontWeight: "700", fontSize: 13 },
  hint: { marginHorizontal: 24, marginTop: 14, color: C.muted, fontSize: 13, lineHeight: 19, fontWeight: "600" },
});
