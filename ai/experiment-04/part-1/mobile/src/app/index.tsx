import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
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

import {
  searchDocuments,
  SearchResult,
} from "../api/search";

const COLORS = {
  background: "#F4F7F5",
  surface: "#FFFFFF",
  surfaceSoft: "#EEF5F2",
  border: "#DCE6E2",

  text: "#162033",
  textSecondary: "#64748B",
  textLight: "#8A97A8",

  primary: "#25BFA3",
  primaryDark: "#15977F",

  orange: "#F39A38",

  successBackground: "#E1F6F0",
  successBorder: "#BDE9DD",

  errorBackground: "#FFF0F0",
  errorBorder: "#FFD2D2",
  errorText: "#C24141",
};

function RelevanceBar({
  value,
}: {
  value: number;
}) {
  const percentage = Math.max(
    0,
    Math.min(100, Math.round(value * 100)),
  );

  return (
    <View style={styles.relevanceContainer}>
      <View style={styles.relevanceTrack}>
        <View
          style={[
            styles.relevanceFill,
            {
              width: `${percentage}%`,
            },
          ]}
        />
      </View>

      <Text style={styles.relevanceValue}>
        {percentage}%
      </Text>
    </View>
  );
}

function ResultCard({
  result,
  index,
}: {
  result: SearchResult;
  index: number;
}) {
  const animation = useRef(
    new Animated.Value(0),
  ).current;

  useEffect(() => {
    Animated.timing(animation, {
      toValue: 1,
      duration: 450,
      delay: index * 100,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  const translateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [35, 0],
  });

  return (
    <Animated.View
      style={[
        styles.resultCard,
        {
          opacity: animation,
          transform: [
            {
              translateY,
            },
          ],
        },
      ]}
    >
      {index === 0 && (
        <View style={styles.bestMatchBadge}>
          <Text style={styles.bestMatchText}>
            ✦ BEST MATCH
          </Text>
        </View>
      )}

      <View style={styles.resultHeader}>
        <View style={styles.documentIcon}>
          <Text style={styles.documentIconText}>
            AI
          </Text>
        </View>

        <View style={styles.resultHeaderText}>
          <Text style={styles.documentLabel}>
            KNOWLEDGE DOCUMENT
          </Text>

          <Text style={styles.documentId}>
            {result.id.toUpperCase()}
          </Text>
        </View>
      </View>

      <Text style={styles.resultContent}>
        {result.content}
      </Text>

      <View style={styles.relevanceHeader}>
        <Text style={styles.relevanceLabel}>
          Semantic relevance
        </Text>

        <Text style={styles.relevanceScore}>
          {result.similarity.toFixed(4)}
        </Text>
      </View>

      <RelevanceBar
        value={result.similarity}
      />
    </Animated.View>
  );
}

export default function HomeScreen() {
  const [query, setQuery] = useState(
    "How long do I have to request a refund?",
  );

  const [results, setResults] = useState<
    SearchResult[]
  >([]);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const scrollViewRef =
    useRef<ScrollView>(null);

  const resultsAnimation = useRef(
    new Animated.Value(0),
  ).current;

  async function handleSearch() {
    if (!query.trim() || loading) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await searchDocuments(
        query.trim(),
      );

      LayoutAnimation.configureNext(
        LayoutAnimation.Presets.easeInEaseOut,
      );

      setResults(response.results);

      resultsAnimation.setValue(0);

      Animated.timing(resultsAnimation, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();

      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: 620,
          animated: true,
        });
      }, 120);
    } catch (error) {
      console.error(error);

      setError(
        "Unable to connect to the AI search service.",
      );
    } finally {
      setLoading(false);
    }
  }

  const resultsTranslateY =
    resultsAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [45, 0],
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
            <View style={styles.brandRow}>
              <View style={styles.logo}>
                <Text style={styles.logoText}>
                  H
                </Text>
              </View>

              <View>
                <Text style={styles.brandName}>
                  HARIHAR
                </Text>

                <Text
                  style={styles.brandSubtitle}
                >
                  CODE STUDIO
                </Text>
              </View>
            </View>

            <View
              style={styles.statusContainer}
            >
              <View style={styles.statusDot} />

              <Text style={styles.statusText}>
                AI ONLINE
              </Text>
            </View>
          </View>

          {/* HERO */}

          <View style={styles.hero}>
            <View style={styles.aiBadge}>
              <Text style={styles.aiBadgeText}>
                AI KNOWLEDGE
              </Text>
            </View>

            <Text style={styles.title}>
              Semantic{"\n"}
              <Text style={styles.titleAccent}>
                Search
              </Text>
            </Text>

            <Text style={styles.description}>
              Search your knowledge base by
              meaning, not just matching
              keywords.
            </Text>
          </View>

          {/* SEARCH */}

          <View style={styles.searchSection}>
            <View style={styles.inputHeader}>
              <Text style={styles.inputLabel}>
                ASK YOUR KNOWLEDGE BASE
              </Text>

              <Text
                style={styles.embeddingLabel}
              >
                EMBEDDINGS
              </Text>
            </View>

            <View
              style={styles.inputContainer}
            >
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Ask something..."
                placeholderTextColor={
                  COLORS.textLight
                }
                multiline
                style={styles.input}
              />
            </View>

            <Pressable
              onPress={handleSearch}
              disabled={loading}
              style={({ pressed }) => [
                styles.searchButton,
                pressed &&
                  styles.searchButtonPressed,
                loading &&
                  styles.searchButtonDisabled,
              ]}
            >
              {loading ? (
                <>
                  <ActivityIndicator
                    color="#FFFFFF"
                  />

                  <Text
                    style={
                      styles.searchButtonText
                    }
                  >
                    SEARCHING...
                  </Text>
                </>
              ) : (
                <>
                  <Text
                    style={
                      styles.searchButtonIcon
                    }
                  >
                    ↗
                  </Text>

                  <Text
                    style={
                      styles.searchButtonText
                    }
                  >
                    Search Knowledge
                  </Text>
                </>
              )}
            </Pressable>
          </View>

          {/* ERROR */}

          {error ? (
            <View
              style={styles.errorCard}
            >
              <Text style={styles.errorIcon}>
                !
              </Text>

              <Text style={styles.errorText}>
                {error}
              </Text>
            </View>
          ) : null}

          {/* RESULTS */}

          {results.length > 0 && (
            <Animated.View
              style={[
                styles.resultsSection,
                {
                  opacity: resultsAnimation,
                  transform: [
                    {
                      translateY:
                        resultsTranslateY,
                    },
                  ],
                },
              ]}
            >
              <View
                style={styles.resultsHeader}
              >
                <View>
                  <Text
                    style={
                      styles.resultsEyebrow
                    }
                  >
                    RETRIEVED KNOWLEDGE
                  </Text>

                  <Text
                    style={styles.resultsTitle}
                  >
                    Search Results
                  </Text>
                </View>

                <View
                  style={styles.resultCount}
                >
                  <Text
                    style={
                      styles.resultCountText
                    }
                  >
                    {results.length}
                  </Text>
                </View>
              </View>

              <Text
                style={styles.resultsDescription}
              >
                Documents ranked by semantic
                similarity
              </Text>

              {results.map(
                (result, index) => (
                  <ResultCard
                    key={result.id}
                    result={result}
                    index={index}
                  />
                ),
              )}
            </Animated.View>
          )}

          {/* EMPTY STATE */}

          {results.length === 0 &&
            !loading && (
              <View
                style={styles.emptyState}
              >
                <View
                  style={styles.emptyIcon}
                >
                  <Text
                    style={
                      styles.emptyIconText
                    }
                  >
                    ✦
                  </Text>
                </View>

                <Text
                  style={styles.emptyTitle}
                >
                  Ready to search
                </Text>

                <Text
                  style={
                    styles.emptyDescription
                  }
                >
                  Ask a question and we'll
                  find the knowledge with the
                  closest meaning.
                </Text>
              </View>
            )}

          {/* ARCHITECTURE */}

          <View
            style={styles.architectureCard}
          >
            <View
              style={styles.architectureHeader}
            >
              <Text
                style={
                  styles.architectureTitle
                }
              >
                HOW IT WORKS
              </Text>

              <Text
                style={
                  styles.architectureBadge
                }
              >
                RAG FOUNDATION
              </Text>
            </View>

            <View style={styles.flow}>
              <View style={styles.flowItem}>
                <Text
                  style={styles.flowNumber}
                >
                  01
                </Text>

                <Text
                  style={styles.flowText}
                >
                  Query
                </Text>
              </View>

              <Text style={styles.flowArrow}>
                →
              </Text>

              <View style={styles.flowItem}>
                <Text
                  style={styles.flowNumber}
                >
                  02
                </Text>

                <Text
                  style={styles.flowText}
                >
                  Embedding
                </Text>
              </View>

              <Text style={styles.flowArrow}>
                →
              </Text>

              <View style={styles.flowItem}>
                <Text
                  style={styles.flowNumber}
                >
                  03
                </Text>

                <Text
                  style={styles.flowText}
                >
                  Similarity
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.footer}>
            HARIHAR CODE STUDIO • MOBILE AI
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
    justifyContent: "space-between",
  },

  brandRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  logo: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  logoText: {
    fontSize: 23,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  brandName: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 2,
    color: COLORS.text,
  },

  brandSubtitle: {
    marginTop: 2,
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 2.4,
    color: COLORS.textSecondary,
  },

  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#BFE5DC",
    backgroundColor: "#E8F7F3",
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginRight: 6,
  },

  statusText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    color: COLORS.primaryDark,
  },

  /* HERO */

  hero: {
    marginTop: 45,
  },

  aiBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#E0F5EF",
    borderWidth: 1,
    borderColor: "#B9E6DA",
  },

  aiBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
    color: COLORS.primaryDark,
  },

  title: {
    marginTop: 17,
    fontSize: 44,
    lineHeight: 47,
    fontWeight: "800",
    letterSpacing: -1.5,
    color: COLORS.text,
  },

  titleAccent: {
    color: COLORS.primary,
  },

  description: {
    marginTop: 14,
    maxWidth: 350,
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.textSecondary,
  },

  /* SEARCH */

  searchSection: {
    marginTop: 34,
  },

  inputHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  inputLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
    color: COLORS.text,
  },

  embeddingLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
    color: COLORS.orange,
  },

  inputContainer: {
    minHeight: 120,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    shadowColor: "#14201C",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },

  input: {
    flex: 1,
    minHeight: 120,
    padding: 17,
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.text,
    textAlignVertical: "top",
  },

  searchButton: {
    height: 54,
    marginTop: 12,
    borderRadius: 17,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    shadowColor: COLORS.primaryDark,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },

  searchButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },

  searchButtonDisabled: {
    opacity: 0.65,
  },

  searchButtonIcon: {
    marginRight: 9,
    fontSize: 21,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  searchButtonText: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.2,
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
    flexDirection: "row",
    alignItems: "center",
  },

  errorIcon: {
    width: 25,
    height: 25,
    borderRadius: 13,
    textAlign: "center",
    lineHeight: 25,
    backgroundColor: "#E45B5B",
    color: "#FFFFFF",
    fontWeight: "900",
    marginRight: 10,
  },

  errorText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.errorText,
  },

  /* RESULTS */

  resultsSection: {
    marginTop: 42,
  },

  resultsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  resultsEyebrow: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
    color: COLORS.primaryDark,
  },

  resultsTitle: {
    marginTop: 5,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
    color: COLORS.text,
  },

  resultCount: {
    minWidth: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },

  resultCountText: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.primaryDark,
  },

  resultsDescription: {
    marginTop: 7,
    marginBottom: 18,
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  /* RESULT CARD */

  resultCard: {
    marginBottom: 13,
    padding: 18,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,

    shadowColor: "#14201C",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },

  bestMatchBadge: {
    alignSelf: "flex-start",
    marginBottom: 17,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: COLORS.successBackground,
    borderWidth: 1,
    borderColor: COLORS.successBorder,
  },

  bestMatchText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
    color: COLORS.primaryDark,
  },

  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  documentIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#E8F1EF",
    alignItems: "center",
    justifyContent: "center",
  },

  documentIconText: {
    fontSize: 11,
    fontWeight: "900",
    color: COLORS.primaryDark,
  },

  resultHeaderText: {
    marginLeft: 11,
  },

  documentLabel: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: COLORS.textLight,
  },

  documentId: {
    marginTop: 3,
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
  },

  resultContent: {
    marginTop: 17,
    fontSize: 15,
    lineHeight: 23,
    color: "#344054",
  },

  relevanceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 8,
  },

  relevanceLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: COLORS.textSecondary,
  },

  relevanceScore: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.primaryDark,
  },

  relevanceContainer: {
    flexDirection: "row",
    alignItems: "center",
  },

  relevanceTrack: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#E3EAE7",
    overflow: "hidden",
  },

  relevanceFill: {
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },

  relevanceValue: {
    width: 35,
    marginLeft: 9,
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.textSecondary,
    textAlign: "right",
  },

  /* EMPTY */

  emptyState: {
    marginTop: 38,
    padding: 25,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: "center",
  },

  emptyIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#E0F5EF",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyIconText: {
    fontSize: 24,
    color: COLORS.primary,
  },

  emptyTitle: {
    marginTop: 14,
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.text,
  },

  emptyDescription: {
    marginTop: 7,
    maxWidth: 290,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textSecondary,
  },

  /* ARCHITECTURE */

  architectureCard: {
    marginTop: 30,
    padding: 18,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  architectureHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  architectureTitle: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
    color: COLORS.textSecondary,
  },

  architectureBadge: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: COLORS.orange,
  },

  flow: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  flowItem: {
    alignItems: "center",
  },

  flowNumber: {
    fontSize: 9,
    fontWeight: "900",
    color: COLORS.primaryDark,
  },

  flowText: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.text,
  },

  flowArrow: {
    fontSize: 16,
    color: "#AAB7B3",
  },

  footer: {
    marginTop: 30,
    textAlign: "center",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.5,
    color: "#9AA6A2",
  },
});