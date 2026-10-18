import { File } from "expo-file-system";

// localhost reaches the Mac only from the iOS Simulator.
// For a physical device, set EXPO_PUBLIC_API_URL to your Mac's LAN IP.
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3005";
const REQUEST_TIMEOUT_MS = 75_000;

export type Attachment = {
  uri: string;
  mimeType: string;
  fileName: string;
};

export type AskResult = {
  answer: string;
  responseId: string;
  contextReset: boolean;
};

export async function ask({
  question,
  image,
  previousResponseId,
}: {
  question: string;
  image?: Attachment;
  previousResponseId?: string;
}): Promise<AskResult> {
  const formData = new FormData();

  if (question) formData.append("question", question);
  if (previousResponseId) formData.append("previousResponseId", previousResponseId);

  if (image) {
    // Since SDK 52, Expo's own fetch is the global fetch on iOS and Android.
    // It rejects React Native's old { uri, name, type } object
    // ("Unsupported FormDataPart implementation"), so we pass a real
    // File, which implements Blob and carries the image's MIME type.
    formData.append("image", new File(image.uri), image.fileName);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    // No Content-Type header: fetch must set the multipart boundary itself.
    response = await fetch(`${API_URL}/api/ask`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });
  } catch (err) {
    console.warn(`[assistant] POST ${API_URL}/api/ask failed:`, err);
    if (controller.signal.aborted) {
      throw new Error("The request timed out. Please try again.");
    }
    throw new Error(
      `Can't reach the server at ${API_URL}. Make sure the backend is running.`,
    );
  } finally {
    clearTimeout(timer);
  }

  // A proxy or crashed server may answer with HTML instead of JSON.
  let data: Partial<AskResult> & { error?: string };
  try {
    data = await response.json();
  } catch {
    throw new Error(`The server sent an unexpected response (${response.status}).`);
  }

  if (!response.ok || typeof data.answer !== "string") {
    throw new Error(data.error || `Request failed (${response.status}).`);
  }

  return {
    answer: data.answer,
    responseId: data.responseId ?? "",
    contextReset: Boolean(data.contextReset),
  };
}
