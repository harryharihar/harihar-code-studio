import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gradients, Theme, mono } from '../constants/theme';
import { ApiError, categorizeReceipt, type Category, type ReceiptResult } from '../services/receiptApi';

const logo = require('../../assets/hcs-logo.png');

type Status = 'idle' | 'loading' | 'success' | 'error';

const CATEGORY_ICON: Record<Category, string> = {
  'Food & Dining': '🍽️',
  Travel: '✈️',
  Shopping: '🛍️',
  'Bills & Utilities': '💡',
  Health: '💊',
  Entertainment: '🎬',
  Other: '📦',
};

function formatAmount(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

export default function ReceiptScreen() {
  const [text, setText] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<ReceiptResult | null>(null);
  const [error, setError] = useState('');

  const loading = status === 'loading';
  const canSubmit = !loading && text.trim().length >= 5;

  async function onCategorize() {
    // Blocks a double tap from sending two paid requests.
    if (loading) return;

    setStatus('loading');
    setError('');
    try {
      const data = await categorizeReceipt(text);
      setResult(data);
      setStatus('success');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      setStatus('error');
    }
  }

  return (
    <View style={styles.screen}>
      <View pointerEvents="none" style={styles.glow} />

      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.logoDisc}>
          <Image source={logo} style={styles.logo} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.brand}>Harihar Code Studio</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, loading && styles.statusDotBusy]} />
            <Text style={styles.status}>AI Receipt Categorizer</Text>
          </View>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>AI DEMO</Text>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Paste a receipt,{'\n'}AI finds the category.</Text>
          <Text style={styles.subtitle}>
            Swiggy bill, Uber ride, bank SMS — anything with an amount.
          </Text>

          <View style={styles.inputCard}>
            <TextInput
              style={styles.input}
              multiline
              maxLength={4000}
              placeholder="e.g. Swiggy order #4821 · Paneer Biryani · Total ₹349 · 12 Oct 2026"
              placeholderTextColor={Theme.inkFaint}
              selectionColor={Theme.saffron}
              value={text}
              onChangeText={setText}
              editable={!loading}
              textAlignVertical="top"
            />
            <View style={styles.inputFooter}>
              {text.length > 0 && !loading ? (
                <Pressable onPress={() => setText('')} hitSlop={8}>
                  <Text style={styles.clear}>Clear</Text>
                </Pressable>
              ) : (
                <View />
              )}
              <Text style={styles.counter}>{text.length} / 4000</Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.button,
              !canSubmit && styles.buttonDisabled,
              pressed && styles.buttonPressed,
            ]}
            onPress={onCategorize}
            disabled={!canSubmit}
          >
            {loading ? (
              <View style={styles.buttonRow}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.buttonText}>Reading receipt…</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>Categorize</Text>
            )}
          </Pressable>

          {status === 'error' && (
            <View style={styles.errorBox}>
              <Text style={styles.errorTitle}>Couldn't categorize</Text>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable style={styles.retry} onPress={onCategorize}>
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          )}

          {status === 'success' && result && <ResultCard result={result} />}

          <Text style={styles.footer}>Built on Harihar Code Studio · YouTube</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function ResultCard({ result }: { result: ReceiptResult }) {
  const percent = Math.round(result.confidence * 100);
  const barColor = percent >= 75 ? Theme.teal : percent >= 40 ? Theme.amber : Theme.red;

  return (
    <View style={styles.card}>
      <Text style={styles.receiptHead}>*** AI RECEIPT ***</Text>
      <View style={styles.tear} />

      <View style={styles.cardTop}>
        <View style={styles.chip}>
          <Text style={styles.chipText}>
            {CATEGORY_ICON[result.category]}  {result.category}
          </Text>
        </View>
        <Text style={styles.date}>{result.date ?? 'No date'}</Text>
      </View>

      <Text style={styles.merchant}>{result.merchant || 'Unknown merchant'}</Text>
      <Text style={styles.amount}>{formatAmount(result.amount, result.currency)}</Text>

      <View style={styles.tear} />

      <Text style={styles.noteLabel}>WHY THIS CATEGORY</Text>
      <Text style={styles.note}>{result.note}</Text>

      <View style={styles.confidenceRow}>
        <Text style={styles.noteLabel}>CONFIDENCE</Text>
        <Text style={[styles.confidenceValue, { color: barColor }]}>{percent}%</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${percent}%`, backgroundColor: barColor }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Theme.bg },
  flex: { flex: 1 },
  glow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 380,
    experimental_backgroundImage: Gradients.glow,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.paperEdge,
  },
  logoDisc: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Theme.paper,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Theme.saffron,
  },
  logo: { width: 40, height: 40 },
  headerText: { flex: 1 },
  brand: { color: Theme.ink, fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Theme.teal },
  statusDotBusy: { backgroundColor: Theme.saffron },
  status: { color: Theme.inkMuted, fontSize: 13 },
  badge: {
    backgroundColor: Theme.ink,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: { color: Theme.paper, fontSize: 11, fontWeight: '800', letterSpacing: 1, fontFamily: mono },

  content: { padding: 20, paddingBottom: 40 },
  title: { color: Theme.ink, fontSize: 27, fontWeight: '800', lineHeight: 33, letterSpacing: -0.5 },
  subtitle: { color: Theme.inkMuted, fontSize: 15, marginTop: 8, marginBottom: 20, lineHeight: 21 },

  inputCard: {
    backgroundColor: Theme.paper,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Theme.dash,
    borderRadius: 16,
    padding: 14,
  },
  input: { minHeight: 140, fontSize: 14, lineHeight: 21, color: Theme.ink, padding: 0, fontFamily: mono },
  inputFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  clear: { color: Theme.saffron, fontSize: 13, fontWeight: '700' },
  counter: { color: Theme.inkFaint, fontSize: 12, fontFamily: mono },

  button: {
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    experimental_backgroundImage: Gradients.saffron,
    boxShadow: '0 8px 20px rgba(242, 98, 27, 0.30)',
  },
  buttonDisabled: { opacity: 0.4, boxShadow: 'none' },
  buttonPressed: { opacity: 0.85 },
  buttonRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  errorBox: {
    backgroundColor: Theme.redSoft,
    borderColor: Theme.redBorder,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginTop: 20,
  },
  errorTitle: { color: Theme.red, fontSize: 15, fontWeight: '800' },
  errorText: { color: Theme.inkSoft, fontSize: 14, marginTop: 4, lineHeight: 20 },
  retry: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: Theme.red,
  },
  retryText: { color: '#fff', fontWeight: '700' },

  card: {
    backgroundColor: Theme.paper,
    borderRadius: 6,
    padding: 20,
    marginTop: 22,
    borderWidth: 1,
    borderColor: Theme.paperEdge,
    boxShadow: '0 10px 28px rgba(29, 27, 24, 0.10)',
  },
  receiptHead: {
    color: Theme.inkMuted,
    fontFamily: mono,
    fontSize: 12,
    letterSpacing: 2,
    textAlign: 'center',
  },
  tear: {
    borderBottomWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Theme.dash,
    marginVertical: 14,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chip: {
    backgroundColor: Theme.tealSoft,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  chipText: { color: Theme.teal, fontWeight: '800', fontSize: 13 },
  date: { color: Theme.inkMuted, fontSize: 13, fontFamily: mono },
  merchant: { color: Theme.inkSoft, fontSize: 17, fontWeight: '600', marginTop: 16 },
  amount: { color: Theme.ink, fontSize: 32, fontWeight: '700', marginTop: 4, fontFamily: mono, letterSpacing: -1 },
  noteLabel: { color: Theme.inkFaint, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, fontFamily: mono },
  note: { color: Theme.inkSoft, fontSize: 15, lineHeight: 21, marginTop: 6 },
  confidenceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18 },
  confidenceValue: { fontSize: 13, fontWeight: '800', fontFamily: mono },
  barTrack: { height: 8, backgroundColor: Theme.bg, borderRadius: 999, marginTop: 8, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 999 },

  footer: { color: Theme.inkFaint, fontSize: 12, textAlign: 'center', marginTop: 28 },
});
