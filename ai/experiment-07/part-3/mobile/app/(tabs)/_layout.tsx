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
        name="run"
        options={{ title: "Run", tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "play-circle" : "play-circle-outline"} color={color as string} size={size} /> }}
      />
      <Tabs.Screen
        name="party"
        options={{ title: "Party", tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "gift" : "gift-outline"} color={color as string} size={size} /> }}
      />
    </Tabs>
  );
}
