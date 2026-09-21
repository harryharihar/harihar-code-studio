import React, {
  useState,
} from "react";

import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const API_URL =
  "http://localhost:3000";

type EducationResponse = {
  intent:
    | "education_question"
    | "out_of_scope";

  subject: string;

  topic: string;

  difficulty:
    | "beginner"
    | "intermediate"
    | "advanced";

  explanation: string;

  keyPoints: string[];

  example: string;
};

type ApiResponse = {
  education: EducationResponse;
};

export default function Index() {
  const [
    prompt,
    setPrompt,
  ] = useState(
    "Explain photosynthesis in simple words"
  );

  const [
    result,
    setResult,
  ] =
    useState<EducationResponse | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null
  );

  const askAI = async () => {
    if (!prompt.trim()) {
      setError(
        "Please enter a question."
      );

      return;
    }

    try {
      setLoading(true);

      setError(null);

      setResult(null);

      const response =
        await fetch(
          `${API_URL}/api/education`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              prompt:
                prompt.trim(),
            }),
          }
        );

      const data: ApiResponse =
        await response.json();

      console.log(
        "API RESPONSE:"
      );

      console.log(
        JSON.stringify(
          data,
          null,
          2
        )
      );

      if (!response.ok) {
        throw new Error(
          (data as any)?.error ||
            "Something went wrong."
        );
      }

      /*
       * IMPORTANT:
       *
       * Server response:
       *
       * {
       *   education: {
       *     intent: "...",
       *     subject: "...",
       *     topic: "...",
       *     difficulty: "...",
       *     explanation: "...",
       *     keyPoints: [...],
       *     example: "..."
       *   }
       * }
       *
       * Therefore we use:
       *
       * data.education
       */

      setResult(
        data.education
      );
    } catch (error) {
      console.error(
        "AI REQUEST ERROR:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to connect to server."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={
          styles.content
        }
        keyboardShouldPersistTaps="handled"
      >
        {/* HEADER */}

        <Text style={styles.title}>
          AI Education Assistant
        </Text>

        <Text
          style={styles.subtitle}
        >
          Experiment 02 — Structured
          AI / JSON Schema
        </Text>

        {/* QUESTION CARD */}

        <View style={styles.card}>
          <Text
            style={styles.label}
          >
            Ask your question
          </Text>

          <TextInput
            value={prompt}
            onChangeText={
              setPrompt
            }
            multiline
            placeholder="Ask an education question..."
            placeholderTextColor="#9CA3AF"
            style={styles.input}
          />

          <TouchableOpacity
            style={[
              styles.button,
              loading &&
                styles.buttonDisabled,
            ]}
            onPress={askAI}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator
                color="#FFFFFF"
              />
            ) : (
              <Text
                style={
                  styles.buttonText
                }
              >
                Ask AI
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ERROR */}

        {error && (
          <View
            style={
              styles.errorCard
            }
          >
            <Text
              style={
                styles.errorText
              }
            >
              {error}
            </Text>
          </View>
        )}

        {/* RESULT */}

        {result && (
          <View
            style={
              styles.resultCard
            }
          >
            <Text
              style={
                styles.resultTitle
              }
            >
              Structured AI Response
            </Text>

            {/* INTENT */}

            <View
              style={styles.field}
            >
              <Text
                style={
                  styles.fieldLabel
                }
              >
                Intent
              </Text>

              <Text
                style={
                  styles.fieldValue
                }
              >
                {result.intent}
              </Text>
            </View>

            {/* SUBJECT */}

            <View
              style={styles.field}
            >
              <Text
                style={
                  styles.fieldLabel
                }
              >
                Subject
              </Text>

              <Text
                style={
                  styles.fieldValue
                }
              >
                {result.subject}
              </Text>
            </View>

            {/* TOPIC */}

            <View
              style={styles.field}
            >
              <Text
                style={
                  styles.fieldLabel
                }
              >
                Topic
              </Text>

              <Text
                style={
                  styles.fieldValue
                }
              >
                {result.topic}
              </Text>
            </View>

            {/* DIFFICULTY */}

            <View
              style={styles.field}
            >
              <Text
                style={  
                  styles.fieldLabel 
                }
              >
                Difficulty
              </Text>

              <View
                style={
                  styles.badge
                }
              >
                <Text
                  style={
                    styles.badgeText
                  }
                >
                  {result.difficulty}
                </Text>
              </View>
            </View>

            {/* EXPLANATION */}

            <View
              style={
                styles.section
              }
            >
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Explanation
              </Text>

              <Text
                style={
                  styles.bodyText
                }
              >
                {result.explanation}
              </Text>
            </View>

            {/* KEY POINTS */}

            <View
              style={
                styles.section
              }
            >
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Key Points
              </Text>

              {result.keyPoints.map(
                (
                  point,
                  index
                ) => (
                  <View
                    key={`${point}-${index}`}
                    style={
                      styles.pointRow
                    }
                  >
                    <Text
                      style={
                        styles.bullet
                      }
                    >
                      •
                    </Text>

                    <Text
                      style={
                        styles.pointText
                      }
                    >
                      {point}
                    </Text>
                  </View>
                )
              )}
            </View>

            {/* EXAMPLE */}

            <View
              style={
                styles.section
              }
            >
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Example
              </Text>

              <Text
                style={
                  styles.bodyText
                }
              >
                {result.example}
              </Text>
            </View>

            {/* JSON */}

            <View
              style={
                styles.jsonCard
              }
            >
              <Text
                style={
                  styles.jsonTitle
                }
              >
                Structured JSON
              </Text>

              <Text
                style={
                  styles.jsonText
                }
              >
                {JSON.stringify(
                  result,
                  null,
                  2
                )}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        "#F5F7FB",
    },

    content: {
      padding: 20,
      paddingBottom: 50,
    },

    title: {
      fontSize: 28,
      fontWeight: "700",
      color: "#111827",
      marginBottom: 6,
    },

    subtitle: {
      fontSize: 15,
      color: "#6B7280",
      marginBottom: 20,
    },

    card: {
      backgroundColor:
        "#FFFFFF",
      padding: 18,
      borderRadius: 16,
      marginBottom: 18,

      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },

    label: {
      fontSize: 16,
      fontWeight: "600",
      color: "#111827",
      marginBottom: 10,
    },

    input: {
      minHeight: 110,
      borderWidth: 1,
      borderColor: "#D1D5DB",
      borderRadius: 12,
      padding: 14,
      fontSize: 16,
      color: "#111827",
      textAlignVertical:
        "top",
      backgroundColor:
        "#FAFAFA",
    },

    button: {
      height: 52,
      marginTop: 14,
      borderRadius: 12,
      backgroundColor:
        "#2563EB",
      alignItems: "center",
      justifyContent:
        "center",
    },

    buttonDisabled: {
      opacity: 0.6,
    },

    buttonText: {
      color: "#FFFFFF",
      fontSize: 17,
      fontWeight: "700",
    },

    errorCard: {
      backgroundColor:
        "#FEE2E2",
      padding: 14,
      borderRadius: 12,
      marginBottom: 18,
    },

    errorText: {
      color: "#B91C1C",
      fontSize: 14,
    },

    resultCard: {
      backgroundColor:
        "#FFFFFF",
      padding: 20,
      borderRadius: 16,

      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },

    resultTitle: {
      fontSize: 24,
      fontWeight: "700",
      color: "#111827",
      marginBottom: 20,
    },

    field: {
      paddingBottom: 16,
      marginBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor:
        "#E5E7EB",
    },

    fieldLabel: {
      fontSize: 14,
      color: "#6B7280",
      marginBottom: 5,
    },

    fieldValue: {
      fontSize: 17,
      fontWeight: "600",
      color: "#111827",
    },

    badge: {
      alignSelf:
        "flex-start",
      backgroundColor:
        "#DBEAFE",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },

    badgeText: {
      color: "#1D4ED8",
      fontWeight: "600",
      fontSize: 14,
    },

    section: {
      marginTop: 10,
      marginBottom: 20,
    },

    sectionTitle: {
      fontSize: 19,
      fontWeight: "700",
      color: "#111827",
      marginBottom: 10,
    },

    bodyText: {
      fontSize: 16,
      lineHeight: 24,
      color: "#374151",
    },

    pointRow: {
      flexDirection: "row",
      marginBottom: 10,
    },

    bullet: {
      fontSize: 20,
      color: "#2563EB",
      marginRight: 8,
      lineHeight: 23,
    },

    pointText: {
      flex: 1,
      fontSize: 16,
      lineHeight: 23,
      color: "#374151",
    },

    jsonCard: {
      backgroundColor:
        "#111827",
      padding: 16,
      borderRadius: 12,
      marginTop: 10,
    },

    jsonTitle: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "700",
      marginBottom: 10,
    },

    jsonText: {
      color: "#D1D5DB",
      fontSize: 11,
      lineHeight: 17,
      fontFamily:
        "monospace",
    },
  });