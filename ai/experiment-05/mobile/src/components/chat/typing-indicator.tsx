import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { Brand } from "@/constants/brand";

function Dot({ delay, color }: { delay: number; color: string }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withSequence(withTiming(1, { duration: 380 }), withTiming(0, { duration: 380 })),
        -1,
      ),
    );
  }, [delay, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.35 + progress.value * 0.65,
    transform: [{ translateY: -3 * progress.value }],
  }));

  return <Animated.View style={[styles.dot, { backgroundColor: color }, style]} />;
}

export function TypingIndicator({ withImage }: { withImage: boolean }) {
  return (
    <View style={styles.row}>
      <View style={styles.dots}>
        <Dot delay={0} color={Brand.green} />
        <Dot delay={140} color={Brand.orange} />
        <Dot delay={280} color={Brand.green} />
      </View>
      <Text style={styles.label}>
        {withImage ? "Looking at your image…" : "Thinking…"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dots: {
    flexDirection: "row",
    gap: 5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  label: {
    color: Brand.textMuted,
    fontSize: 13,
  },
});
