import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Text,
  type StyleProp,
  type TextStyle,
} from 'react-native';

/** A number that counts up (or down) to `value`. */
export function AnimatedNumber(props: {
  value: number;
  suffix?: string;
  style?: StyleProp<TextStyle>;
  duration?: number;
}) {
  const animated = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const id = animated.addListener(({ value }) => setShown(Math.round(value)));
    Animated.timing(animated, {
      toValue: props.value,
      duration: props.duration ?? 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => setShown(props.value));
    return () => animated.removeListener(id);
  }, [props.value, props.duration, animated]);

  return (
    <Text style={props.style}>
      {shown}
      {props.suffix ?? ''}
    </Text>
  );
}
