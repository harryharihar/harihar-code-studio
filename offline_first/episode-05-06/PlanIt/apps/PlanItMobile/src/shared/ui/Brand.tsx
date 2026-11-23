import { Image, StyleSheet, Text, View } from 'react-native';

export const BRAND_NAME = 'Harihar Code Studio';

/** Brand gradient: indigo → violet → pink. */
export const brandGradient = ['#4F46E5', '#7C3AED', '#DB2777'] as const;

const logo = require('../../assets/hcs-logo.png');

/** The channel logo on its own. */
export function BrandLogo({ size = 32 }: { size?: number }) {
  return <Image source={logo} style={{ width: size, height: size }} />;
}

/** Channel logo + studio name. `tone="light"` for use on the gradient. */
export function BrandMark({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const light = tone === 'light';
  return (
    <View style={styles.row} accessible accessibilityLabel={BRAND_NAME}>
      <Image source={logo} style={styles.logo} />
      <Text
        style={[styles.name, light ? styles.nameOnLight : styles.nameOnDark]}
      >
        {BRAND_NAME.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 32, height: 32 },
  name: { fontSize: 11, fontWeight: '800', letterSpacing: 1.6 },
  nameOnLight: { color: 'rgba(255,255,255,0.95)' },
  nameOnDark: { color: '#7C3AED' },
});
