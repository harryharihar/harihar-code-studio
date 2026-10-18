import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeOutUp } from "react-native-reanimated";

import { Brand, Gradients } from "@/constants/brand";

const logo = require("@/assets/images/hcs-logo.png");

type IconName = keyof typeof Ionicons.glyphMap;

export type Capability = "receipt" | "photo" | "text";

const capabilities: { id: Capability; icon: IconName; title: string; tint: string; bg: string }[] = [
  { id: "receipt", icon: "receipt-outline", title: "Read receipts", tint: Brand.orange, bg: Brand.orangeSoft },
  { id: "photo", icon: "image-outline", title: "Describe photos", tint: Brand.green, bg: Brand.greenSoft },
  { id: "text", icon: "chatbubble-ellipses-outline", title: "Answer anything", tint: Brand.text, bg: Brand.surfaceRaised },
];

const textPrompts = [
  "Explain multimodal AI in simple words",
  "How does an AI model read text in a photo?",
  "What should I check before trusting AI-read amounts?",
];

const imagePrompts = [
  "What's the total amount on this receipt?",
  "Describe the main object in this image",
  "Extract the key details as a list",
];

export function EmptyState({
  hasAttachment,
  onPick,
  onCapability,
}: {
  hasAttachment: boolean;
  onPick: (prompt: string) => void;
  onCapability: (capability: Capability) => void;
}) {
  const prompts = hasAttachment ? imagePrompts : textPrompts;

  return (
    <Animated.View exiting={FadeOutUp.duration(220)} style={styles.container}>
      <Animated.View entering={FadeIn.duration(500)} style={styles.logoRing}>
        <View style={styles.logoInner}>
          <Image source={logo} style={styles.logo} />
        </View>
      </Animated.View>

      <Animated.Text entering={FadeInDown.delay(80).duration(400)} style={styles.eyebrow}>
        EXPERIMENT 05 · MULTIMODAL AI
      </Animated.Text>
      <Animated.Text entering={FadeInDown.delay(140).duration(400)} style={styles.title}>
        Show it. Ask it.{"\n"}
        <Text style={styles.titleAccent}>Understand it.</Text>
      </Animated.Text>
      <Animated.Text entering={FadeInDown.delay(200).duration(400)} style={styles.subtitle}>
        Ask a question, or attach a photo of a receipt, document or object and ask about what&apos;s in it.
      </Animated.Text>

      <Animated.View entering={FadeInDown.delay(260).duration(400)} style={styles.capabilities}>
        {capabilities.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => onCapability(item.id)}
            style={({ pressed }) => [styles.capability, pressed && styles.capabilityPressed]}
            accessibilityRole="button"
            accessibilityLabel={item.title}
          >
            <View style={[styles.capabilityIcon, { backgroundColor: item.bg }]}>
              <Ionicons name={item.icon} size={19} color={item.tint} />
            </View>
            <Text style={styles.capabilityText}>{item.title}</Text>
          </Pressable>
        ))}
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(320).duration(400)} style={styles.prompts}>
        <Text style={styles.promptsLabel}>
          {hasAttachment ? "ASK ABOUT YOUR IMAGE" : "TRY ASKING"}
        </Text>
        {prompts.map((prompt) => (
          <Pressable
            key={prompt}
            onPress={() => onPick(prompt)}
            style={({ pressed }) => [styles.prompt, pressed && styles.promptPressed]}
          >
            <Text style={styles.promptText}>{prompt}</Text>
            <View style={styles.promptArrow}>
              <Ionicons name="arrow-forward" size={14} color={Brand.green} />
            </View>
          </Pressable>
        ))}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 8,
  },
  logoRing: {
    width: 108,
    height: 108,
    borderRadius: 54,
    padding: 3,
    experimental_backgroundImage: Gradients.ring,
    boxShadow: "0 0 40px rgba(34, 192, 143, 0.35)",
  },
  logoInner: {
    flex: 1,
    borderRadius: 52,
    backgroundColor: Brand.cream,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logo: {
    width: 102,
    height: 102,
  },
  eyebrow: {
    marginTop: 24,
    color: Brand.green,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
  },
  title: {
    marginTop: 10,
    color: Brand.text,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.8,
  },
  titleAccent: {
    color: Brand.orange,
  },
  subtitle: {
    marginTop: 12,
    color: Brand.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    paddingHorizontal: 12,
  },
  capabilities: {
    flexDirection: "row",
    gap: 10,
    marginTop: 26,
    alignSelf: "stretch",
  },
  capability: {
    flex: 1,
    alignItems: "center",
    gap: 9,
    backgroundColor: Brand.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Brand.border,
    paddingVertical: 15,
    paddingHorizontal: 6,
  },
  capabilityPressed: {
    transform: [{ scale: 0.96 }],
    borderColor: Brand.green,
  },
  capabilityIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  capabilityText: {
    color: Brand.textSoft,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  prompts: {
    alignSelf: "stretch",
    marginTop: 26,
    gap: 8,
  },
  promptsLabel: {
    color: Brand.textFaint,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.6,
    marginBottom: 2,
    marginLeft: 4,
  },
  prompt: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    backgroundColor: Brand.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Brand.border,
    paddingLeft: 16,
    paddingRight: 12,
    paddingVertical: 13,
  },
  promptPressed: {
    backgroundColor: Brand.surfaceRaised,
    borderColor: Brand.green,
  },
  promptText: {
    flex: 1,
    color: Brand.textSoft,
    fontSize: 14,
    fontWeight: "600",
  },
  promptArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Brand.greenSoft,
    alignItems: "center",
    justifyContent: "center",
  },
});
