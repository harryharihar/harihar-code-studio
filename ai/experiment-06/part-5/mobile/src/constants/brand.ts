// "Call" theme for the finished assistant: deep indigo background, violet as the
// assistant's colour, green for call / done, red for end / delete.
// Cream is kept for the logo disc. High contrast so it reads clearly in screen recordings.
export const Brand = {
  bg: "#0B0A14",
  surface: "#151321",
  surfaceRaised: "#1E1B2E",
  border: "#2A2640",
  borderStrong: "#3A3555",

  text: "#F5F3FF",
  textSoft: "#E2DEF5",
  textMuted: "#A39DBF",
  textFaint: "#6B6587",

  violet: "#8B6CFF",
  violetDeep: "#6A4DF0",
  violetSoft: "rgba(139, 108, 255, 0.16)",

  pink: "#FF4F9E",
  pinkSoft: "rgba(255, 79, 158, 0.14)",

  green: "#2DD4A0",
  greenDeep: "#14A97C",
  greenSoft: "rgba(45, 212, 160, 0.14)",

  orange: "#FF9F43",
  orangeDeep: "#F2621B",
  orangeSoft: "rgba(255, 159, 67, 0.14)",

  cream: "#F6F1E7",

  red: "#FF4D5E",
  redSoft: "rgba(255, 77, 94, 0.16)",

  danger: "#FF7A66",
  dangerSoft: "rgba(255, 122, 102, 0.12)",
  dangerBorder: "rgba(255, 122, 102, 0.35)",
} as const;

export const Gradients = {
  violet: `linear-gradient(135deg, ${Brand.violet}, ${Brand.pink})`,
  green: `linear-gradient(135deg, ${Brand.green}, ${Brand.greenDeep})`,
  orange: `linear-gradient(135deg, ${Brand.orange}, ${Brand.orangeDeep})`,
  card: "linear-gradient(135deg, rgba(139, 108, 255, 0.28), rgba(255, 79, 158, 0.16) 60%, rgba(21, 19, 33, 0.9))",
  glow: "linear-gradient(180deg, rgba(139, 108, 255, 0.22), rgba(255, 79, 158, 0.06) 45%, rgba(11, 10, 20, 0))",
} as const;
