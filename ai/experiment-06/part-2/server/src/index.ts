import "dotenv/config";
import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import multer from "multer";
import OpenAI, { toFile } from "openai";

import { nowInIndia, readContext, understand } from "./assistant";

const app = express();
const port = Number(process.env.PORT || 3006);

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is missing from .env");
}
if (!process.env.TRANSCRIBE_MODEL) {
  throw new Error("TRANSCRIBE_MODEL is missing from .env");
}
if (!process.env.ASSISTANT_MODEL) {
  throw new Error("ASSISTANT_MODEL is missing from .env");
}

const openai = new OpenAI(); // key .env se, sirf server par

const upload = multer({
  storage: multer.memoryStorage(), // disk par save nahi
  limits: { fileSize: 25 * 1024 * 1024, files: 1 }, // 25 MB, OpenAI ki limit
});

// Spoken Hindi and Urdu sound the same, so without a hint the model may
// write Hindi in Devanagari or even Urdu script. This keeps it in Roman
// Hinglish, with numbers as digits ("9 baje").
const PROMPT =
  "Hinglish voice note for Harihar Code Studio. Write Hindi words in Roman (English) letters, " +
  "never in Devanagari or Urdu script. Write numbers as digits. " +
  "Example: Kal subah 9 baje client ko call karna hai.";

// MIME types come from the client and can lie, so we also check the file's
// first bytes. An m4a file says "ftyp" at bytes 4–8.
function isAudio(file: Express.Multer.File) {
  const mimeOk = file.mimetype.startsWith("audio/");
  const bytesOk = file.buffer.length > 8 && file.buffer.toString("ascii", 4, 8) === "ftyp";
  return mimeOk && bytesOk;
}

// Part 1: voice → text.
async function transcribeAudio(buffer: Buffer) {
  const result = await openai.audio.transcriptions.create({
    file: await toFile(buffer, "voice.m4a"),
    model: process.env.TRANSCRIBE_MODEL!,
    prompt: PROMPT,
  });
  return result.text;
}

app.use(cors());
app.use(express.json({ limit: "10kb" }));

// One line per request, e.g. "POST /api/voice-assistant 200 · 3120 ms"
app.use((req, res, next) => {
  const started = Date.now();
  res.on("finish", () => {
    console.log(`${req.method} ${req.path} ${res.statusCode} · ${Date.now() - started} ms`);
  });
  next();
});

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "voice-assistant-api",
    models: { stt: process.env.TRANSCRIBE_MODEL, assistant: process.env.ASSISTANT_MODEL },
  });
});

app.post("/api/transcribe", upload.single("audio"), async (req, res, next) => {
  if (!req.file) {
    res.status(400).json({ error: "No audio file." });
    return;
  }
  if (!isAudio(req.file)) {
    res.status(415).json({ error: "Only audio files are allowed." });
    return;
  }

  try {
    res.json({ text: await transcribeAudio(req.file.buffer) });
  } catch (err) {
    next(err);
  }
});

// Text in, action out. Lets us test the assistant with curl, no mic needed.
app.post("/api/assistant", async (req, res, next) => {
  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  if (!text) { res.status(400).json({ error: "Text is required." }); return; }
  if (text.length > 1000) { res.status(413).json({ error: "Text too long." }); return; }
  try { res.json({ text, action: await understand(text, readContext(req.body)) }); }
  catch (err) { next(err); }
});

// What the app calls: audio in, then text and action out, in one trip.
app.post("/api/voice-assistant", upload.single("audio"), async (req, res, next) => {
  if (!req.file) {
    res.status(400).json({ error: "No audio file." });
    return;
  }
  if (!isAudio(req.file)) {
    res.status(415).json({ error: "Only audio files are allowed." });
    return;
  }

  try {
    const text = await transcribeAudio(req.file.buffer); // Part 1
    if (!text.trim()) {
      res.json({ text, action: null }); // silence: nothing to understand
      return;
    }
    res.json({ text, action: await understand(text, readContext(req.body)) });
  } catch (err) {
    next(err);
  }
});

// Multer rejects oversized uploads and express.json rejects broken JSON
// before the routes run, and the routes pass OpenAI failures here. Without
// this handler Express would answer with an HTML error page.
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    res.status(413).json({ error: "File too big (max 25 MB)." });
    return;
  }
  if (err.type === "entity.parse.failed") {
    res.status(400).json({ error: "Invalid JSON." });
    return;
  }
  if (err.type === "entity.too.large") {
    res.status(413).json({ error: "Text too long." });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong. Try again." });
});

app.listen(port, "0.0.0.0", () => {
  const now = nowInIndia();
  console.log(
    `Server on http://localhost:${port} ` +
      `(stt: ${process.env.TRANSCRIBE_MODEL}, assistant: ${process.env.ASSISTANT_MODEL})`,
  );
  console.log(`Today is ${now.weekday}, ${now.date} (IST)`);
});
