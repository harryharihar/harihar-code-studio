import { useId, useState, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

/** A View with a diagonal linear-gradient background (drawn with react-native-svg). */
export function Gradient(props: {
  colors: readonly string[];
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  testID?: string;
}) {
  const id = `g${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const last = props.colors.length - 1;
  // Measure the box so the SVG is drawn at its exact size.
  const [size, setSize] = useState({ width: 0, height: 0 });

  return (
    <View
      style={[styles.clip, props.style]}
      testID={props.testID}
      onLayout={event => {
        const { width, height } = event.nativeEvent.layout;
        setSize(current =>
          current.width === width && current.height === height
            ? current
            : { width, height },
        );
      }}
    >
      {size.width > 0 ? (
        <Svg
          style={StyleSheet.absoluteFill}
          width={size.width}
          height={size.height}
        >
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
              {props.colors.map((color, index) => (
                <Stop
                  key={color + index}
                  offset={last === 0 ? 0 : index / last}
                  stopColor={color}
                />
              ))}
            </LinearGradient>
          </Defs>
          <Rect
            x="0"
            y="0"
            width={size.width}
            height={size.height}
            fill={`url(#${id})`}
          />
        </Svg>
      ) : null}
      {props.children}
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden', backgroundColor: 'transparent' },
});
