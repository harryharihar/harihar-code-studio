import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReceiptScreen from './src/screens/ReceiptScreen';

export default function App() {
  return (
    <SafeAreaProvider>
      <ReceiptScreen />
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
