import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { C } from "../../src/theme";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.orange,
        tabBarInactiveTintColor: C.muted,
        tabBarLabelStyle: { fontWeight: "800", fontSize: 11 },
        tabBarStyle: { backgroundColor: C.card, borderTopColor: C.line },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Mission", tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "rocket" : "rocket-outline"} color={color as string} size={size} /> }}
      />
      <Tabs.Screen
        name="calendar"
        options={{ title: "My Plan", tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "calendar" : "calendar-outline"} color={color as string} size={size} /> }}
      />
    </Tabs>
  );
}
