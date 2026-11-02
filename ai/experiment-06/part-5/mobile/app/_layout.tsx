import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)/index" />
        <Stack.Screen name="live" options={{ animation: "slide_from_bottom" }} />
      </Stack>
    </>
  );
}
