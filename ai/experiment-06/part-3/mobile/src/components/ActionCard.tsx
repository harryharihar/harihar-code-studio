import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import type { Action } from "@/types";
import { Brand } from "@/constants/brand";
import { whenLabel } from "@/utils/when";

// Each intent gets its own colour and icon.
const META = {
  reminder: { icon: "⏰", label: "REMINDER", color: "#F59E0B" },
  task:     { icon: "✅", label: "TASK",     color: "#22C55E" },
  note:     { icon: "📝", label: "NOTE",     color: "#60A5FA" },
  question: { icon: "❓", label: "QUESTION", color: "#A78BFA" },
  other:    { icon: "💬", label: "OTHER",    color: Brand.textMuted },
};

const AMBER = "#F59E0B";

// Shows what the AI understood. When the AI needs to ask something, the
// whole card turns amber so the user knows an answer is expected.
export function ActionCard({ action }: { action: Action }) {
  const meta = META[action.intent];
  const asking = action.needsClarification;
  const accent = asking ? AMBER : meta.color;
  const when = whenLabel(action.date, action.time);

  return (
    <Animated.View
      entering={FadeInDown.duration(260).delay(80)}
      style={[
        styles.card,
        { borderColor: accent, boxShadow: `0 0 24px ${accent}26` },
        asking && styles.cardAsking,
      ]}
    >
      <View style={[styles.pill, { backgroundColor: meta.color }]}>
        <Text style={styles.pillText}>
          {meta.icon} {meta.label}
        </Text>
      </View>

      {!!action.title && <Text style={styles.title}>{action.title}</Text>}

      {(when || action.people.length > 0 || action.priority === "high") && (
        <View style={styles.chips}>
          {when && <Chip text={`📅 ${when}`} />}
          {action.people.map((person) => (
            <Chip key={person} text={`👤 ${person}`} />
          ))}
          {action.priority === "high" && <Chip text="🔥 Urgent" color={Brand.red} />}
        </View>
      )}

      {asking ? (
        <View style={[styles.reply, styles.askBox]}>
          <Text style={[styles.replyLabel, { color: AMBER }]}>🤖 Assistant pooch raha hai</Text>
          <Text style={styles.question}>{action.question}</Text>
          <View style={styles.askHint}>
            <Ionicons name="mic" size={13} color={AMBER} />
            <Text style={styles.askHintText}>Mic dabake jawab do</Text>
          </View>
        </View>
      ) : (
        !!action.reply && (
          <View style={styles.reply}>
            <Text style={[styles.replyLabel, { color: Brand.green }]}>🤖 Assistant</Text>
            <Text style={styles.replyText}>{action.reply}</Text>
          </View>
        )
      )}
    </Animated.View>
  );
}

function Chip({ text, color }: { text: string; color?: string }) {
  return (
    <View style={[styles.chip, color && { borderColor: color }]}>
      <Text style={[styles.chipText, color && { color }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    backgroundColor: Brand.surface,
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 18,
    gap: 12,
  },
  cardAsking: {
    backgroundColor: "rgba(245, 158, 11, 0.08)",
  },
  pill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillText: {
    color: "#111",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
  title: {
    color: Brand.text,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    backgroundColor: Brand.surfaceRaised,
    borderWidth: 1,
    borderColor: Brand.borderStrong,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: {
    color: Brand.textSoft,
    fontSize: 14,
    fontWeight: "600",
  },
  reply: {
    backgroundColor: Brand.greenSoft,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  replyLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  replyText: {
    color: Brand.textSoft,
    fontSize: 16,
    lineHeight: 22,
  },
  askBox: {
    backgroundColor: "rgba(245, 158, 11, 0.14)",
    gap: 6,
  },
  question: {
    color: Brand.text,
    fontSize: 20,
    lineHeight: 27,
    fontWeight: "700",
  },
  askHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  askHintText: {
    color: AMBER,
    fontSize: 13,
    fontWeight: "600",
  },
});
