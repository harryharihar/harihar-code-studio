/**
 * PlanIt — projects & tasks, built offline-first.
 */

import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppNavigator } from './src/app/navigation';
import { useTheme } from './src/shared/ui/theme';

function App() {
  const theme = useTheme();
  return (
    <SafeAreaProvider>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />
      <AppNavigator />
    </SafeAreaProvider>
  );
}

export default App;
