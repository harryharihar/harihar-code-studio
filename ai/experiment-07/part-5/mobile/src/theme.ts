import { Platform } from "react-native";

// Part 5: "Agent console" theme. Dark, like a control room, with a colour for every kind of agent moment:
// violet = the agent (thinking, its main colour) · cyan = acting · green = done · amber = it asks you · red = blocked / declined.
// (The old names stay, so every screen keeps working: "orange" is now the agent's violet, "indigo" is cyan.)
export const C = {
  paper: "#070A13",
  paperDeep: "#121829",
  card: "#0E1424",
  ink: "#EAF0FF",
  inkSoft: "#B6C0DA",
  muted: "#7D88A6",
  faint: "#4E5875",
  line: "#1F2840",

  orange: "#A78BFA",
  orangeSoft: "#231B45",
  green: "#34D399",
  greenSoft: "#0D2B23",
  indigo: "#22D3EE",
  indigoSoft: "#0A2830",
  plum: "#F472B6",
  plumSoft: "#331328",
  red: "#F87171",
  redSoft: "#34151A",
  amber: "#FBBF24",
  amberSoft: "#2E2310",
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

// Part 3: the execution loop. Each step our code adds around the model has its own colour.
Object.assign(KIND, {
  think: { label: "DECIDE", title: "Agent decides", meaning: "Picks the next move", color: C.indigo, soft: C.indigoSoft, icon: "bulb" },
  act: { label: "ACT", title: "Uses a tool", meaning: "Places an order", color: C.orange, soft: C.orangeSoft, icon: "flash" },
  observe: { label: "RESULT", title: "Tool answered", meaning: "", color: C.inkSoft, soft: C.paperDeep, icon: "eye" },
  retry: { label: "RETRY", title: "Trying again", meaning: "No answer gets another try", color: C.plum, soft: C.plumSoft, icon: "refresh" },
  verify: { label: "VERIFY", title: "Checked the order list", meaning: "Read it back, then trust it", color: C.green, soft: C.greenSoft, icon: "shield-checkmark" },
  guard: { label: "GUARD", title: "Loop guard", meaning: "", color: C.red, soft: C.redSoft, icon: "hand-left" },
  budget: { label: "STOP", title: "Stopped in time", meaning: "", color: C.red, soft: C.redSoft, icon: "stopwatch" },
});

// Part 4: memory and state.
Object.assign(KIND, {
  memory: { label: "MEMORY", title: "Memory", meaning: "Notes kept for every plan", color: "#0E7C86", soft: "#DDF1F2", icon: "bookmark" },
  resume: { label: "RESUME", title: "Resumed", meaning: "Back from the last checkpoint", color: C.indigo, soft: C.indigoSoft, icon: "play-forward" },
  approval: { label: "ASK", title: "Your OK", meaning: "Your rule, your answer", color: "#B45309", soft: "#FDEBC8", icon: "hand-left" },
});

export const LOOP = ["think", "act", "retry", "verify"] as const;
// which arc of the dial lights up for each event
export const LOOP_OF: Record<string, (typeof LOOP)[number]> = { think: "think", act: "act", observe: "act", retry: "retry", verify: "verify" };
