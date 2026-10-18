import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import type { Ref } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputInstance } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import type { Attachment } from "@/api/assistant";
import { Brand, Gradients, MAX_QUESTION_CHARS } from "@/constants/brand";

export function Composer({
  value,
  onChangeText,
  attachment,
  onAttach,
  onRemoveAttachment,
  onSend,
  onFocus,
  busy,
  inputRef,
}: {
  value: string;
  onChangeText: (text: string) => void;
  attachment: Attachment | null;
  onAttach: () => void;
  onRemoveAttachment: () => void;
  onSend: () => void;
  onFocus?: () => void;
  busy: boolean;
  inputRef?: Ref<TextInputInstance>;
}) {
  const canSend = !busy && (value.trim().length > 0 || attachment !== null);
  const nearLimit = value.length > MAX_QUESTION_CHARS * 0.8;

  return (
    <View style={styles.wrapper}>
      <View style={styles.card}>
        {attachment && (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.attachment}>
            <Image source={{ uri: attachment.uri }} style={styles.thumb} contentFit="cover" />
            <View style={styles.attachmentInfo}>
              <Text style={styles.attachmentTitle}>Image attached</Text>
              <Text style={styles.attachmentHint} numberOfLines={1}>
                Ask anything about it, or just send
              </Text>
            </View>
            <Pressable
              onPress={onRemoveAttachment}
              hitSlop={10}
              style={styles.removeButton}
              accessibilityLabel="Remove image"
              disabled={busy}
            >
              <Ionicons name="close" size={15} color={Brand.text} />
            </Pressable>
          </Animated.View>
        )}

        <View style={styles.row}>
          <Pressable
            onPress={onAttach}
            disabled={busy}
            style={({ pressed }) => [
              styles.attachButton,
              attachment && styles.attachButtonActive,
              (pressed || busy) && styles.dim,
            ]}
            accessibilityLabel="Attach an image"
          >
            <Ionicons
              name={attachment ? "images" : "add"}
              size={attachment ? 18 : 24}
              color={attachment ? Brand.green : Brand.text}
            />
          </Pressable>

          <TextInput
            ref={inputRef}
            style={styles.input}
            value={value}
            onChangeText={onChangeText}
            onFocus={onFocus}
            placeholder={attachment ? "Ask about this image…" : "Ask anything, or attach an image"}
            placeholderTextColor={Brand.textFaint}
            selectionColor={Brand.green}
            keyboardAppearance="dark"
            multiline
            maxLength={MAX_QUESTION_CHARS}
            editable={!busy}
          />

          <Pressable
            onPress={onSend}
            disabled={!canSend}
            style={({ pressed }) => [
              styles.sendButton,
              canSend ? styles.sendActive : styles.sendDisabled,
              pressed && styles.dim,
            ]}
            accessibilityLabel="Send"
          >
            <Ionicons name="arrow-up" size={20} color={canSend ? "#FFFFFF" : Brand.textFaint} />
          </Pressable>
        </View>
      </View>

      <Text style={styles.footnote}>
        {nearLimit
          ? `${value.length} / ${MAX_QUESTION_CHARS} characters`
          : "AI can misread images. Verify important details."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  card: {
    backgroundColor: Brand.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: Brand.borderStrong,
    padding: 8,
    boxShadow: "0 -6px 30px rgba(0, 0, 0, 0.45)",
  },
  attachment: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Brand.surfaceRaised,
    borderRadius: 20,
    padding: 8,
    marginBottom: 8,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 14,
  },
  attachmentInfo: {
    flex: 1,
  },
  attachmentTitle: {
    color: Brand.text,
    fontSize: 14,
    fontWeight: "700",
  },
  attachmentHint: {
    color: Brand.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Brand.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  attachButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Brand.surfaceRaised,
    borderWidth: 1,
    borderColor: Brand.border,
    alignItems: "center",
    justifyContent: "center",
  },
  attachButtonActive: {
    backgroundColor: Brand.greenSoft,
    borderColor: "rgba(34, 192, 143, 0.4)",
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 130,
    color: Brand.text,
    fontSize: 15,
    lineHeight: 21,
    paddingTop: 11,
    paddingBottom: 10,
    paddingHorizontal: 4,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  sendActive: {
    experimental_backgroundImage: Gradients.orange,
    boxShadow: "0 6px 16px rgba(255, 138, 31, 0.4)",
  },
  sendDisabled: {
    backgroundColor: Brand.surfaceRaised,
  },
  dim: {
    opacity: 0.6,
  },
  footnote: {
    textAlign: "center",
    color: Brand.textFaint,
    fontSize: 11,
    marginTop: 8,
  },
});
