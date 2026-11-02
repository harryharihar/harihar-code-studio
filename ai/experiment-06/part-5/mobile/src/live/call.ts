// Part 5: the live call. Mic → OpenAI and OpenAI → speaker, both over WebRTC.
// No recording file, no upload, no waiting: audio flows both ways while you talk.
import InCallManager from "react-native-incall-manager";
import { mediaDevices, RTCPeerConnection } from "react-native-webrtc";

import { getLiveSecret } from "@/api/live";

export type CallState = "connecting" | "listening" | "thinking" | "speaking";

export type CallHandlers = {
  onState: (state: CallState) => void;
  onLine: (who: "you" | "ai", text: string) => void;
  onTool: (name: string, args: any) => Promise<object>; // the phone does what the assistant asks
  onError: (message: string) => void;
};

export type Call = { stop: () => void; mute: (on: boolean) => void };

export async function startCall(h: CallHandlers): Promise<Call> {
  const secret = await getLiveSecret(); // 1. short-lived key from our server

  InCallManager.start({ media: "audio" });
  InCallManager.setForceSpeakerphoneOn(true); // WebRTC defaults to the earpiece

  // 2. the mic goes into the call
  const mic = await mediaDevices.getUserMedia({ audio: true, video: false });
  const pc = new RTCPeerConnection();
  mic.getTracks().forEach((track) => pc.addTrack(track, mic));

  // 3. events (text, tool calls) travel on this channel; the voice itself needs no code,
  //    the assistant's audio plays through the speaker by itself
  const channel = pc.createDataChannel("oai-events");
  const send = (event: object) => channel.send(JSON.stringify(event));

  const seen = new Set<string>();
  async function runCall(item: { call_id: string; name: string; arguments: string }) {
    if (seen.has(item.call_id)) return; // each call is handled once
    seen.add(item.call_id);
    let output: object;
    try {
      output = await h.onTool(item.name, JSON.parse(item.arguments || "{}"));
    } catch {
      output = { ok: false, error: "The tool failed." };
    }
    send({ type: "conversation.item.create", item: { type: "function_call_output", call_id: item.call_id, output: JSON.stringify(output) } });
    send({ type: "response.create" }); // now speak, using the result
  }

  channel.addEventListener("open", () => {
    h.onState("listening");
    send({ type: "response.create", response: { instructions: "Greet the user in one short Hindi sentence, then wait." } });
  });

  channel.addEventListener("message", (e) => {
    if (typeof e.data !== "string") return; // OpenAI sends JSON text
    let ev: any;
    try { ev = JSON.parse(e.data); } catch { return; }

    switch (ev.type) {
      case "input_audio_buffer.speech_started": h.onState("listening"); break;
      case "input_audio_buffer.speech_stopped": h.onState("thinking"); break;
      case "output_audio_buffer.started": h.onState("speaking"); break;
      case "output_audio_buffer.stopped":
      case "output_audio_buffer.cleared": h.onState("listening"); break; // interrupted or finished
      case "conversation.item.input_audio_transcription.completed":
        if (ev.transcript?.trim()) h.onLine("you", ev.transcript.trim());
        break;
      case "response.output_audio_transcript.done":
      case "response.audio_transcript.done":
        if (ev.transcript?.trim()) h.onLine("ai", ev.transcript.trim());
        break;
      case "response.output_item.done":
        if (ev.item?.type === "function_call") runCall(ev.item);
        break;
      case "error":
        h.onError(ev.error?.message ?? "Something went wrong in the call.");
        break;
    }
  });

  pc.addEventListener("connectionstatechange", () => {
    if (pc.connectionState === "failed") h.onError("The call dropped. Check your internet and try again.");
  });

  // 4. offer → OpenAI → answer. After this the call is live.
  const offer = await pc.createOffer({});
  await pc.setLocalDescription(offer);
  const res = await fetch("https://api.openai.com/v1/realtime/calls", {
    method: "POST",
    body: offer.sdp,
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/sdp" },
  });
  if (!res.ok) throw new Error(`Couldn't connect the call (${res.status}).`);
  await pc.setRemoteDescription({ type: "answer", sdp: await res.text() });

  return {
    mute: (on) => mic.getAudioTracks().forEach((t) => { t.enabled = !on; }),
    stop: () => {
      try { channel.close(); } catch {}
      pc.close();
      mic.getTracks().forEach((t) => t.stop());
      InCallManager.stop();
    },
  };
}
