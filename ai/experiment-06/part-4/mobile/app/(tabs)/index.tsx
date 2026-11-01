import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { askAssistant } from "@/api/voice";
import { playReply, stopSpeaking } from "@/audio/player";
import { ActionCard } from "@/components/ActionCard";
import { Upcoming } from "@/components/Upcoming";
import { MicButton } from "@/components/voice/mic-button";
import { ErrorCard, TranscriptCard } from "@/components/voice/result-card";
import { Brand, Gradients } from "@/constants/brand";
import { cancelFor, scheduleFor, setupNotifications } from "@/notify/reminders";
import { isSavable, loadItems, newItem, storeItems, summarize } from "@/store/items";
import type { Action, AssistantResult, Pending, SavedItem } from "@/types";

const logo = require("@/assets/images/hcs-logo.png");

const SPEECH_DB = -40;     // louder than this = the user is talking
const SILENCE_MS = 1500;   // this long quiet after talking = the user has finished
const NO_SPEECH_MS = 7000; // mic opened but nobody spoke = give up quietly

// The screen is always in exactly one of these six states.
type Phase = "idle" | "recording" | "working" | "speaking" | "done" | "error";

function formatTime(ms: number) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function VoiceScreen() {
  // HIGH_QUALITY records AAC in an .m4a file, which OpenAI reads directly.
  // Mono instead of the preset's stereo: speech needs one channel.
  // Metering reports the mic level, so we can tell when the user stops talking.
  const recorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    numberOfChannels: 1,
    isMeteringEnabled: true,
  });
  const recState = useAudioRecorderState(recorder, 100); // level every 100 ms

  const [phase, setPhase] = useState<Phase>("idle");
  const [answer, setAnswer] = useState<AssistantResult | null>(null);
  // When the AI asks a follow-up question, the sentence that led to it is
  // kept here and sent along with the user's spoken answer.
  const [context, setContext] = useState<string | undefined>();
  // Part 4: the card waiting for "haan", and the list saved on the phone
  const [pending, setPending] = useState<Pending | null>(null);
  const [items, setItems] = useState<SavedItem[]>([]);
  const itemsRef = useRef<SavedItem[]>([]);
  const [error, setErrorMessage] = useState("");
  // Kept so "Try again" can re-send the same recording after a failed upload.
  const [lastUri, setLastUri] = useState<string | null>(null);
  const [needsSettings, setNeedsSettings] = useState(false);

  const stopping = useRef(false);   // silence-stop and a tap can arrive together
  const heardVoice = useRef(false); // has the user said anything yet?
  const lastLoud = useRef(0);       // recording time (ms) of the last loud moment

  // Load the saved list, and ask for notification permission once, up front.
  useEffect(() => {
    loadItems().then((list) => { itemsRef.current = list; setItems(list); });
    setupNotifications();
  }, []);

  function setAndStore(next: SavedItem[]) {
    itemsRef.current = next;
    setItems(next);
    storeItems(next);
  }

  // "haan" → save on the phone, and set a real notification for reminders and tasks
  async function save(action: Action, said: string) {
    const item = newItem(action, said);
    item.notificationId = await scheduleFor(item).catch(() => null);
    setAndStore([...itemsRef.current, item]);
  }

  async function onItemDone(item: SavedItem) {
    await cancelFor(item); // done → its notification goes too
    setAndStore(itemsRef.current.filter((i) => i.id !== item.id));
  }

  // Save / Not now buttons, for when the user would rather tap than say "haan"
  async function answerByTap(yes: boolean) {
    if (!pending) return;
    if (phase === "recording") await stop(false);
    stopSpeaking();
    if (yes) await save(pending.action, pending.said);
    setAnswer((prev) => prev?.action ? {
      ...prev,
      action: { ...prev.action, intent: yes ? "confirm" : "cancel", reply: yes ? "Done, saved it." : "Okay, not saved." },
    } : prev);
    setPending(null);
    setPhase("done");
  }

  function setError(message: string) {
    setErrorMessage(message);
    setPhase("error");
  }

  async function start() {
    const { granted, canAskAgain } = await AudioModule.requestRecordingPermissionsAsync();
    if (!granted) {
      setNeedsSettings(!canAskAgain);
      return setError("Mic permission is needed. Allow it in Settings.");
    }
    setNeedsSettings(false);

    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      stopping.current = false;
      heardVoice.current = false;
      lastLoud.current = 0;
      recorder.record();
      setPhase("recording");
    } catch (err) {
      console.warn("[voice] could not start recording:", err);
      setError("Couldn't start recording. Try again.");
    }
  }

  async function stop(send = true) {
    if (stopping.current) return;
    stopping.current = true;
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false });
    if (!send) return setPhase(answer ? "done" : "idle");

    const uri = recorder.uri;
    if (!uri) return setError("Recording wasn't saved. Try again.");
    setLastUri(uri);
    sendVoice(uri);
  }

  // Hands-free: stop by itself when the user goes quiet after talking
  useEffect(() => {
    if (phase !== "recording") return;
    const t = recState.durationMillis; // the recorder's own clock
    if ((recState.metering ?? -160) > SPEECH_DB) { heardVoice.current = true; lastLoud.current = t; }
    if (heardVoice.current && t - lastLoud.current > SILENCE_MS) stop();
    else if (!heardVoice.current && t > NO_SPEECH_MS) stop(false);
    // Re-runs every 100 ms while recording, so the stop() it calls is always fresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recState.metering, recState.durationMillis, phase]);

  async function sendVoice(uri: string) {
    setPhase("working");
    try {
      const result = await askAssistant(uri, { context, pending: pending?.action, items: summarize(itemsRef.current) });
      setAnswer(result);
      const a = result.action;
      let listenAgain = false;
      if (a) {
        // Still missing something? Remember everything said so far.
        setContext(a.needsClarification ? [context, result.text].filter(Boolean).join(" ") : undefined);

        if (a.intent === "confirm" && pending) await save(pending.action, pending.said); // "haan" → save
        if (a.intent === "confirm" || a.intent === "cancel") setPending(null);

        // complete reminder / task / note → wait for "haan"; missing detail → wait for the answer
        const waitsForYes = isSavable(a) && !a.needsClarification;
        // the first sentence, in the user's own words, is what the notification quotes
        if (waitsForYes) setPending({ action: a, said: pending?.said ?? context ?? result.text });
        listenAgain = a.needsClarification || waitsForYes;
      }

      // speak the reply · asked something? → open the mic again when it finishes
      setPhase("speaking");
      await playReply(result.audio, () => (listenAgain ? start() : setPhase("done")));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  // Mic button: start · stop · or interrupt the assistant while it talks
  function onMic() {
    if (phase === "recording") return stop();
    if (phase === "speaking") stopSpeaking(); // beech mein roko
    start();
  }

  function retry() {
    if (needsSettings) Linking.openSettings();
    else if (lastUri) sendVoice(lastUri);
    else start();
  }

  const hint = {
    idle: "Tap and speak: a reminder, task, note or question",
    recording: "Speak… I'll stop when you go quiet",
    working: "Sending to the server…",
    speaking: "Tap to stop",
    done: pending ? "Tap to say yes / no" : context ? "Tap to answer" : "Tap to record again",
    error: "Tap the mic to record again",
  }[phase];

  return (
    <View style={styles.screen}>
      <View pointerEvents="none" style={styles.glow} />

      <SafeAreaView edges={["top"]} style={styles.header}>
        <View style={styles.headerLogoDisc}>
          <Image source={logo} style={styles.headerLogo} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.brand}>Harihar Code Studio</Text>
          <View style={styles.statusRow}>
            <View
              style={[styles.statusDot, phase === "recording" && styles.statusDotLive]}
            />
            <Text style={styles.status}>Voice Assistant</Text>
          </View>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>EXP 06 · P4</Text>
        </View>
      </SafeAreaView>

      <View style={styles.body}>
        {phase === "idle" && (
          <Animated.View entering={FadeIn} style={styles.center}>
            <Text style={styles.title}>Speak, I’ll remember.</Text>
            <Text style={styles.subtitle}>
              English, Hindi or Hinglish. Like: “Call the client tomorrow at 9 AM.”
            </Text>
            <Upcoming items={items} onDone={onItemDone} />
          </Animated.View>
        )}

        {phase === "recording" && (
          <Animated.View entering={FadeIn} style={styles.center}>
            {context && answer?.action?.question && (
              <Text style={styles.asked}>🤖 {answer.action.question}</Text>
            )}
            {!context && pending && <Text style={styles.asked}>🤖 {pending.action.reply}</Text>}
            <Text style={styles.timer}>{formatTime(recState.durationMillis)}</Text>
            <View style={styles.liveRow}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Listening</Text>
            </View>
          </Animated.View>
        )}

        {phase === "working" && (
          <Animated.View entering={FadeIn} style={styles.center}>
            <Text style={styles.title}>Working…</Text>
            <Text style={styles.subtitle}>Got it, now understanding.</Text>
          </Animated.View>
        )}

        {(phase === "speaking" || phase === "done") && answer && (
          <ScrollView contentContainerStyle={styles.results} showsVerticalScrollIndicator={false}>
            <TranscriptCard text={answer.text} />
            {answer.action && (
              <ActionCard
                action={answer.action}
                onSave={pending?.action === answer.action ? () => answerByTap(true) : undefined}
                onCancel={() => answerByTap(false)}
              />
            )}

            {phase === "speaking" && (
              <View style={styles.speaking}>
                <Bars />
                <Text style={styles.aiLabel}>🔊 AI VOICE</Text>
              </View>
            )}

            <Upcoming items={items} onDone={onItemDone} />
          </ScrollView>
        )}

        {phase === "error" && (
          <ErrorCard
            message={error}
            actionLabel={needsSettings ? "Open Settings" : "Try again"}
            onAction={retry}
          />
        )}
      </View>

      <SafeAreaView edges={["bottom"]} style={styles.footer}>
        <MicButton
          recording={phase === "recording"}
          uploading={phase === "working"}
          speaking={phase === "speaking"}
          onPress={onMic}
        />
        <Text style={styles.hint}>{hint}</Text>
      </SafeAreaView>
    </View>
  );
}

// Simple "speaking" waves while the assistant's voice plays.
function Bars() {
  return (
    <View style={styles.bars}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Bar key={i} index={i} />
      ))}
    </View>
  );
}

function Bar({ index }: { index: number }) {
  const level = useSharedValue(0.3);

  useEffect(() => {
    level.value = withRepeat(
      withTiming(1, { duration: 260 + index * 60, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    return () => cancelAnimation(level);
  }, [index, level]);

  const style = useAnimatedStyle(() => ({ transform: [{ scaleY: level.value }] }));
  return <Animated.View style={[styles.bar, style]} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Brand.bg,
  },
  glow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 420,
    experimental_backgroundImage: Gradients.glow,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Brand.border,
  },
  headerLogoDisc: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Brand.cream,
    overflow: "hidden",
    boxShadow: "0 0 0 2px rgba(34, 192, 143, 0.35)",
  },
  headerLogo: {
    width: 42,
    height: 42,
  },
  headerText: {
    flex: 1,
  },
  brand: {
    color: Brand.text,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Brand.green,
    boxShadow: "0 0 6px rgba(34, 192, 143, 0.9)",
  },
  statusDotLive: {
    backgroundColor: Brand.red,
    boxShadow: "0 0 6px rgba(255, 77, 94, 0.9)",
  },
  status: {
    color: Brand.textMuted,
    fontSize: 13,
  },
  badge: {
    borderWidth: 1,
    borderColor: "rgba(255, 138, 31, 0.45)",
    backgroundColor: Brand.orangeSoft,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  badgeText: {
    color: Brand.orange,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  body: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  center: {
    alignItems: "center",
    gap: 12,
  },
  results: {
    flexGrow: 1,
    justifyContent: "center",
    gap: 14,
    paddingVertical: 16,
  },
  title: {
    color: Brand.text,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.4,
    textAlign: "center",
  },
  subtitle: {
    color: Brand.textMuted,
    fontSize: 16,
    lineHeight: 23,
    textAlign: "center",
    maxWidth: 320,
  },
  timer: {
    color: Brand.text,
    fontSize: 64,
    fontWeight: "200",
    fontVariant: ["tabular-nums"],
  },
  liveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  liveDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: Brand.red,
  },
  liveText: {
    color: Brand.red,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  footer: {
    alignItems: "center",
    paddingBottom: 16,
  },
  hint: {
    color: Brand.textMuted,
    fontSize: 14,
    marginTop: -6,
  },
  // Part 3
  asked: {
    color: "#F59E0B",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  speaking: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  bars: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 44,
  },
  bar: {
    width: 7,
    height: 40,
    borderRadius: 4,
    backgroundColor: Brand.green,
  },
  aiLabel: {
    color: Brand.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    borderColor: Brand.borderStrong,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
});
