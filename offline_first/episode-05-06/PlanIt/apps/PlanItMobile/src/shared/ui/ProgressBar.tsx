import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { Gradient } from './Gradient';

/**
 * Animated gradient progress bar.
 * The fill springs to the new value whenever `progress` (0–1) changes.
 */
export function ProgressBar(props: {
  progress: number;
  colors: readonly string[];
  trackColor: string;
  height?: number;
}) {
  const height = props.height ?? 8;
  const [trackWidth, setTrackWidth] = useState(0);
  const value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(value, {
      toValue: Math.max(0, Math.min(1, props.progress)),
      friction: 8,
      tension: 30,
      useNativeDriver: false,
    }).start();
  }, [props.progress, value]);

  const radius = { borderRadius: height / 2 };

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 0,
        max: 100,
        now: Math.round(props.progress * 100),
      }}
      onLayout={event => setTrackWidth(event.nativeEvent.layout.width)}
      style={[
        styles.track,
        radius,
        { height, backgroundColor: props.trackColor },
      ]}
    >
      <Animated.View
        style={[
          styles.clip,
          radius,
          {
            height,
            width: value.interpolate({
              inputRange: [0, 1],
              outputRange: [0, trackWidth],
            }),
          },
        ]}
      >
        {/* Full-width gradient, revealed by the growing clip: colours don't stretch. */}
        {trackWidth > 0 ? (
          <Gradient
            colors={props.colors}
            style={[radius, { width: trackWidth, height }]}
          />
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { overflow: 'hidden' },
  clip: { overflow: 'hidden' },
});
