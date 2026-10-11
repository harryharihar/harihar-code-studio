import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { askRAG, Source } from "../api/rag";

const COLORS = {
  background: "#F4F7F5",
  surface: "#FFFFFF",
  border: "#DCE6E2",

  text: "#162033",
  textSecondary: "#64748B",
  textLight: "#8A97A8",

  primary: "#25BFA3",
  primaryDark: "#15977F",

  errorBackground: "#FFF0F0",
  errorBorder: "#FFD2D2",
  errorText: "#C24141",
};

function SourceCard({
  source,
  index,
}: {
  source: Source;
  index: number;
}) {
  const animation = useRef(
    new Animated.Value(0),
  ).current;

  useEffect(() => {
    Animated.timing(animation, {
      toValue: 1,
      duration: 400,
      delay: index * 100,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.sourceCard,
        { opacity: animation },
      ]}
    >
      <View style={styles.sourceHeader}>
        <Text style={styles.sourceId}>
          {source.id.toUpperCase()}
        </Text>

        <Text style={styles.sourceScore}>
          {Math.round(
            source.similarity * 100,
          )}
          % match
        </Text>
      </View>

      <Text style={styles.sourceContent}>
        {source.content}
      </Text>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const [question, setQuestion] = useState(
    "How long do I have to request a refund?",
  );

  const [answer, setAnswer] = useState("");

  const [sources, setSources] = useState<
    Source[]
  >([]);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const scrollViewRef =
    useRef<ScrollView>(null);

  const answerAnimation = useRef(
    new Animated.Value(0),
  ).current;

  async function handleAskAI() {
    if (!question.trim() || loading) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await askRAG(
        question.trim(),
      );

      LayoutAnimation.configureNext(
        LayoutAnimation.Presets.easeInEaseOut,
      );

      setAnswer(response.answer);
      setSources(response.sources);

      answerAnimation.setValue(0);

      Animated.timing(answerAnimation, {
        toValue: 1,
        duration: 450,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();

      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: 520,
          animated: true,
        });
      }, 120);
    } catch (error) {
      console.error(error);

      setError(
        "Unable to connect to the AI service.",
      );
    } finally {
      setLoading(false);
    }
  }

  const answerTranslateY =
    answerAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [30, 0],
    });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.background}
      />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={
            styles.scrollContent
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* HEADER */}

          <View style={styles.header}>
            <Image
              source={require("../../assets/images/brand/logo.jpg")}
              style={styles.logo}
            />

            <View>
              <Text style={styles.brandName}>
                HARIHAR CODE STUDIO
              </Text>

              <Text
                style={styles.brandSubtitle}
              >
                Part 2 — RAG
              </Text>
            </View>
          </View>

          {/* HERO */}

          <View style={styles.hero}>
            <Text style={styles.title}>
              Ask{" "}
              <Text style={styles.titleAccent}>
                AI
              </Text>
            </Text>

            <Text style={styles.description}>
              RAG finds the knowledge closest
              to your question, then asks AI
              to answer using only that
              knowledge — nothing made up.
            </Text>
          </View>

          {/* ASK */}

          <View style={styles.askSection}>
            <TextInput
              value={question}
              onChangeText={setQuestion}
              placeholder="Ask a question..."
              placeholderTextColor={
                COLORS.textLight
              }
              multiline
              style={styles.input}
            />

            <Pressable
              onPress={handleAskAI}
              disabled={loading}
              style={({ pressed }) => [
                styles.askButton,
                pressed &&
                  styles.askButtonPressed,
                loading &&
                  styles.askButtonDisabled,
              ]}
            >
              {loading ? (
                <>
                  <ActivityIndicator
                    color="#FFFFFF"
                  />

                  <Text
                    style={
                      styles.askButtonText
                    }
                  >
                    Thinking...
                  </Text>
                </>
              ) : (
                <>
                  <Text
                    style={
                      styles.askButtonIcon
                    }
                  >
                    ✦
                  </Text>

                  <Text
                    style={
                      styles.askButtonText
                    }
                  >
                    Ask AI
                  </Text>
                </>
              )}
            </Pressable>
          </View>

          {/* ERROR */}

          {error ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>
                {error}
              </Text>
            </View>
          ) : null}

          {/* ANSWER */}

          {answer ? (
            <Animated.View
              style={[
                styles.answerSection,
                {
                  opacity: answerAnimation,
                  transform: [
                    {
                      translateY:
                        answerTranslateY,
                    },
                  ],
                },
              ]}
            >
              <View
                style={styles.answerCard}
              >
                <Text
                  style={
                    styles.answerLabel
                  }
                >
                  Answer
                </Text>

                <Text
                  style={styles.answerText}
                >
                  {answer}
                </Text>
              </View>

              {sources.length > 0 && (
                <View
                  style={
                    styles.sourcesSection
                  }
                >
                  <Text
                    style={
                      styles.sourcesLabel
                    }
                  >
                    Sources
                  </Text>

                  {sources.map(
                    (source, index) => (
                      <SourceCard
                        key={source.id}
                        source={source}
                        index={index}
                      />
                    ),
                  )}
                </View>
              )}
            </Animated.View>
          ) : null}

          <Text style={styles.footer}>
            HARIHAR CODE STUDIO
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  keyboardContainer: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 60,
  },

  /* HEADER */

  header: {
    flexDirection: "row",
    alignItems: "center",
  },

  logo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },

  brandName: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1,
    color: COLORS.text,
  },

  brandSubtitle: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.primaryDark,
  },

  /* HERO */

  hero: {
    marginTop: 40,
  },

  title: {
    fontSize: 38,
    fontWeight: "800",
    letterSpacing: -1,
    color: COLORS.text,
  },

  titleAccent: {
    color: COLORS.primary,
  },

  description: {
    marginTop: 12,
    maxWidth: 340,
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.textSecondary,
  },

  /* ASK */

  askSection: {
    marginTop: 30,
  },

  input: {
    minHeight: 110,
    padding: 17,
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.text,
    textAlignVertical: "top",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },

  askButton: {
    height: 54,
    marginTop: 12,
    borderRadius: 17,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  askButtonPressed: {
    opacity: 0.82,
  },

  askButtonDisabled: {
    opacity: 0.65,
  },

  askButtonIcon: {
    marginRight: 9,
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  askButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  /* ERROR */

  errorCard: {
    marginTop: 20,
    padding: 15,
    borderRadius: 15,
    backgroundColor: COLORS.errorBackground,
    borderWidth: 1,
    borderColor: COLORS.errorBorder,
  },

  errorText: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.errorText,
  },

  /* ANSWER */

  answerSection: {
    marginTop: 30,
  },

  answerCard: {
    padding: 18,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  answerLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    color: COLORS.primaryDark,
  },

  answerText: {
    marginTop: 10,
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.text,
  },

  /* SOURCES */

  sourcesSection: {
    marginTop: 22,
  },

  sourcesLabel: {
    marginBottom: 10,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    color: COLORS.textSecondary,
  },

  sourceCard: {
    marginBottom: 10,
    padding: 15,
    borderRadius: 15,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  sourceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  sourceId: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.text,
  },

  sourceScore: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primaryDark,
  },

  sourceContent: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textSecondary,
  },

  /* FOOTER */

  footer: {
    marginTop: 40,
    textAlign: "center",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    color: "#9AA6A2",
  },
});
