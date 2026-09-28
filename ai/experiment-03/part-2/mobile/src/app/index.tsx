import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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

import { sendChatMessage } from "../api/chat";

const EXAMPLE_PROMPTS = [
  "Give me the status of order 12345 and the complete details of order 12346.",
  "Find Alex's orders and give me the full details of the order arriving today.",
  "Cancel order 12348.",
];

const TOOLS = [
  {
    name: "getOrderStatus",
    type: "READ",
    description: "Check the current status of an order.",
  },
  {
    name: "getOrderDetails",
    type: "READ",
    description: "Get complete order information.",
  },
  {
    name: "searchOrders",
    type: "READ",
    description: "Find orders belonging to a customer.",
  },
  {
    name: "cancelOrder",
    type: "ACTION",
    description: "Request cancellation of an order.",
  },
];

export default function HomeScreen() {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAskAI() {
    if (!prompt.trim() || loading) {
      return;
    }

    try {
      setLoading(true);
      setResponse("");

      const result = await sendChatMessage(
        prompt.trim(),
      );

      setResponse(result);
    } catch (error) {
      console.error(error);

      setResponse(
        "Unable to connect to the AI server. Make sure the backend is running on port 3000.",
      );
    } finally {
      setLoading(false);
    }
  }

  function useExample(example: string) {
    setPrompt(example);
    setResponse("");
  }

  function clearChat() {
    setPrompt("");
    setResponse("");
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#3426A8"
      />

      {/* ========================================
          FIXED HEADER / TOOLBAR
          ======================================== */}

      <View style={styles.toolbar}>
        <View style={styles.toolbarBrand}>
          <View style={styles.brandIcon}>
            <Text style={styles.brandIconText}>
              AI
            </Text>
          </View>

          <View>
            <Text style={styles.toolbarTitle}>
              AI Order Assistant
            </Text>

            <Text style={styles.toolbarSubtitle}>
              Harihar Code Studio
            </Text>
          </View>
        </View>

        <View style={styles.toolbarStatus}>
          <View style={styles.toolbarStatusDot} />

          <Text style={styles.toolbarStatusText}>
            ONLINE
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ========================================
              ARCHITECTURE
              ======================================== */}

          <View style={styles.architectureCard}>
            <Text style={styles.cardEyebrow}>
              HOW IT WORKS
            </Text>

            <Text style={styles.architectureTitle}>
              AI doesn't execute your tools.
            </Text>

            <Text style={styles.architectureDescription}>
              AI decides which tool is needed.
              Your backend executes it.
            </Text>

            <View style={styles.flow}>
              <FlowStep
                number="01"
                title="USER"
                description="Ask"
              />

              <FlowArrow />

              <FlowStep
                number="02"
                title="AI"
                description="Decides"
              />

              <FlowArrow />

              <FlowStep
                number="03"
                title="TOOLS"
                description="Execute"
              />

              <FlowArrow />

              <FlowStep
                number="04"
                title="AI"
                description="Answers"
              />
            </View>
          </View>

          {/* ========================================
              AVAILABLE TOOLS
              ======================================== */}

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                Available Tools
              </Text>

              <Text style={styles.sectionSubtitle}>
                Functions the AI can request
              </Text>
            </View>

            <View style={styles.toolCount}>
              <Text style={styles.toolCountText}>
                {TOOLS.length}
              </Text>
            </View>
          </View>

          <View style={styles.toolsGrid}>
            {TOOLS.map((tool) => (
              <View
                key={tool.name}
                style={styles.toolCard}
              >
                <View style={styles.toolTop}>
                  <View style={styles.toolIcon}>
                    <Text style={styles.toolIconText}>
                      {"{ }"}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.toolType,
                      tool.type === "ACTION" &&
                        styles.actionType,
                    ]}
                  >
                    {tool.type}
                  </Text>
                </View>

                <Text style={styles.toolName}>
                  {tool.name}
                </Text>

                <Text style={styles.toolDescription}>
                  {tool.description}
                </Text>
              </View>
            ))}
          </View>

          {/* ========================================
              SCENARIOS
              ======================================== */}

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                Try a Scenario
              </Text>

              <Text style={styles.sectionSubtitle}>
                See how the AI selects tools
              </Text>
            </View>
          </View>

          {EXAMPLE_PROMPTS.map(
            (example, index) => (
              <Pressable
                key={index}
                style={({ pressed }) => [
                  styles.exampleCard,
                  pressed &&
                    styles.examplePressed,
                ]}
                onPress={() =>
                  useExample(example)
                }
              >
                <View style={styles.exampleNumber}>
                  <Text
                    style={styles.exampleNumberText}
                  >
                    {String(index + 1).padStart(
                      2,
                      "0",
                    )}
                  </Text>
                </View>

                <View style={styles.exampleContent}>
                  <Text
                    style={styles.exampleText}
                  >
                    {example}
                  </Text>

                  <Text
                    style={styles.exampleAction}
                  >
                    USE SCENARIO →
                  </Text>
                </View>
              </Pressable>
            ),
          )}

          {/* ========================================
              ASK AI
              ======================================== */}

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                Ask the AI
              </Text>

              <Text style={styles.sectionSubtitle}>
                Try your own request
              </Text>
            </View>

            {prompt ? (
              <Pressable onPress={clearChat}>
                <Text style={styles.clearText}>
                  CLEAR
                </Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.inputCard}>
            <TextInput
              value={prompt}
              onChangeText={setPrompt}
              placeholder="e.g. Find Alex's orders..."
              placeholderTextColor="#8A8A8A"
              multiline
              style={styles.input}
              editable={!loading}
            />

            <View style={styles.inputFooter}>
              <Text style={styles.inputHint}>
                AI will decide which tools to use
              </Text>

              <Text style={styles.characterCount}>
                {prompt.length}
              </Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.askButton,
              (!prompt.trim() || loading) &&
                styles.askButtonDisabled,
              pressed &&
                prompt.trim() &&
                !loading &&
                styles.askButtonPressed,
            ]}
            onPress={handleAskAI}
            disabled={!prompt.trim() || loading}
          >
            {loading ? (
              <>
                <ActivityIndicator color="#FFFFFF" />

                <Text style={styles.askButtonText}>
                  AI IS THINKING...
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.askButtonText}>
                  ASK AI
                </Text>

                <Text style={styles.askButtonArrow}>
                  →
                </Text>
              </>
            )}
          </Pressable>

          {/* ========================================
              AI RESPONSE
              ======================================== */}

          {response ? (
            <View style={styles.responseSection}>
              <View style={styles.responseHeader}>
                <View>
                  <Text style={styles.cardEyebrow}>
                    RESULT
                  </Text>

                  <Text style={styles.responseTitle}>
                    AI Response
                  </Text>
                </View>

                <View style={styles.successBadge}>
                  <View
                    style={styles.successDot}
                  />

                  <Text
                    style={styles.successText}
                  >
                    COMPLETE
                  </Text>
                </View>
              </View>

              <View style={styles.responseCard}>
                {response
                  .split("\n")
                  .map((line, index) => (
                    <Text
                      key={index}
                      style={styles.responseLine}
                    >
                      {line.replace(
                        /\*\*/g,
                        "",
                      )}
                    </Text>
                  ))}
              </View>

              <View style={styles.learningCard}>
                <Text style={styles.learningTitle}>
                  What happened?
                </Text>

                <Text style={styles.learningText}>
                  The AI selected the required
                  tool(s), your backend executed
                  them, and the results were sent
                  back to the AI for the final
                  response.
                </Text>
              </View>
            </View>
          ) : null}

          {/* ========================================
              FOOTER
              ======================================== */}

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              EXPERIMENT 03 • PART 2
            </Text>

            <Text style={styles.footerSubtext}>
              Advanced Tool Calling
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ============================================
   FLOW COMPONENTS
   ============================================ */

function FlowStep({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.flowStep}>
      <View style={styles.flowNumber}>
        <Text style={styles.flowNumberText}>
          {number}
        </Text>
      </View>

      <Text style={styles.flowTitle}>
        {title}
      </Text>

      <Text style={styles.flowDescription}>
        {description}
      </Text>
    </View>
  );
}

function FlowArrow() {
  return (
    <Text style={styles.flowArrow}>
      →
    </Text>
  );
}

/* ============================================
   STYLES
   ============================================ */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#EEF0FF",
  },

  container: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 50,
  },

  /* ==========================================
     TOOLBAR
     ========================================== */

  toolbar: {
    height: 76,
    paddingHorizontal: 18,
    backgroundColor: "#3426A8",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },

  toolbarBrand: {
    flexDirection: "row",
    alignItems: "center",
  },

  brandIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#5B4BFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  brandIconText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: -0.5,
  },

  toolbarTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.2,
  },

  toolbarSubtitle: {
    marginTop: 2,
    color: "#C9C5FF",
    fontSize: 11,
    fontWeight: "600",
  },

  toolbarStatus: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  toolbarStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#6DFFB1",
    marginRight: 5,
  },

  toolbarStatusText: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.8,
  },

  /* ==========================================
     ARCHITECTURE
     ========================================== */

  architectureCard: {
    backgroundColor: "#17152F",
    borderRadius: 22,
    padding: 20,
    marginBottom: 28,

    borderWidth: 1,
    borderColor: "#302A60",
  },

  cardEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.6,
    color: "#8E83FF",
  },

  architectureTitle: {
    marginTop: 7,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  architectureDescription: {
    marginTop: 7,
    fontSize: 14,
    lineHeight: 21,
    color: "#BDB9D8",
  },

  flow: {
    marginTop: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  flowStep: {
    alignItems: "center",
    flex: 1,
  },

  flowNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#29254D",
    borderWidth: 1,
    borderColor: "#514A80",
  },

  flowNumberText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },

  flowTitle: {
    marginTop: 7,
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },

  flowDescription: {
    marginTop: 2,
    color: "#8882A8",
    fontSize: 9,
  },

  flowArrow: {
    color: "#6F66B7",
    fontSize: 17,
    marginHorizontal: 1,
  },

  /* ==========================================
     SECTION
     ========================================== */

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    marginTop: 4,
  },

  sectionTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#181631",
  },

  sectionSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#77758A",
  },

  clearText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    color: "#5147B0",
  },

  /* ==========================================
     TOOL COUNT
     ========================================== */

  toolCount: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#3426A8",
    alignItems: "center",
    justifyContent: "center",
  },

  toolCountText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  /* ==========================================
     TOOLS
     ========================================== */

  toolsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 28,
  },

  toolCard: {
    width: "48.5%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,

    borderWidth: 1,
    borderColor: "#DCDCF5",

    shadowColor: "#3426A8",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },

  toolTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  toolIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#EEEEFF",
    alignItems: "center",
    justifyContent: "center",
  },

  toolIconText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#3426A8",
  },

  toolType: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1,
    color: "#777",
  },

  actionType: {
    color: "#B56A00",
  },

  toolName: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: "800",
    color: "#181631",
  },

  toolDescription: {
    marginTop: 4,
    fontSize: 10,
    lineHeight: 15,
    color: "#77758A",
  },

  /* ==========================================
     EXAMPLES
     ========================================== */

  exampleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,

    borderWidth: 1,
    borderColor: "#DCDCF5",

    shadowColor: "#3426A8",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
  },

  examplePressed: {
    opacity: 0.7,
    transform: [{ scale: 0.99 }],
  },

  exampleNumber: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#3426A8",
    alignItems: "center",
    justifyContent: "center",
  },

  exampleNumberText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },

  exampleContent: {
    flex: 1,
    marginLeft: 12,
  },

  exampleText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#333044",
    fontWeight: "500",
  },

  exampleAction: {
    marginTop: 7,
    fontSize: 8,
    letterSpacing: 1,
    fontWeight: "800",
    color: "#5147B0",
  },

  /* ==========================================
     INPUT
     ========================================== */

  inputCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#DCDCF5",
    padding: 14,

    shadowColor: "#3426A8",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },

  input: {
    minHeight: 90,
    fontSize: 15,
    lineHeight: 22,
    color: "#181631",
    textAlignVertical: "top",
  },

  inputFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#EEEEF7",
  },

  inputHint: {
    fontSize: 9,
    color: "#9997A8",
  },

  characterCount: {
    fontSize: 9,
    color: "#9997A8",
  },

  /* ==========================================
     ASK BUTTON
     ========================================== */

  askButton: {
    height: 56,
    borderRadius: 16,
    marginTop: 10,
    backgroundColor: "#3426A8",

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#3426A8",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },

  askButtonDisabled: {
    backgroundColor: "#AAA8BD",
  },

  askButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },

  askButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.3,
  },

  askButtonArrow: {
    color: "#FFFFFF",
    marginLeft: 12,
    fontSize: 20,
  },

  /* ==========================================
     RESPONSE
     ========================================== */

  responseSection: {
    marginTop: 30,
  },

  responseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 12,
  },

  responseTitle: {
    marginTop: 4,
    fontSize: 21,
    fontWeight: "800",
    color: "#181631",
  },

  successBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E9F8EF",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 20,
  },

  successDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#20A45A",
    marginRight: 5,
  },

  successText: {
    fontSize: 8,
    fontWeight: "800",
    color: "#168246",
  },

  responseCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,

    borderWidth: 1,
    borderColor: "#DCDCF5",

    shadowColor: "#3426A8",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },

  responseLine: {
    fontSize: 14,
    lineHeight: 22,
    color: "#22202F",
    marginBottom: 4,
  },

  learningCard: {
    marginTop: 10,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#E3E2FF",
    borderWidth: 1,
    borderColor: "#D1CFFF",
  },

  learningTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#30278A",
  },

  learningText: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    color: "#5C5680",
  },

  /* ==========================================
     FOOTER
     ========================================== */

  footer: {
    alignItems: "center",
    marginTop: 40,
    paddingVertical: 20,
  },

  footerText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
    color: "#6258B8",
  },

  footerSubtext: {
    marginTop: 4,
    fontSize: 11,
    color: "#9996B2",
  },
});