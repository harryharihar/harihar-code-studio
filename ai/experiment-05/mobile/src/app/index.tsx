import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRef, useState } from "react";
import {
  ActionSheetIOS,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  type TextInputInstance,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { ask, type Attachment } from "@/api/assistant";
import { Composer } from "@/components/chat/composer";
import { ChatIntro } from "@/components/chat/chat-intro";
import { EmptyState, type Capability } from "@/components/chat/empty-state";
import { MessageBubble, type ChatMessage } from "@/components/chat/message-bubble";
import { Brand, Gradients, MAX_IMAGE_BYTES, SUPPORTED_IMAGE_TYPES } from "@/constants/brand";

const logo = require("@/assets/images/hcs-logo.png");

type Payload = { question: string; image?: Attachment };

let nextId = 0;
const newId = () => String(++nextId);

function guessMimeType(asset: ImagePicker.ImagePickerAsset) {
  if (asset.mimeType) return asset.mimeType.toLowerCase();
  const ext = asset.uri.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "heic" || ext === "heif") return "image/heic";
  return "image/jpeg";
}

function toAttachment(asset: ImagePicker.ImagePickerAsset): Attachment | null {
  const mimeType = guessMimeType(asset);

  if (!SUPPORTED_IMAGE_TYPES.includes(mimeType)) {
    Alert.alert(
      "Unsupported image",
      "Please choose a JPEG, PNG, or WEBP image. HEIC photos aren't supported.",
    );
    return null;
  }

  if (asset.fileSize && asset.fileSize > MAX_IMAGE_BYTES) {
    const mb = (asset.fileSize / 1024 / 1024).toFixed(1);
    Alert.alert("Image too large", `This image is ${mb} MB. Please choose one under 8 MB.`);
    return null;
  }

  const extension = mimeType.split("/")[1] === "jpeg" ? "jpg" : mimeType.split("/")[1];
  return {
    uri: asset.uri,
    mimeType,
    fileName: asset.fileName || `upload.${extension}`,
  };
}

export default function AssistantScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const inputRef = useRef<TextInputInstance>(null);
  const payloads = useRef(new Map<string, Payload>());

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState<string>();
  // True once the user taps into the composer (or attaches, or picks a tile):
  // the welcome screen animates away and the chat view takes its place.
  const [engaged, setEngaged] = useState(false);

  function updateAssistant(id: string, patch: Partial<Extract<ChatMessage, { role: "assistant" }>>) {
    setMessages((current) =>
      current.map((m) => (m.id === id && m.role === "assistant" ? { ...m, ...patch } : m)),
    );
  }

  async function run(assistantId: string, payload: Payload) {
    setBusy(true);
    try {
      const result = await ask({
        question: payload.question,
        image: payload.image,
        previousResponseId: conversationId,
      });

      updateAssistant(assistantId, {
        status: "done",
        text: result.answer,
        notice: result.contextReset
          ? "Earlier messages expired, so this answer started a fresh conversation."
          : undefined,
      });
      if (result.responseId) setConversationId(result.responseId);
      payloads.current.delete(assistantId);
    } catch (err) {
      updateAssistant(assistantId, {
        status: "error",
        text: err instanceof Error ? err.message : "Something went wrong.",
      });
    } finally {
      setBusy(false);
    }
  }

  function send(text = input) {
    const question = text.trim();
    if (busy || (!question && !attachment)) return;

    const payload: Payload = { question, image: attachment ?? undefined };
    const assistantId = newId();
    payloads.current.set(assistantId, payload);

    setMessages((current) => [
      ...current,
      { id: newId(), role: "user", text: question, imageUri: attachment?.uri },
      { id: assistantId, role: "assistant", status: "pending", text: "", withImage: Boolean(attachment) },
    ]);
    setEngaged(true);
    setInput("");
    // iOS autocorrect can re-insert the last word after a controlled clear;
    // clearing the native input too prevents that.
    inputRef.current?.clear();
    setAttachment(null);
    run(assistantId, payload);
  }

  function retry(assistantId: string) {
    const payload = payloads.current.get(assistantId);
    if (!payload || busy) return;
    updateAssistant(assistantId, { status: "pending", text: "" });
    run(assistantId, payload);
  }

  function newChat() {
    if (busy) return;
    Keyboard.dismiss();
    setEngaged(false);
    setMessages([]);
    setConversationId(undefined);
    setAttachment(null);
    setInput("");
    payloads.current.clear();
  }

  async function pickFromLibrary() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const next = toAttachment(result.assets[0]);
    if (next) setAttachment(next);
  }

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Camera access needed",
        "Allow camera access to photograph a receipt or document.",
        permission.canAskAgain
          ? [{ text: "OK" }]
          : [
              { text: "Cancel", style: "cancel" },
              { text: "Open Settings", onPress: () => Linking.openSettings() },
            ],
      );
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
      if (result.canceled || !result.assets[0]) return;
      const next = toAttachment(result.assets[0]);
      if (next) setAttachment(next);
    } catch {
      Alert.alert(
        "Camera unavailable",
        "This device has no camera available. The iOS Simulator can't take photos, so choose an image from the library instead.",
      );
    }
  }

  function openAttachMenu() {
    setEngaged(true);
    const options = ["Choose from library", "Take a photo"];

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: [...options, "Cancel"], cancelButtonIndex: 2, title: "Add an image" },
        (index) => {
          if (index === 0) pickFromLibrary();
          if (index === 1) takePhoto();
        },
      );
      return;
    }

    Alert.alert("Add an image", undefined, [
      { text: options[0], onPress: pickFromLibrary },
      { text: options[1], onPress: takePhoto },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  // The three tiles on the welcome screen: the image ones pre-fill a
  // question and open the image menu; "Answer anything" focuses the input.
  function handleCapability(capability: Capability) {
    setEngaged(true);
    if (capability === "text") {
      inputRef.current?.focus();
      return;
    }

    setInput(
      capability === "receipt"
        ? "What's the total amount on this receipt?"
        : "Describe this image",
    );
    if (!attachment) openAttachMenu();
  }

  const lastMessage = messages[messages.length - 1];
  const chatOpen = engaged || messages.length > 0;

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
            <View style={styles.statusDot} />
            <Text style={styles.status}>
              {busy ? "Thinking…" : "Visual AI Assistant"}
            </Text>
          </View>
        </View>

        {messages.length > 0 ? (
          <Animated.View key="new" entering={FadeIn} exiting={FadeOut}>
            <Pressable
              onPress={newChat}
              disabled={busy}
              style={({ pressed }) => [styles.headerButton, (pressed || busy) && styles.dim]}
              accessibilityLabel="Start a new chat"
            >
              <Ionicons name="create-outline" size={16} color={Brand.text} />
              <Text style={styles.headerButtonText}>New</Text>
            </Pressable>
          </Animated.View>
        ) : chatOpen ? (
          <Animated.View key="close" entering={FadeIn} exiting={FadeOut}>
            <Pressable
              onPress={newChat}
              style={({ pressed }) => [styles.closeButton, pressed && styles.dim]}
              accessibilityLabel="Back to the welcome screen"
              hitSlop={8}
            >
              <Ionicons name="close" size={18} color={Brand.text} />
            </Pressable>
          </Animated.View>
        ) : (
          <Animated.View key="badge" entering={FadeIn} exiting={FadeOut} style={styles.badge}>
            <Text style={styles.badgeText}>EXP 05</Text>
          </Animated.View>
        )}
      </SafeAreaView>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          onContentSizeChange={() => {
            if (messages.length > 0) scrollRef.current?.scrollToEnd({ animated: true });
          }}
        >
          {!chatOpen ? (
            <EmptyState
              hasAttachment={attachment !== null}
              onPick={(prompt) => send(prompt)}
              onCapability={handleCapability}
            />
          ) : messages.length === 0 ? (
            <ChatIntro onPick={(prompt) => send(prompt)} />
          ) : (
            messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onRetry={
                  message === lastMessage && message.role === "assistant" && message.status === "error"
                    ? () => retry(message.id)
                    : undefined
                }
              />
            ))
          )}
        </ScrollView>

        <View style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
          <Composer
            value={input}
            onChangeText={setInput}
            attachment={attachment}
            onAttach={openAttachMenu}
            onRemoveAttachment={() => setAttachment(null)}
            onSend={() => send()}
            onFocus={() => setEngaged(true)}
            busy={busy}
            inputRef={inputRef}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Brand.bg,
  },
  flex: {
    flex: 1,
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
  headerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Brand.surfaceRaised,
    borderWidth: 1,
    borderColor: Brand.borderStrong,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  headerButtonText: {
    color: Brand.text,
    fontSize: 13,
    fontWeight: "700",
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Brand.surfaceRaised,
    borderWidth: 1,
    borderColor: Brand.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  dim: {
    opacity: 0.5,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 12,
  },
});
