import { Platform } from "react-native";

// "Planner paper" theme, taken from the Harihar Code Studio logo: its cream as paper,
// its charcoal as ink, its orange and green as the two accents. Light, warm, easy to read on video.
export const C = {
  paper: "#F6F0E4",
  paperDeep: "#EDE4D3",
  card: "#FFFCF6",
  ink: "#1C1915",
  inkSoft: "#47413A",
  muted: "#857B6C",
  faint: "#B3A893",
  line: "#E3D8C5",

  orange: "#E2570F",
  orangeSoft: "#FBE3D3",
  green: "#0E8558",
  greenSoft: "#DCEFE4",
  indigo: "#3B4BD1",
  indigoSoft: "#E2E5FA",
  plum: "#9A2C77",
  plumSoft: "#F5E0EE",
  red: "#CF3636",
  redSoft: "#F9E0DE",
} as const;

export const F = {
  serif: Platform.select({ ios: "Georgia", default: "serif" }),
  mono: Platform.select({ ios: "Menlo", default: "monospace" }),
};

// The planning engine in plain words: what each step means, so a viewer understands it at a glance.
export const KIND: Record<string, { label: string; title: string; meaning: string; color: string; soft: string; icon: string }> = {
  goal: { label: "GOAL", title: "You asked", meaning: "", color: C.ink, soft: C.paperDeep, icon: "person" },
  ask: { label: "ASK", title: "Model makes a plan", meaning: "The model fills our schema", color: C.indigo, soft: C.indigoSoft, icon: "bulb" },
  check: { label: "CHECK", title: "Our code checks it", meaning: "Our code tests the plan", color: C.orange, soft: C.orangeSoft, icon: "shield-checkmark" },
  repair: { label: "REPAIR", title: "Model fixes it", meaning: "Problems go back, it fixes", color: C.plum, soft: C.plumSoft, icon: "construct" },
  order: { label: "ORDER", title: "Order decided", meaning: "Dependencies come first", color: C.green, soft: C.greenSoft, icon: "git-network" },
  final: { label: "DONE", title: "Plan ready", meaning: "", color: C.green, soft: C.greenSoft, icon: "checkmark-done" },
  error: { label: "ERROR", title: "Planner stopped", meaning: "", color: C.red, soft: C.redSoft, icon: "alert-circle" },
};

export const STEPS = ["ask", "check", "repair", "order"] as const;
