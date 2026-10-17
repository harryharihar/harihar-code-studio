import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
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

import {
  askRAG,
  compareAnswers,
  Source,
} from "../api/rag";

const ASSISTANT_NAME = "HCS Assistant";

const COLORS = {
  background: "#FBFEFD",
  surface: "#FFFFFF",
  surfaceMuted: "#F0FBF9",
  border: "#E4F3F0",

  text: "#15161F",
  textSecondary: "#5C6270",
  textLight: "#96A0AE",

  primary: "#20C9B5",
  primaryDark: "#0FA896",
  primarySoft: "#E3FBF6",
  primaryBorder: "#BFF0E6",

  headline: "#1A56FF",

  success: "#16A34A",

  warning: "#D97706",
  warningBackground: "#FFF7ED",
  warningBorder: "#FDE1B8",

  danger: "#C0392B",
  dangerBackground: "#FFF1F1",
  dangerBorder: "#FFD6D6",

  errorBackground: "#FFF1F1",
  errorBorder: "#FFD6D6",
  errorText: "#C0392B",
};

const CARD_ACCENTS = ["#20C9B5", "#1A56FF", "#E0567A", "#D18B1D"];

type Topic = {
  label: string;
  icon: string;
  tint: string;
  accent: string;
  question: string;
};

const TOPICS: Topic[] = [
  {
    label: "Refunds",
    icon: "💸",
    tint: "#FDEEF0",
    accent: "#E0567A",
    question: "How long do I have to request a refund?",
  },
  {
    label: "Orders",
    icon: "📦",
    tint: "#EAF1FF",
    accent: "#1A56FF",
    question: "Can I cancel my order?",
  },
  {
    label: "Delivery",
    icon: "🚚",
    tint: "#EAFBF3",
    accent: "#15A362",
    question: "How long does delivery take?",
  },
  {
    label: "Shipping",
    icon: "📍",
    tint: "#FFF7E6",
    accent: "#D18B1D",
    question: "Can I update my shipping address?",
  },
];

const TRAP_QUESTIONS = [
  "Do you offer international shipping?",
  "What's your warranty on electronics?",
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

type CompareData = {
  ragAnswer: string;
  ragGrounded: boolean;
  ragConfidence: number;
  ragGroundedness: number;
  ragSources: Source[];
  noRagAnswer: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "compare";
  text?: string;
  sources?: Source[];
  isError?: boolean;
  grounded?: boolean;
  confidence?: number;
  groundedness?: number;
  compare?: CompareData;
};

function FadeInUp({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: object;
}) {
  const animation = useRef(
    new Animated.Value(0),
  ).current;

  useEffect(() => {
    Animated.timing(animation, {
      toValue: 1,
      duration: 380,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: animation,
          transform: [
            {
              translateY: animation.interpolate({
                inputRange: [0, 1],
                outputRange: [16, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

function Orb({ size = 30 }: { size?: number }) {
  return (
    <Image
      source={require("../../assets/images/brand/mark.png")}
      resizeMode="cover"
      style={[
        styles.orb,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    />
  );
}

function usePressScale(target = 0.94) {
  const scale = useRef(new Animated.Value(1)).current;

  function onPressIn() {
    Animated.spring(scale, {
      toValue: target,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();
  }

  function onPressOut() {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 9,
    }).start();
  }

  return { scale, onPressIn, onPressOut };
}

function TopicCard({
  topic,
  onPress,
  delay,
}: {
  topic: Topic;
  onPress: () => void;
  delay: number;
}) {
  const { scale, onPressIn, onPressOut } =
    usePressScale(0.93);

  return (
    <FadeInUp
      delay={delay}
      style={styles.topicCardTouchable}
    >
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        <Animated.View
          style={[
            styles.topicCard,
            {
              backgroundColor: topic.tint,
              borderColor: `${topic.accent}2E`,
              shadowColor: topic.accent,
              transform: [{ scale }],
            },
          ]}
        >
          <View
            style={[
              styles.topicIconWrap,
              { backgroundColor: COLORS.surface },
            ]}
          >
            <Text style={styles.topicIcon}>
              {topic.icon}
            </Text>
          </View>

          <Text
            style={[
              styles.topicLabel,
              { color: topic.accent },
            ]}
          >
            {topic.label}
          </Text>
        </Animated.View>
      </Pressable>
    </FadeInUp>
  );
}

function FlowArrow({ delay = 0 }: { delay?: number }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 450,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 450,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.delay(900),
      ]),
    );

    loop.start();

    return () => loop.stop();
  }, []);

  return (
    <Animated.Text
      style={[
        styles.infoStepArrow,
        {
          opacity: pulse.interpolate({
            inputRange: [0, 1],
            outputRange: [0.55, 1],
          }),
          transform: [
            {
              translateX: pulse.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 5],
              }),
            },
          ],
        },
      ]}
    >
      →
    </Animated.Text>
  );
}

function PopularRow({
  topic,
  onPress,
  delay,
}: {
  topic: Topic;
  onPress: () => void;
  delay: number;
}) {
  const { scale, onPressIn, onPressOut } =
    usePressScale(0.97);

  return (
    <FadeInUp delay={delay}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        <Animated.View
          style={[
            styles.popularRow,
            { transform: [{ scale }] },
          ]}
        >
          <View
            style={[
              styles.popularIconWrap,
              { backgroundColor: topic.tint },
            ]}
          >
            <Text style={styles.popularIcon}>
              {topic.icon}
            </Text>
          </View>

          <Text style={styles.popularText}>
            {topic.question}
          </Text>

          <Text
            style={[
              styles.popularArrow,
              { color: topic.accent },
            ]}
          >
            ↗
          </Text>
        </Animated.View>
      </Pressable>
    </FadeInUp>
  );
}

function TypingIndicator() {
  const dots = [
    useRef(new Animated.Value(0.25)).current,
    useRef(new Animated.Value(0.25)).current,
    useRef(new Animated.Value(0.25)).current,
  ];

  useEffect(() => {
    const loops = dots.map((dot, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 150),
          Animated.timing(dot, {
            toValue: 1,
            duration: 350,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.25,
            duration: 350,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.delay((2 - index) * 150),
        ]),
      ),
    );

    loops.forEach((loop) => loop.start());

    return () => loops.forEach((loop) => loop.stop());
  }, []);

  return (
    <View style={styles.assistantRow}>
      <Orb size={28} />

      <View
        style={[
          styles.bubble,
          styles.assistantBubble,
          styles.typingBubble,
        ]}
      >
        {dots.map((dot, index) => (
          <Animated.View
            key={index}
            style={[
              styles.typingDot,
              { opacity: dot },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function SourceCard({
  source,
  index,
}: {
  source: Source;
  index: number;
}) {
  const accent = CARD_ACCENTS[index % CARD_ACCENTS.length];

  return (
    <View style={styles.sourceCard}>
      <View style={styles.sourceCardHeader}>
        <Text
          style={[
            styles.sourceCardId,
            { color: accent },
          ]}
        >
          {source.id.toUpperCase()}
        </Text>

        <Text style={styles.sourceCardScore}>
          {Math.round(source.similarity * 100)}%
        </Text>
      </View>

      <Text
        style={styles.sourceCardContent}
        numberOfLines={3}
      >
        {source.content}
      </Text>
    </View>
  );
}

function ConfidenceBadge({
  grounded,
  groundedness,
}: {
  grounded: boolean;
  groundedness: number;
}) {
  if (!grounded) {
    return (
      <View style={styles.warnBadge}>
        <Text style={styles.warnBadgeText}>
          ⚠ Not enough information
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.groundedBadge}>
      <Text style={styles.groundedBadgeText}>
        ✓ {Math.round(groundedness * 100)}% grounded
      </Text>
    </View>
  );
}

function CompareBubble({
  compare,
}: {
  compare: CompareData;
}) {
  return (
    <FadeInUp>
      <View style={styles.assistantRow}>
        <Orb size={28} />

        <View style={styles.assistantColumn}>
          <View
            style={[
              styles.compareCard,
              styles.compareCardDanger,
            ]}
          >
            <View style={styles.compareLabelRow}>
              <View style={styles.compareLabelDanger}>
                <Text
                  style={styles.compareLabelDangerText}
                >
                  ⚠ Without RAG
                </Text>
              </View>
            </View>

            <Text style={styles.compareAnswerText}>
              {compare.noRagAnswer}
            </Text>
          </View>

          <View
            style={[
              styles.compareCard,
              styles.compareCardSafe,
              styles.compareCardSpacing,
            ]}
          >
            <View style={styles.compareLabelRow}>
              <View style={styles.compareLabelSafe}>
                <Text
                  style={styles.compareLabelSafeText}
                >
                  ✓ With RAG
                </Text>
              </View>

              <ConfidenceBadge
                grounded={compare.ragGrounded}
                groundedness={
                  compare.ragGroundedness
                }
              />
            </View>

            <Text style={styles.compareAnswerText}>
              {compare.ragAnswer}
            </Text>
          </View>

          {compare.ragSources.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.sourceScroll}
              contentContainerStyle={
                styles.sourceScrollContent
              }
            >
              {compare.ragSources.map(
                (source, index) => (
                  <SourceCard
                    key={source.id}
                    source={source}
                    index={index}
                  />
                ),
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </FadeInUp>
  );
}

function MessageBubble({
  message,
}: {
  message: ChatMessage;
}) {
  if (message.role === "user") {
    return (
      <FadeInUp>
        <View style={styles.userRow}>
          <View
            style={[styles.bubble, styles.userBubble]}
          >
            <Text style={styles.userBubbleText}>
              {message.text}
            </Text>
          </View>
        </View>
      </FadeInUp>
    );
  }

  if (message.role === "compare" && message.compare) {
    return <CompareBubble compare={message.compare} />;
  }

  const showBadge =
    !message.isError && message.grounded !== undefined;

  return (
    <FadeInUp>
      <View style={styles.assistantRow}>
        <Orb size={28} />

        <View style={styles.assistantColumn}>
          <View
            style={[
              styles.bubble,
              styles.assistantBubble,
              message.isError &&
                styles.assistantBubbleError,
              message.grounded === false &&
                styles.assistantBubbleWarning,
            ]}
          >
            {showBadge && (
              <ConfidenceBadge
                grounded={Boolean(message.grounded)}
                groundedness={
                  message.groundedness ?? 0
                }
              />
            )}

            <Text
              style={[
                styles.assistantBubbleText,
                message.isError &&
                  styles.errorText,
                showBadge &&
                  styles.assistantBubbleTextSpaced,
              ]}
            >
              {message.text}
            </Text>
          </View>

          {message.sources &&
            message.sources.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.sourceScroll}
                contentContainerStyle={
                  styles.sourceScrollContent
                }
              >
                {message.sources.map(
                  (source, index) => (
                    <SourceCard
                      key={source.id}
                      source={source}
                      index={index}
                    />
                  ),
                )}
              </ScrollView>
            )}
        </View>
      </View>
    </FadeInUp>
  );
}

const SPLASH_HOLD_MS = 3600;
const SPLASH_FADE_MS = 450;

function AppSplash({ onDone }: { onDone: () => void }) {
  const logoAnim = useRef(new Animated.Value(0)).current;
  const nameAnim = useRef(new Animated.Value(0)).current;
  const topicAnim = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(
    new Animated.Value(1),
  ).current;
  const progress = useRef(
    new Animated.Value(0),
  ).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(logoAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 10,
        bounciness: 10,
      }),
      Animated.timing(nameAnim, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(topicAnim, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    Animated.timing(progress, {
      toValue: 1,
      duration: SPLASH_HOLD_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: SPLASH_FADE_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(onDone);
    }, SPLASH_HOLD_MS);

    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.background}
      />

      <Animated.View
        style={[
          styles.splash,
          { opacity: screenOpacity },
        ]}
      >
        <Animated.View
        style={{
          opacity: logoAnim,
          transform: [
            {
              scale: logoAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.6, 1],
              }),
            },
          ],
        }}
      >
        <Orb size={84} />
      </Animated.View>

      <Animated.Text
        style={[
          styles.splashChannel,
          {
            opacity: nameAnim,
            transform: [
              {
                translateY: nameAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, 0],
                }),
              },
            ],
          },
        ]}
      >
        Harihar Code Studio
      </Animated.Text>

      <Animated.Text
        style={[
          styles.splashTopic,
          {
            opacity: topicAnim,
            transform: [
              {
                translateY: topicAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, 0],
                }),
              },
            ],
          },
        ]}
      >
        Enterprise Knowledge Assistant · RAG +
        pgvector
      </Animated.Text>

      <View style={styles.splashProgressTrack}>
        <Animated.View
          style={[
            styles.splashProgressFill,
            {
              width: progress.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>
      </Animated.View>
    </SafeAreaView>
  );
}

function SubscribeToast({
  visible,
}: {
  visible: boolean;
}) {
  const translateY = useRef(
    new Animated.Value(140),
  ).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible ? 0 : 140,
      useNativeDriver: true,
      speed: 14,
      bounciness: 7,
    }).start();
  }, [visible]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.subscribeToast,
        { transform: [{ translateY }] },
      ]}
    >
      <Image
        source={require("../../assets/images/brand/mark.png")}
        resizeMode="cover"
        style={styles.subscribeToastLogo}
      />

      <View style={styles.subscribeToastTextGroup}>
        <Text style={styles.subscribeToastChannel}>
          Harihar Code Studio
        </Text>

        <Text style={styles.subscribeToastCta}>
          New AI engineering videos every week
        </Text>
      </View>

      <View style={styles.subscribeButton}>
        <Text style={styles.subscribeButtonText}>
          Subscribe
        </Text>
      </View>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const [showSplash, setShowSplash] =
    useState(true);

  const [showSubscribe, setShowSubscribe] =
    useState(false);

  const [input, setInput] = useState("");

  const [messages, setMessages] = useState<
    ChatMessage[]
  >([]);

  const [loading, setLoading] = useState(false);

  const [compareMode, setCompareMode] =
    useState(false);

  const scrollViewRef =
    useRef<ScrollView>(null);

  const inChat = messages.length > 0;

  function scrollToEnd() {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({
        animated: true,
      });
    }, 80);
  }

  async function sendQuestion(question: string) {
    if (!question.trim() || loading) {
      return;
    }

    const trimmed = question.trim();

    const userMessage: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    scrollToEnd();

    try {
      if (compareMode) {
        const response = await compareAnswers(
          trimmed,
        );

        setMessages((prev) => [
          ...prev,
          {
            id: `c-${Date.now()}`,
            role: "compare",
            compare: {
              ragAnswer: response.rag.answer,
              ragGrounded: response.rag.grounded,
              ragConfidence:
                response.rag.confidence,
              ragGroundedness:
                response.rag.groundedness,
              ragSources: response.rag.sources,
              noRagAnswer: response.noRag.answer,
            },
          },
        ]);
      } else {
        const response = await askRAG(trimmed);

        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            text: response.answer,
            sources: response.sources,
            grounded: response.grounded,
            confidence: response.confidence,
            groundedness: response.groundedness,
          },
        ]);
      }
    } catch (error) {
      console.error(error);

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: `I couldn't reach the AI service. Please try again.`,
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
      scrollToEnd();
    }
  }

  function startNewChat() {
    setMessages([]);
    setInput("");
  }

  const subscribeHideRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  function triggerSubscribe() {
    if (subscribeHideRef.current) {
      clearTimeout(subscribeHideRef.current);
    }

    setShowSubscribe(true);

    subscribeHideRef.current = setTimeout(() => {
      setShowSubscribe(false);
    }, 4000);
  }

  useEffect(() => {
    if (showSplash) {
      return;
    }

    const interval = setInterval(() => {
      triggerSubscribe();
    }, 35000);

    return () => clearInterval(interval);
  }, [showSplash]);

  if (showSplash) {
    return (
      <AppSplash
        onDone={() => setShowSplash(false)}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.background}
      />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={
          Platform.OS === "ios" ? "padding" : undefined
        }
        keyboardVerticalOffset={
          Platform.OS === "ios" ? 8 : 0
        }
      >
        {/* HEADER */}

        {inChat ? (
          <View style={styles.chatHeader}>
            <Pressable
              onPress={startNewChat}
              hitSlop={10}
              style={({ pressed }) => [
                styles.backButton,
                pressed &&
                  styles.backButtonPressed,
              ]}
            >
              <Text style={styles.backButtonIcon}>
                ←
              </Text>
            </Pressable>

            <Pressable
              onPress={triggerSubscribe}
              style={styles.chatHeaderBrand}
            >
              <Orb size={32} />

              <View
                style={styles.chatHeaderTextGroup}
              >
                <Text
                  style={styles.chatHeaderName}
                >
                  {ASSISTANT_NAME}
                </Text>

                <View style={styles.statusRow}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusText}>
                    Online
                  </Text>
                </View>
              </View>
            </Pressable>
          </View>
        ) : (
          <View style={styles.greetingHeader}>
            <Pressable
              onPress={triggerSubscribe}
              style={styles.brandRow}
            >
              <Orb size={44} />

              <View style={styles.brandTextGroup}>
                <Text style={styles.channelName}>
                  Harihar Code Studio
                </Text>

                <Text style={styles.topicName}>
                  Hallucination & Grounded Answers
                </Text>
              </View>
            </Pressable>

            <Text style={styles.greetingText}>
              {getGreeting()}
            </Text>

            <Text style={styles.greetingSubtitle}>
              I'm {ASSISTANT_NAME}. I answer from
              our indexed documents only — nothing
              made up.
            </Text>
          </View>
        )}

        {/* CONTENT */}

        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={
            styles.scrollContent
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {inChat ? (
            <>
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                />
              ))}

              {loading && <TypingIndicator />}
            </>
          ) : (
            <>
              <View style={styles.infoCard}>
                <View style={styles.infoCardHeader}>
                  <View style={styles.infoCardIconWrap}>
                    <Text style={styles.infoCardIcon}>
                      🔍
                    </Text>
                  </View>

                  <Text style={styles.infoCardTitle}>
                    How this works
                  </Text>
                </View>

                <Text style={styles.infoCardText}>
                  {ASSISTANT_NAME} scores how
                  confident the retrieval was before
                  answering. Below a threshold, it
                  refuses instead of guessing — try
                  "Test the guardrails" below to see
                  it happen, or flip on Compare mode
                  to see a hallucinated answer next
                  to the grounded one.
                </Text>

                <View style={styles.infoSteps}>
                  <View style={styles.infoStep}>
                    <View
                      style={styles.infoStepBadge}
                    >
                      <Text
                        style={
                          styles.infoStepNumber
                        }
                      >
                        1
                      </Text>
                    </View>

                    <Text
                      style={styles.infoStepLabel}
                    >
                      Retrieve
                    </Text>
                  </View>

                  <FlowArrow delay={0} />

                  <View style={styles.infoStep}>
                    <View
                      style={styles.infoStepBadge}
                    >
                      <Text
                        style={
                          styles.infoStepNumber
                        }
                      >
                        2
                      </Text>
                    </View>

                    <Text
                      style={styles.infoStepLabel}
                    >
                      Score
                    </Text>
                  </View>

                  <FlowArrow delay={450} />

                  <View style={styles.infoStep}>
                    <View
                      style={styles.infoStepBadge}
                    >
                      <Text
                        style={
                          styles.infoStepNumber
                        }
                      >
                        3
                      </Text>
                    </View>

                    <Text
                      style={styles.infoStepLabel}
                    >
                      Answer / Refuse
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={styles.sectionTitle}>
                Featured topics
              </Text>

              <Text style={styles.sectionSubtitle}>
                Start exploring with these
              </Text>

              <View style={styles.topicGrid}>
                {TOPICS.map((topic, index) => (
                  <TopicCard
                    key={topic.label}
                    topic={topic}
                    delay={index * 60}
                    onPress={() =>
                      sendQuestion(topic.question)
                    }
                  />
                ))}
              </View>

              <Text
                style={[
                  styles.sectionTitle,
                  styles.popularTitle,
                ]}
              >
                Popular questions
              </Text>

              <Text style={styles.sectionSubtitle}>
                Explore frequently asked questions
              </Text>

              <View style={styles.popularList}>
                {TOPICS.map((topic, index) => (
                  <PopularRow
                    key={topic.question}
                    topic={topic}
                    delay={index * 60}
                    onPress={() =>
                      sendQuestion(topic.question)
                    }
                  />
                ))}
              </View>

              <Text
                style={[
                  styles.sectionTitle,
                  styles.popularTitle,
                ]}
              >
                Test the guardrails
              </Text>

              <Text style={styles.sectionSubtitle}>
                Questions our knowledge base
                doesn't cover — watch what happens
              </Text>

              <View style={styles.popularList}>
                {TRAP_QUESTIONS.map(
                  (question, index) => (
                    <Pressable
                      key={question}
                      onPress={() =>
                        sendQuestion(question)
                      }
                      style={({ pressed }) => [
                        styles.trapRow,
                        pressed &&
                          styles.trapRowPressed,
                      ]}
                    >
                      <Text
                        style={styles.trapIcon}
                      >
                        ⚠
                      </Text>

                      <Text
                        style={styles.trapText}
                      >
                        {question}
                      </Text>

                      <Text
                        style={styles.trapArrow}
                      >
                        ↗
                      </Text>
                    </Pressable>
                  ),
                )}
              </View>
            </>
          )}
        </ScrollView>

        {/* COMPARE TOGGLE */}

        <Pressable
          onPress={() =>
            setCompareMode((prev) => !prev)
          }
          style={styles.compareToggleRow}
        >
          <View
            style={[
              styles.compareSwitch,
              compareMode &&
                styles.compareSwitchOn,
            ]}
          >
            <View
              style={[
                styles.compareSwitchKnob,
                compareMode &&
                  styles.compareSwitchKnobOn,
              ]}
            />
          </View>

          <Text style={styles.compareToggleLabel}>
            Compare with / without RAG
          </Text>
        </Pressable>

        {/* INPUT */}

        <View style={styles.inputBar}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask a question..."
            placeholderTextColor={
              COLORS.textLight
            }
            style={styles.input}
            multiline
            onSubmitEditing={() =>
              sendQuestion(input)
            }
          />

          <Pressable
            onPress={() => sendQuestion(input)}
            disabled={!input.trim() || loading}
            style={({ pressed }) => {
              const canSend =
                Boolean(input.trim()) && !loading;

              return [
                styles.sendButton,
                !canSend &&
                  styles.sendButtonDisabled,
                pressed &&
                  canSend &&
                  styles.sendButtonPressed,
              ];
            }}
          >
            <Text style={styles.sendButtonIcon}>
              ➤
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <SubscribeToast visible={showSubscribe} />
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

  /* GREETING HEADER */

  greetingHeader: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 18,
  },

  brandRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  brandTextGroup: {
    flex: 1,
    marginLeft: 12,
  },

  channelName: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
    color: COLORS.text,
  },

  topicName: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primaryDark,
  },

  greetingText: {
    marginTop: 16,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.4,
    color: COLORS.headline,
  },

  greetingSubtitle: {
    marginTop: 8,
    maxWidth: 320,
    fontSize: 13.5,
    lineHeight: 20,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },

  /* CHAT HEADER */

  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  chatHeaderTextGroup: {
    flex: 1,
    marginLeft: 10,
  },

  chatHeaderName: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
  },

  statusRow: {
    marginTop: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
    marginRight: 5,
  },

  statusText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },

  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
    backgroundColor: COLORS.primarySoft,
  },

  backButtonPressed: {
    backgroundColor: COLORS.primaryBorder,
  },

  backButtonIcon: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primaryDark,
  },

  /* CONTENT */

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 18,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
  },

  popularTitle: {
    marginTop: 26,
  },

  sectionSubtitle: {
    marginTop: 3,
    marginBottom: 14,
    fontSize: 12.5,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },

  /* INFO CARD */

  infoCard: {
    marginBottom: 24,
    padding: 16,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,

    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },

  infoCardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  infoCardIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
    backgroundColor: COLORS.primarySoft,
  },

  infoCardIcon: {
    fontSize: 13,
  },

  infoCardTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    color: COLORS.text,
  },

  infoCardText: {
    marginTop: 11,
    fontSize: 12.5,
    lineHeight: 18.5,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },

  infoSteps: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  infoStep: {
    alignItems: "center",
  },

  infoStepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primarySoft,
  },

  infoStepNumber: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.primaryDark,
  },

  infoStepLabel: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },

  infoStepArrow: {
    flex: 1,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.primary,
  },

  /* TOPIC GRID */

  topicGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  topicCardTouchable: {
    width: "48%",
    marginBottom: 12,
  },

  topicCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,

    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },

  topicIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,

    shadowColor: "#101828",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },

  topicIcon: {
    fontSize: 16,
  },

  topicLabel: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: "800",
  },

  /* POPULAR LIST */

  popularList: {
    width: "100%",
  },

  popularRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,

    shadowColor: "#101828",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },

  popularIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  popularIcon: {
    fontSize: 14,
  },

  popularText: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: "600",
    lineHeight: 19,
    color: COLORS.text,
  },

  popularArrow: {
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 8,
  },

  /* ORB */

  orb: {
    overflow: "hidden",
    backgroundColor: COLORS.surface,
  },

  /* MESSAGES */

  userRow: {
    alignItems: "flex-end",
    marginBottom: 16,
    marginTop: 4,
  },

  assistantRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },

  assistantColumn: {
    flex: 1,
  },

  bubble: {
    maxWidth: "84%",
    borderRadius: 18,
    paddingHorizontal: 15,
    paddingVertical: 11,
  },

  userBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,

    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 4,
  },

  userBubbleText: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "500",
    color: "#FFFFFF",
  },

  assistantBubble: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderBottomLeftRadius: 4,
  },

  assistantBubbleError: {
    backgroundColor: COLORS.errorBackground,
    borderColor: COLORS.errorBorder,
  },

  assistantBubbleText: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.text,
  },

  errorText: {
    color: COLORS.errorText,
  },

  /* TYPING */

  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },

  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginRight: 5,
  },

  /* SOURCE CARDS */

  sourceScroll: {
    marginTop: 10,
  },

  sourceScrollContent: {
    paddingRight: 20,
  },

  sourceCard: {
    width: 170,
    marginRight: 10,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",

    shadowColor: "#101828",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  sourceCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 10,
  },

  sourceCardId: {
    fontSize: 10.5,
    fontWeight: "800",
  },

  sourceCardScore: {
    fontSize: 10.5,
    fontWeight: "700",
    color: COLORS.textLight,
  },

  sourceCardContent: {
    paddingHorizontal: 12,
    paddingTop: 5,
    paddingBottom: 12,
    fontSize: 11.5,
    lineHeight: 16,
    color: COLORS.textSecondary,
  },

  /* INPUT */

  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },

  input: {
    flex: 1,
    maxHeight: 110,
    paddingHorizontal: 17,
    paddingVertical: 12,
    fontSize: 15,
    lineHeight: 20,
    color: COLORS.text,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    marginRight: 10,
  },

  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",

    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },

  sendButtonPressed: {
    backgroundColor: COLORS.primaryDark,
  },

  sendButtonDisabled: {
    backgroundColor: COLORS.border,
    shadowOpacity: 0,
    elevation: 0,
  },

  sendButtonIcon: {
    fontSize: 16,
    color: "#FFFFFF",
    marginLeft: -1,
  },

  /* SPLASH */

  splash: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    backgroundColor: COLORS.background,
  },

  splashChannel: {
    marginTop: 20,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
    color: COLORS.text,
    textAlign: "center",
  },

  splashTopic: {
    marginTop: 7,
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primaryDark,
    textAlign: "center",
  },

  splashProgressTrack: {
    marginTop: 34,
    width: 120,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    overflow: "hidden",
  },

  splashProgressFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
  },

  /* CHAT HEADER BRAND */

  chatHeaderBrand: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  /* SUBSCRIBE TOAST */

  subscribeToast: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 92,
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 18,
    backgroundColor: COLORS.text,

    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 8,
  },

  subscribeToastLogo: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },

  subscribeToastTextGroup: {
    flex: 1,
    marginLeft: 10,
  },

  subscribeToastChannel: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  subscribeToastCta: {
    marginTop: 1,
    fontSize: 10.5,
    fontWeight: "500",
    color: "#C7C9D4",
  },

  subscribeButton: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
  },

  subscribeButtonText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  /* GROUNDING STATE */

  assistantBubbleWarning: {
    backgroundColor: COLORS.warningBackground,
    borderColor: COLORS.warningBorder,
  },

  assistantBubbleTextSpaced: {
    marginTop: 8,
  },

  warnBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#FDECC8",
  },

  warnBadgeText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: COLORS.warning,
  },

  groundedBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
  },

  groundedBadgeText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: COLORS.primaryDark,
  },

  /* COMPARE */

  compareCard: {
    padding: 13,
    borderRadius: 16,
    borderWidth: 1,
  },

  compareCardDanger: {
    backgroundColor: COLORS.dangerBackground,
    borderColor: COLORS.dangerBorder,
  },

  compareCardSafe: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
  },

  compareCardSpacing: {
    marginTop: 10,
  },

  compareLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  compareLabelDanger: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.dangerBackground,
  },

  compareLabelDangerText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: COLORS.danger,
  },

  compareLabelSafe: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
  },

  compareLabelSafeText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: COLORS.primaryDark,
  },

  compareAnswerText: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.text,
  },

  /* COMPARE TOGGLE */

  compareToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: COLORS.background,
  },

  compareSwitch: {
    width: 36,
    height: 20,
    borderRadius: 10,
    padding: 2,
    backgroundColor: COLORS.border,
  },

  compareSwitchOn: {
    backgroundColor: COLORS.primary,
  },

  compareSwitchKnob: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
  },

  compareSwitchKnobOn: {
    marginLeft: 16,
  },

  compareToggleLabel: {
    marginLeft: 9,
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },

  /* TRAP QUESTIONS */

  trapRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    backgroundColor: COLORS.warningBackground,
    borderWidth: 1,
    borderColor: COLORS.warningBorder,
    marginBottom: 10,
  },

  trapRowPressed: {
    backgroundColor: "#FDECC8",
  },

  trapIcon: {
    fontSize: 14,
    marginRight: 11,
  },

  trapText: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: "600",
    lineHeight: 19,
    color: COLORS.warning,
  },

  trapArrow: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.warning,
    marginLeft: 8,
  },
});
