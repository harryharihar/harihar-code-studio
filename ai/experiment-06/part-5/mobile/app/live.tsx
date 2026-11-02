import { AudioModule } from "expo-audio";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import InCallManager from "react-native-incall-manager";
import Animated, {
  cancelAnimation, Easing, FadeIn, FadeInUp, FadeOut, useAnimatedStyle, useSharedValue, withRepeat, withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { ErrorCard } from "@/components/voice/result-card";
import { Brand, Gradients } from "@/constants/brand";
import { startCall, type Call, type CallState } from "@/live/call";
import { runTool } from "@/live/tools";
import { setupNotifications } from "@/notify/reminders";
import { loadItems, storeItems } from "@/store/items";
import type { SavedItem } from "@/types";
import { whenLabel } from "@/utils/when";

type Line = { id: number; who: "you" | "ai"; text: string };

const LABEL: Record<CallState, string> = {
  connecting: "Calling…",
  listening: "Listening",
  thinking: "Thinking…",
  speaking: "Speaking",
};
const COLOR: Record<CallState, string> = {
  connecting: Brand.textMuted,
  listening: Brand.green,
  thinking: Brand.orange,
  speaking: Brand.violet,
};

export default function LiveScreen() {
  const router = useRouter();
  const callRef = useRef<Call | null>(null);
  const itemsRef = useRef<SavedItem[]>([]);
  const lineId = useRef(0);
  const closed = useRef(false); // the screen was closed while the call was still connecting

  const [state, setState] = useState<CallState>("connecting");
  const [lines, setLines] = useState<Line[]>([]);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [needsSettings, setNeedsSettings] = useState(false);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);

  async function begin() {
    // a new screen starts in "connecting"; retry() resets the state before calling this
    // again, so nothing here sets state before the first await (React Compiler rule)
    const { granted, canAskAgain } = await AudioModule.requestRecordingPermissionsAsync();
    if (!granted) {
      setNeedsSettings(!canAskAgain);
      return setError("Mic permission is needed. Allow it in Settings.");
    }
    setNeedsSettings(false);

    try {
      const call = await startCall({
        onState: setState,
        onLine: (who, text) => setLines((prev) => [...prev, { id: lineId.current++, who, text }].slice(-12)),
        // The assistant asks, the phone does it: save_item and get_plan run here
        onTool: async (name, args) => {
          const out: any = await runTool(name, args, { list: () => itemsRef.current, add: saveToPhone });
          if (name === "save_item" && out.ok) showToast(`Saved · ${out.title}${whenLabel(out.date, out.time) ? ` · ${whenLabel(out.date, out.time)}` : ""}`);
          return out;
        },
        onError: (message) => { end(); setError(message); },
      });
      if (closed.current) call.stop(); else callRef.current = call;
    } catch (err) {
      end();
      setError(err instanceof Error ? err.message : "Couldn't start the call.");
    }
  }

  function end() {
    callRef.current?.stop();
    callRef.current = null;
  }

  // The call starts when the screen opens and ends when it closes.
  useEffect(() => {
    loadItems().then((list) => { itemsRef.current = list; });
    setupNotifications();
    void Promise.resolve().then(begin); // start the call right after the first render
    return () => { closed.current = true; end(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // call timer, from the moment the call is connected
  const connected = state !== "connecting" && !error;
  useEffect(() => {
    if (!connected) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [connected]);

  function saveToPhone(item: SavedItem) {
    itemsRef.current = [...itemsRef.current, item];
    storeItems(itemsRef.current); // the home screen reloads the list when you come back
  }

  function showToast(text: string) {
    setToast(text);
    setTimeout(() => setToast(null), 3500);
  }

  function retry() {
    setError("");
    setState("connecting");
    setLines([]);
    begin();
  }

  function toggleMute() {
    callRef.current?.mute(!muted);
    setMuted(!muted);
  }

  function toggleSpeaker() {
    InCallManager.setForceSpeakerphoneOn(!speaker);
    setSpeaker(!speaker);
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <View style={styles.screen}>
      <View pointerEvents="none" style={styles.glow} />

      <SafeAreaView edges={["top"]} style={styles.top}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}
          accessibilityRole="button" accessibilityLabel="Close">
          <Ionicons name="chevron-down" size={26} color={Brand.textSoft} />
        </Pressable>
        <Text style={styles.topText}>{error ? "Call ended" : connected ? `${mm}:${ss}` : "Live call"}</Text>
        <View style={styles.back} />
      </SafeAreaView>

      {error ? (
        <View style={styles.errorWrap}>
          <ErrorCard
            message={error}
            actionLabel={needsSettings ? "Open Settings" : "Try again"}
            onAction={() => (needsSettings ? Linking.openSettings() : retry())}
          />
        </View>
      ) : (
        <>
          <View style={styles.hero}>
            <Orb state={state} />
            <Text style={styles.name}>Voice Assistant</Text>
            <View style={styles.stateRow}>
              <View style={[styles.stateDot, { backgroundColor: COLOR[state] }]} />
              <Text style={[styles.stateText, { color: COLOR[state] }]}>{muted ? "Muted" : LABEL[state]}</Text>
            </View>
          </View>

          <ScrollView ref={scroll} style={styles.chat} contentContainerStyle={styles.chatContent}
            onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })} showsVerticalScrollIndicator={false}>
            {lines.length === 0 && (
              <Text style={styles.tip}>No button to press. Just talk, and interrupt her any time.</Text>
            )}
            {lines.map((l) => (
              <Animated.View key={l.id} entering={FadeInUp} style={[styles.bubble, l.who === "you" ? styles.you : styles.ai]}>
                <Text style={[styles.who, l.who === "ai" && { color: Brand.violet }]}>{l.who === "you" ? "You" : "Assistant"}</Text>
                <Text style={styles.text}>{l.text}</Text>
              </Animated.View>
            ))}
          </ScrollView>
        </>
      )}

      {toast && (
        <Animated.View entering={FadeInUp} exiting={FadeOut} style={styles.toast}>
          <Ionicons name="checkmark-circle" size={20} color={Brand.green} />
          <Text style={styles.toastText} numberOfLines={1}>{toast}</Text>
        </Animated.View>
      )}

      <SafeAreaView edges={["bottom"]} style={styles.controls}>
        <Control icon={muted ? "mic-off" : "mic"} label={muted ? "Unmute" : "Mute"} on={muted} onPress={toggleMute} disabled={!!error} />
        <Pressable onPress={() => router.back()} style={styles.endButton} accessibilityRole="button" accessibilityLabel="End call">
          <Ionicons name="call" size={32} color="#fff" style={styles.endIcon} />
        </Pressable>
        <Control icon={speaker ? "volume-high" : "volume-low"} label="Speaker" on={speaker} onPress={toggleSpeaker} disabled={!!error} />
      </SafeAreaView>
    </View>
  );
}

function Control({ icon, label, on, onPress, disabled }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; on: boolean; onPress: () => void; disabled?: boolean;
}) {
  return (
    <View style={styles.control}>
      <Pressable onPress={onPress} disabled={disabled} style={[styles.round, on && styles.roundOn]}
        accessibilityRole="button" accessibilityLabel={label}>
        <Ionicons name={icon} size={24} color={on ? Brand.bg : Brand.text} />
      </Pressable>
      <Text style={styles.controlLabel}>{label}</Text>
    </View>
  );
}

// The assistant's avatar: rings pulse while she listens or speaks, in the state's colour.
function Orb({ state }: { state: CallState }) {
  const pulse = useSharedValue(0);
  const active = state === "speaking" || state === "listening";
  useEffect(() => {
    pulse.value = 0;
    if (active) pulse.value = withRepeat(withTiming(1, { duration: state === "speaking" ? 900 : 1600, easing: Easing.out(Easing.quad) }), -1, false);
    return () => cancelAnimation(pulse);
  }, [active, state, pulse]);
  const ring = (delay: number) => () => {
    "worklet";
    const p = (pulse.value + delay) % 1;
    return { transform: [{ scale: 1 + p * 0.6 }], opacity: active ? 0.55 * (1 - p) : 0 };
  };
  const r1 = useAnimatedStyle(ring(0));
  const r2 = useAnimatedStyle(ring(0.5));
  const color = COLOR[state];
  return (
    <View style={styles.orbWrap}>
      <Animated.View style={[styles.ring, { borderColor: color }, r1]} />
      <Animated.View style={[styles.ring, { borderColor: color }, r2]} />
      <Animated.View entering={FadeIn} style={[styles.orb, { boxShadow: `0 0 40px ${color}` }]}>
        <Text style={styles.orbText}>AI</Text>
      </Animated.View>
    </View>
  );
}

const ORB = 132;
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.bg },
  glow: { position: "absolute", top: 0, left: 0, right: 0, height: 520, experimental_backgroundImage: Gradients.glow },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 4 },
  back: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  topText: { color: Brand.textSoft, fontSize: 15, fontWeight: "700", fontVariant: ["tabular-nums"] },
  errorWrap: { flex: 1, justifyContent: "center", paddingHorizontal: 22 },

  hero: { alignItems: "center", paddingTop: 18, gap: 10 },
  orbWrap: { width: ORB * 1.7, height: ORB * 1.7, alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", width: ORB, height: ORB, borderRadius: ORB / 2, borderWidth: 3 },
  orb: {
    width: ORB, height: ORB, borderRadius: ORB / 2, alignItems: "center", justifyContent: "center",
    experimental_backgroundImage: Gradients.violet,
  },
  orbText: { color: "#fff", fontSize: 40, fontWeight: "900", letterSpacing: 2 },
  name: { color: Brand.text, fontSize: 26, fontWeight: "800", letterSpacing: -0.4, marginTop: -8 },
  stateRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  stateDot: { width: 9, height: 9, borderRadius: 5 },
  stateText: { fontSize: 15, fontWeight: "700" },

  chat: { flex: 1, marginTop: 14 },
  chatContent: { paddingHorizontal: 18, paddingBottom: 16, gap: 10 },
  tip: { color: Brand.textMuted, fontSize: 15, textAlign: "center", marginTop: 12, lineHeight: 21 },
  bubble: { maxWidth: "84%", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, gap: 2 },
  you: { alignSelf: "flex-end", backgroundColor: Brand.surfaceRaised, borderBottomRightRadius: 6 },
  ai: { alignSelf: "flex-start", backgroundColor: Brand.violetSoft, borderWidth: 1, borderColor: "rgba(139, 108, 255, 0.35)", borderBottomLeftRadius: 6 },
  who: { color: Brand.textMuted, fontSize: 11, fontWeight: "800", letterSpacing: 0.8 },
  text: { color: Brand.text, fontSize: 16, lineHeight: 22 },

  toast: {
    position: "absolute", left: 20, right: 20, bottom: 150, flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, backgroundColor: Brand.surfaceRaised,
    borderWidth: 1, borderColor: "rgba(45, 212, 160, 0.5)", boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
  },
  toastText: { flex: 1, color: Brand.text, fontSize: 15, fontWeight: "700" },

  controls: { flexDirection: "row", alignItems: "flex-start", justifyContent: "center", gap: 34, paddingTop: 12, paddingBottom: 18 },
  control: { alignItems: "center", gap: 6 },
  round: {
    width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center",
    backgroundColor: Brand.surfaceRaised, borderWidth: 1, borderColor: Brand.borderStrong,
  },
  roundOn: { backgroundColor: Brand.text },
  controlLabel: { color: Brand.textMuted, fontSize: 12, fontWeight: "600" },
  endButton: {
    width: 76, height: 76, borderRadius: 38, alignItems: "center", justifyContent: "center",
    backgroundColor: Brand.red, boxShadow: "0 0 28px rgba(255, 77, 94, 0.5)",
  },
  endIcon: { transform: [{ rotate: "135deg" }] }, // the phone handset, hung up
});
