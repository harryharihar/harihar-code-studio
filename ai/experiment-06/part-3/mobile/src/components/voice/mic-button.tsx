import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { Brand, Gradients } from "@/constants/brand";

const SIZE = 96;

type Props = {
  recording: boolean;
  uploading: boolean;
  speaking: boolean;
  onPress: () => void;
};

// Green mic when idle, red stop square while recording, spinner while uploading,
// orange hand while the assistant speaks (tap to interrupt).
// A soft ring pulses around the button while the mic is live.
export function MicButton({ recording, uploading, speaking, onPress }: Props) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (recording) {
      pulse.value = withRepeat(withTiming(1, { duration: 1100 }), -1, false);
    } else {
      cancelAnimation(pulse);
      pulse.value = 0;
    }
  }, [recording, pulse]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.55 * (1 - pulse.value),
    transform: [{ scale: 1 + pulse.value * 0.55 }],
  }));

  return (
    <View style={styles.wrap}>
      {recording && <Animated.View pointerEvents="none" style={[styles.ring, ringStyle]} />}

      <Pressable
        onPress={onPress}
        disabled={uploading}
        accessibilityRole="button"
        accessibilityLabel={
          recording ? "Stop recording" : speaking ? "Stop the assistant and speak" : "Start recording"
        }
        style={({ pressed }) => [
          styles.button,
          recording ? styles.recording : speaking ? styles.speaking : styles.idle,
          uploading && styles.uploading,
          pressed && styles.pressed,
        ]}
      >
        {uploading ? (
          <ActivityIndicator color={Brand.text} />
        ) : recording ? (
          <View style={styles.stopSquare} />
        ) : speaking ? (
          <Ionicons name="hand-left" size={38} color="#2A1405" />
        ) : (
          <Ionicons name="mic" size={40} color="#06130E" />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: SIZE * 1.7,
    height: SIZE * 1.7,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: Brand.red,
  },
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  idle: {
    experimental_backgroundImage: Gradients.green,
    boxShadow: "0 0 28px rgba(34, 192, 143, 0.45)",
  },
  recording: {
    backgroundColor: Brand.red,
    boxShadow: "0 0 28px rgba(255, 77, 94, 0.55)",
  },
  speaking: {
    experimental_backgroundImage: Gradients.orange,
    boxShadow: "0 0 28px rgba(255, 138, 31, 0.5)",
  },
  uploading: {
    experimental_backgroundImage: "none",
    backgroundColor: Brand.surfaceRaised,
    borderWidth: 1,
    borderColor: Brand.borderStrong,
    boxShadow: "none",
  },
  pressed: {
    transform: [{ scale: 0.95 }],
  },
  stopSquare: {
    width: 30,
    height: 30,
    borderRadius: 7,
    backgroundColor: Brand.text,
  },
});
