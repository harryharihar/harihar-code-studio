import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Brand } from "@/constants/brand";

export function TranscriptCard({ text }: { text: string }) {
  return (
    <Animated.View entering={FadeInDown.duration(260)} style={[styles.card, styles.transcript]}>
      <View style={styles.labelRow}>
        <Ionicons name="mic" size={14} color={Brand.green} />
        <Text style={[styles.label, { color: Brand.green }]}>Aapne bola</Text>
      </View>
      <Text style={styles.transcriptText} selectable>
        {text || "(Kuch sunai nahi diya. Phir se try karo.)"}
      </Text>
    </Animated.View>
  );
}

type ErrorProps = {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function ErrorCard({ message, actionLabel, onAction }: ErrorProps) {
  return (
    <Animated.View entering={FadeInDown.duration(260)} style={[styles.card, styles.error]}>
      <View style={styles.labelRow}>
        <Ionicons name="warning" size={14} color={Brand.danger} />
        <Text style={[styles.label, { color: Brand.danger }]}>Error</Text>
      </View>
      <Text style={styles.errorText}>{message}</Text>

      {actionLabel && onAction && (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [styles.action, pressed && { opacity: 0.6 }]}
        >
          <Ionicons name="refresh" size={15} color={Brand.text} />
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    gap: 10,
  },
  transcript: {
    backgroundColor: Brand.surface,
    borderColor: "rgba(34, 192, 143, 0.4)",
    boxShadow: "0 0 24px rgba(34, 192, 143, 0.12)",
  },
  error: {
    backgroundColor: Brand.dangerSoft,
    borderColor: Brand.dangerBorder,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  transcriptText: {
    color: Brand.text,
    fontSize: 22,
    lineHeight: 31,
    fontWeight: "600",
  },
  errorText: {
    color: Brand.textSoft,
    fontSize: 16,
    lineHeight: 23,
  },
  action: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    backgroundColor: Brand.surfaceRaised,
    borderWidth: 1,
    borderColor: Brand.borderStrong,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  actionText: {
    color: Brand.text,
    fontSize: 14,
    fontWeight: "700",
  },
});
