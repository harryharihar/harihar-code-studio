// Plays the assistant's voice: base64 from the server → temporary MP3 file →
// expo-audio player → tells the screen when it has finished.
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { File, Paths } from "expo-file-system";

let current: { player: AudioPlayer; file: File } | null = null;

// "SUQz..." → bytes, with no extra library.
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function base64ToBytes(b64: string) {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, "");
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let o = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const n = (B64.indexOf(clean[i]) << 18) | (B64.indexOf(clean[i + 1]) << 12) |
      ((B64.indexOf(clean[i + 2]) & 63) << 6) | (B64.indexOf(clean[i + 3]) & 63);
    out[o++] = (n >> 16) & 255;
    if (i + 2 < clean.length) out[o++] = (n >> 8) & 255;
    if (i + 3 < clean.length) out[o++] = n & 255;
  }
  return out.subarray(0, o);
}

// onDone: the voice finished (or there was no voice), so the screen moves on.
export async function playReply(audio: string | null | undefined, onDone: () => void) {
  stopSpeaking();
  if (!audio) { onDone(); return; } // no voice this time; the card is already on screen
  try {
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }); // loudspeaker
    const file = new File(Paths.cache, `reply-${Date.now()}.mp3`);
    file.create({ overwrite: true });
    await file.write(base64ToBytes(audio)); // write() is async in SDK 58

    const player = createAudioPlayer({ uri: file.uri });
    current = { player, file };
    player.addListener("playbackStatusUpdate", (status) => {
      if (status.didJustFinish) { cleanUp(); onDone(); } // the loop needs to know
    });
    player.play();
  } catch {
    cleanUp();
    onDone();
  }
}

function cleanUp() {
  if (!current) return;
  const { player, file } = current;
  current = null;
  player.remove();
  try { file.delete(); } catch {}
}

// Mic tapped while the assistant is talking: stop at once (does NOT call onDone).
export function stopSpeaking() {
  if (current) current.player.pause();
  cleanUp();
}
