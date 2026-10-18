// Dark "studio" theme built from the Harihar Code Studio logo:
// ink background, green and orange accents, cream kept for the logo disc.
// High contrast so it reads clearly in screen recordings.
export const Brand = {
  bg: "#0A0E11",
  surface: "#12181C",
  surfaceRaised: "#1A2228",
  border: "#232D34",
  borderStrong: "#2F3B43",

  text: "#F3F6F5",
  textSoft: "#DCE3E0",
  textMuted: "#95A29E",
  textFaint: "#5F6C68",

  green: "#22C08F",
  greenDeep: "#0E8F67",
  greenSoft: "rgba(34, 192, 143, 0.14)",

  orange: "#FF8A1F",
  orangeDeep: "#F2621B",
  orangeSoft: "rgba(255, 138, 31, 0.14)",

  cream: "#F6F1E7",

  danger: "#FF7A66",
  dangerSoft: "rgba(255, 122, 102, 0.12)",
  dangerBorder: "rgba(255, 122, 102, 0.35)",
} as const;

export const Gradients = {
  green: `linear-gradient(135deg, ${Brand.green}, ${Brand.greenDeep})`,
  orange: `linear-gradient(135deg, ${Brand.orange}, ${Brand.orangeDeep})`,
  ring: `linear-gradient(135deg, ${Brand.orange}, ${Brand.green})`,
  glow: "linear-gradient(180deg, rgba(34, 192, 143, 0.20), rgba(255, 138, 31, 0.07) 45%, rgba(10, 14, 17, 0))",
} as const;

export const MAX_QUESTION_CHARS = 1000;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
