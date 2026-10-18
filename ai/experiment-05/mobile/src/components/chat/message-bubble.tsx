import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

import { TypingIndicator } from "@/components/chat/typing-indicator";
import { Brand, Gradients } from "@/constants/brand";

export type ChatMessage =
  | {
      id: string;
      role: "user";
      text: string;
      imageUri?: string;
    }
  | {
      id: string;
      role: "assistant";
      status: "pending" | "done" | "error";
      text: string;
      withImage: boolean;
      notice?: string;
    };

const logo = require("@/assets/images/hcs-logo.png");

export function AssistantAvatar() {
  return (
    <View style={styles.avatar}>
      <Image source={logo} style={styles.avatarImage} />
    </View>
  );
}

export function MessageBubble({
  message,
  onRetry,
}: {
  message: ChatMessage;
  onRetry?: () => void;
}) {
  if (message.role === "user") {
    return (
      <Animated.View entering={FadeInUp.springify().damping(18)} style={styles.userRow}>
        {message.imageUri && (
          <Image
            source={{ uri: message.imageUri }}
            style={styles.userImage}
            contentFit="cover"
          />
        )}
        {Boolean(message.text) && (
          <View style={styles.userBubble}>
            <Text style={styles.userText} selectable>
              {message.text}
            </Text>
          </View>
        )}
      </Animated.View>
    );
  }

  const isError = message.status === "error";

  return (
    <Animated.View entering={FadeInDown.duration(300)} style={styles.aiRow}>
      <AssistantAvatar />

      <View style={styles.aiColumn}>
        <Text style={styles.aiName}>HCS Assistant</Text>

        <View style={[styles.aiBubble, isError && styles.errorBubble]}>
          {message.status === "pending" ? (
            <TypingIndicator withImage={message.withImage} />
          ) : isError ? (
            <View style={styles.errorContent}>
              <View style={styles.errorHeader}>
                <Ionicons name="alert-circle" size={18} color={Brand.danger} />
                <Text style={styles.errorText}>{message.text}</Text>
              </View>
              {onRetry && (
                <Pressable
                  onPress={onRetry}
                  style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
                  hitSlop={6}
                >
                  <Ionicons name="refresh" size={14} color={Brand.text} />
                  <Text style={styles.retryText}>Try again</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <Text style={styles.aiText} selectable>
              {message.text}
            </Text>
          )}
        </View>

        {message.notice && <Text style={styles.notice}>{message.notice}</Text>}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  userRow: {
    alignItems: "flex-end",
    gap: 6,
    marginBottom: 20,
  },
  userImage: {
    width: 220,
    height: 220,
    borderRadius: 22,
    borderBottomRightRadius: 8,
    borderWidth: 1,
    borderColor: Brand.borderStrong,
  },
  userBubble: {
    maxWidth: "82%",
    borderRadius: 22,
    borderBottomRightRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 11,
    experimental_backgroundImage: Gradients.green,
    boxShadow: "0 8px 22px rgba(34, 192, 143, 0.28)",
  },
  userText: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500",
  },
  aiRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 22,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Brand.cream,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    boxShadow: "0 0 0 2px rgba(34, 192, 143, 0.35)",
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  aiColumn: {
    flex: 1,
  },
  aiName: {
    color: Brand.textMuted,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  aiBubble: {
    alignSelf: "flex-start",
    maxWidth: "100%",
    backgroundColor: Brand.surface,
    borderRadius: 22,
    borderTopLeftRadius: 8,
    borderWidth: 1,
    borderColor: Brand.border,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  aiText: {
    color: Brand.textSoft,
    fontSize: 15,
    lineHeight: 23,
  },
  errorBubble: {
    alignSelf: "stretch",
    backgroundColor: Brand.dangerSoft,
    borderColor: Brand.dangerBorder,
  },
  errorContent: {
    gap: 12,
  },
  errorHeader: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  errorText: {
    flex: 1,
    color: Brand.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  retry: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Brand.surfaceRaised,
    borderWidth: 1,
    borderColor: Brand.borderStrong,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  retryText: {
    color: Brand.text,
    fontSize: 13,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.6,
  },
  notice: {
    color: Brand.textFaint,
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
});
