import { sendChatMessage } from "@/api/chat";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Markdown from "@ronradtke/react-native-markdown-display";



export default function HomeScreen() {
  const [prompt, setPrompt] = useState(
    "Where is my order 12345?",
  );
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAskAI() {
    if (!prompt.trim() || loading) {
      return;
    }

    try {
      setLoading(true);
      setResponse("");

      const result = await sendChatMessage(prompt.trim());

      setResponse(result);
    } catch (error) {
      console.error(error);

      setResponse(
        "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>
          AI Order Assistant
        </Text>

        <Text style={styles.subtitle}>
          Ask about your order
        </Text>

        <TextInput
          value={prompt}
          onChangeText={setPrompt}
          placeholder="Ask something about your order..."
          multiline
          style={styles.input}
        />

        <Pressable
          onPress={handleAskAI}
          disabled={loading}
          style={[
            styles.button,
            loading && styles.buttonDisabled,
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              Ask AI
            </Text>
          )}
        </Pressable>

        {response ? (
          <View style={styles.responseCard}>
            <Text style={styles.responseTitle}>
              AI Response
            </Text>

            <Markdown style={markdownStyles}>
              {response}
            </Markdown>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },

  content: {
    flex: 1,
    padding: 24,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    marginTop: 40,
  },

  subtitle: {
    fontSize: 16,
    color: "#666",
    marginTop: 8,
    marginBottom: 24,
  },

  input: {
    minHeight: 110,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "#ddd",
  },

  button: {
    marginTop: 16,
    backgroundColor: "#111",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  responseCard: {
    marginTop: 24,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#ddd",
  },

  responseTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },

  responseText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#333",
  },


});

const markdownStyles = {
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: "#333",
  },

  strong: {
    fontWeight: "700" as const,
  },
};