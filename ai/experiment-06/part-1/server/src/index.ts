import "dotenv/config";
import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import multer from "multer";
import OpenAI, { toFile } from "openai";

const app = express();
const port = Number(process.env.PORT || 3006);

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is missing from .env");
}
if (!process.env.TRANSCRIBE_MODEL) {
  throw new Error("TRANSCRIBE_MODEL is missing from .env");
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

app.use(cors());

// One line per request, e.g. "POST /api/transcribe 200 · 1840 ms"
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
    service: "voice-stt-api",
    model: process.env.TRANSCRIBE_MODEL,
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
    const result = await openai.audio.transcriptions.create({
      file: await toFile(req.file.buffer, "voice.m4a"),
      model: process.env.TRANSCRIBE_MODEL!,
      prompt: PROMPT,
    });
    res.json({ text: result.text });
  } catch (err) {
    next(err);
  }
});

// Multer rejects oversized uploads before the route runs, and the route
// passes OpenAI failures here. Without this handler Express would answer
// with an HTML error page.
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    res.status(413).json({ error: "File too big (max 25 MB)." });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Transcription failed. Try again." });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Server on http://localhost:${port} (model: ${process.env.TRANSCRIBE_MODEL})`);
});
