import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  type Theme as NavigationTheme,
} from '@react-navigation/native';
import {
  createNativeStackNavigator,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack';

import { HomeScreen } from '../features/projects/screens/HomeScreen';
import { NewProjectScreen } from '../features/projects/screens/NewProjectScreen';
import { TaskEditorScreen } from '../features/tasks/screens/TaskEditorScreen';
import { TaskListScreen } from '../features/tasks/screens/TaskListScreen';
import { TaskOverviewScreen } from '../features/tasks/screens/TaskOverviewScreen';
import { useTheme } from '../shared/ui/theme';

/** Tabs of the cross-project task overview. */
export type OverviewView = 'all' | 'active' | 'today' | 'done';

/** Every screen and the params it needs. Wrong params = compile error. */
export type RootStackParamList = {
  Home: undefined;
  Tasks: { projectId: string; projectName: string };
  TaskEditor: { projectId: string; taskId?: string }; // no taskId = create, taskId = edit
  NewProject: undefined;
  Overview: { view: OverviewView };
};

/** Typed props for a screen: `function TaskListScreen({ route, navigation }: ScreenProps<'Tasks'>)` */
export type ScreenProps<Name extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, Name>;

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const theme = useTheme();
  const base = theme.dark ? DarkTheme : DefaultTheme;
  const navigationTheme: NavigationTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: theme.primary,
      background: theme.background,
      card: theme.background,
      text: theme.text,
      border: theme.border,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShadowVisible: false,
          headerTintColor: theme.primary,
          headerTitleStyle: { color: theme.text },
          headerStyle: { backgroundColor: theme.background },
          contentStyle: { backgroundColor: theme.background },
        }}
      >
        {/* Normal screens: push from the right, with a back button */}
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false, title: 'Projects' }}
        />
        <Stack.Screen
          name="Tasks"
          component={TaskListScreen}
          options={({ route }) => ({
            title: route.params.projectName,
            headerBackButtonDisplayMode: 'minimal',
          })}
        />

        <Stack.Screen
          name="Overview"
          component={TaskOverviewScreen}
          options={{ headerBackButtonDisplayMode: 'minimal' }}
        />

        {/* Bottom sheets: only as tall as their content, with a grabber */}
        <Stack.Group
          screenOptions={{
            presentation: 'formSheet',
            headerShown: false,
            sheetAllowedDetents: 'fitToContents',
            sheetGrabberVisible: true,
            sheetCornerRadius: 28,
            contentStyle: { backgroundColor: theme.surface },
          }}
        >
          <Stack.Screen name="TaskEditor" component={TaskEditorScreen} />
          <Stack.Screen name="NewProject" component={NewProjectScreen} />
        </Stack.Group>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
