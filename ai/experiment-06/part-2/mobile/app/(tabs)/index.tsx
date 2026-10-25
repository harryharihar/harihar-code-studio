import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { Image } from "expo-image";
import { useState } from "react";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { askAssistant, type AssistantResult } from "@/api/voice";
import { ActionCard } from "@/components/ActionCard";
import { MicButton } from "@/components/voice/mic-button";
import { ErrorCard, TranscriptCard } from "@/components/voice/result-card";
import { Brand, Gradients } from "@/constants/brand";

const logo = require("@/assets/images/hcs-logo.png");

// The screen is always in exactly one of these five states.
type Phase = "idle" | "recording" | "working" | "done" | "error";

function formatTime(ms: number) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function VoiceScreen() {
  // HIGH_QUALITY records AAC in an .m4a file, which OpenAI reads directly.
  // Mono instead of the preset's stereo: speech needs one channel, and Mac
  // mics (which the iOS Simulator uses) are mono.
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, numberOfChannels: 1 });
  const recorderState = useAudioRecorderState(recorder, 250);

  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<AssistantResult | null>(null);
  // When the AI asks a follow-up question, the sentence that led to it is
  // kept here and sent along with the user's spoken answer.
  const [context, setContext] = useState<string | undefined>();
  const [error, setErrorMessage] = useState("");
  // Kept so "Try again" can re-send the same recording after a failed upload.
  const [lastUri, setLastUri] = useState<string | null>(null);
  const [needsSettings, setNeedsSettings] = useState(false);

  function setError(message: string) {
    setErrorMessage(message);
    setPhase("error");
  }

  async function start() {
    const { granted, canAskAgain } = await AudioModule.requestRecordingPermissionsAsync();
    if (!granted) {
      setNeedsSettings(!canAskAgain);
      return setError("Mic permission chahiye. Settings mein allow karo.");
    }
    setNeedsSettings(false);

    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setPhase("recording");
    } catch (err) {
      console.warn("[voice] could not start recording:", err);
      setError("Recording start nahi ho payi. Phir se try karo.");
    }
  }

  async function stop() {
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false });

    const uri = recorder.uri;
    if (!uri) return setError("Recording save nahi hui. Phir se try karo.");
    setLastUri(uri);
    ask(uri);
  }

  async function ask(uri: string) {
    setPhase("working");
    try {
      const res = await askAssistant(uri, context);
      setResult(res);
      // Still missing something? Remember everything said so far.
      setContext(
        res.action?.needsClarification ? [context, res.text].filter(Boolean).join(" ") : undefined,
      );
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  function onMicPress() {
    if (phase === "recording") stop();
    else start();
  }

  function retry() {
    if (needsSettings) Linking.openSettings();
    else if (lastUri) ask(lastUri);
    else start();
  }

  const hint = {
    idle: "Mic tap karo aur bolo",
    recording: "Bol rahe ho… stop ke liye tap karo",
    working: "Server par bhej rahe hain…",
    done: context ? "Mic tap karke jawab do" : "Naya record karne ke liye tap karo",
    error: "Mic tap karke naya record karo",
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
            <Text style={styles.status}>Voice Assistant · AI Assistant</Text>
          </View>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>EXP 06</Text>
        </View>
      </SafeAreaView>

      <View style={styles.body}>
        {phase === "idle" && (
          <Animated.View entering={FadeIn} style={styles.center}>
            <Text style={styles.title}>Bolo, main samjhunga.</Text>
            <Text style={styles.subtitle}>
              English, Hindi ya Hinglish. Jaise: “Kal subah 9 baje client ko call karna hai.”
            </Text>
          </Animated.View>
        )}

        {phase === "recording" && (
          <Animated.View entering={FadeIn} style={styles.center}>
            <Text style={styles.timer}>{formatTime(recorderState.durationMillis)}</Text>
            <View style={styles.liveRow}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Recording</Text>
            </View>
          </Animated.View>
        )}

        {phase === "working" && (
          <Animated.View entering={FadeIn} style={styles.center}>
            <Text style={styles.title}>Working…</Text>
            <Text style={styles.subtitle}>Sun liya, ab samajh raha hoon.</Text>
          </Animated.View>
        )}

        {phase === "done" && result && (
          <ScrollView contentContainerStyle={styles.results} showsVerticalScrollIndicator={false}>
            <TranscriptCard text={result.text} />
            {result.action && <ActionCard action={result.action} />}
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
          onPress={onMicPress}
        />
        <Text style={styles.hint}>{hint}</Text>
      </SafeAreaView>
    </View>
  );
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
});
