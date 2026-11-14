import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { C } from "../src/theme";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.paper } }} />
    </>
  );
}
