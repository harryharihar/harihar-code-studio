import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeOut } from "react-native-reanimated";

import { AssistantAvatar } from "@/components/chat/message-bubble";
import { Brand } from "@/constants/brand";

const quickPrompts = [
  "What can you do?",
  "Explain multimodal AI",
  "How do I attach an image?",
];

// Shown when the user taps into the composer before sending anything:
// the welcome screen slides away and the chat opens with a greeting.
export function ChatIntro({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <Animated.View entering={FadeIn.delay(120).duration(300)} exiting={FadeOut.duration(150)}>
      <Animated.View entering={FadeInDown.delay(180).duration(380)} style={styles.row}>
        <AssistantAvatar />
        <View style={styles.column}>
          <Text style={styles.name}>HCS Assistant</Text>
          <View style={styles.bubble}>
            <Text style={styles.hello}>Hi, I&apos;m HCS Assistant 👋</Text>
            <Text style={styles.text}>
              Ask me anything. To ask about a receipt, document or photo, tap{" "}
              <Text style={styles.plus}>+</Text> to attach it first.
            </Text>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(320).duration(380)} style={styles.chips}>
        {quickPrompts.map((prompt) => (
          <Pressable
            key={prompt}
            onPress={() => onPick(prompt)}
            style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
          >
            <Text style={styles.chipText}>{prompt}</Text>
          </Pressable>
        ))}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  column: {
    flex: 1,
  },
  name: {
    color: Brand.textMuted,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  bubble: {
    alignSelf: "flex-start",
    backgroundColor: Brand.surface,
    borderRadius: 22,
    borderTopLeftRadius: 8,
    borderWidth: 1,
    borderColor: Brand.border,
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 6,
  },
  hello: {
    color: Brand.text,
    fontSize: 16,
    fontWeight: "700",
  },
  text: {
    color: Brand.textSoft,
    fontSize: 15,
    lineHeight: 22,
  },
  plus: {
    color: Brand.orange,
    fontWeight: "800",
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
    marginLeft: 42,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Brand.borderStrong,
    backgroundColor: Brand.surfaceRaised,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  chipPressed: {
    borderColor: Brand.green,
    backgroundColor: Brand.greenSoft,
  },
  chipText: {
    color: Brand.textSoft,
    fontSize: 13,
    fontWeight: "600",
  },
});
