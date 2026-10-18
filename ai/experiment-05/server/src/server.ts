import "dotenv/config";
import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import multer from "multer";
import OpenAI from "openai";

const app = express();
const port = Number(process.env.PORT || 3005);
const model = process.env.OPENAI_MODEL || "gpt-5.6";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_QUESTION_CHARS = 1000;
const DEFAULT_IMAGE_QUESTION = "Describe this image.";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is missing from .env");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 60_000,
  maxRetries: 1,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_BYTES,
    files: 1,
  },
});

const INSTRUCTIONS = `You are HCS Assistant, the visual AI assistant in a Harihar Code Studio demo app.

- When the user attaches an image, answer only from what is actually visible in it. Don't add outside facts or look anything up; if the question can't be answered from the image (for example the weather, with a receipt attached), say the image doesn't show that. If the image is blurry, cropped, too small to read, or does not contain what was asked, say that plainly instead of guessing.
- Quote amounts, dates and numbers exactly as they appear. When you read money values from a receipt or document, add one short line suggesting the user double-check before relying on it.
- If the user refers to an image ("this", "the receipt", "in the photo") but no image has been shared in this conversation, tell them to attach one with the + button.
- Without an image, answer as a normal helpful assistant.
- For anything live or recent (weather, news, prices, scores, today's events), use web search and give the actual answer, not advice to look it up. Name the source in plain words (for example "according to AccuWeather"), never as a link or URL. If the user didn't give a needed detail such as a city, ask for it once.
- Reply in plain text only: no Markdown, no asterisks, no headings, no tables. Use short paragraphs, and "•" for lists. Keep answers concise.`;

// MIME types come from the client and can lie, so we also check the file's
// first bytes (its "magic number") before sending it to the model.
const signatures: Record<string, (b: Buffer) => boolean> = {
  "image/jpeg": (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png": (b) =>
    b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  "image/webp": (b) =>
    b.length > 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP",
};

type Content = OpenAI.Responses.ResponseInputContent;

app.use(cors());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "multimodal-ai-api",
    model,
  });
});

app.post("/api/ask", upload.single("image"), async (req, res) => {
  const rawQuestion: unknown = req.body?.question;
  const rawPrevious: unknown = req.body?.previousResponseId;

  if (rawQuestion !== undefined && typeof rawQuestion !== "string") {
    res.status(400).json({ error: "Question must be text." });
    return;
  }

  const question = (rawQuestion ?? "").trim();
  const file = req.file;

  console.log(
    `POST /api/ask · question: ${question.length} chars · image: ${
      file ? `${file.mimetype}, ${(file.size / 1024).toFixed(0)} KB` : "none"
    }`,
  );

  if (!question && !file) {
    res.status(400).json({ error: "Type a question or attach an image." });
    return;
  }

  if (question.length > MAX_QUESTION_CHARS) {
    res.status(400).json({
      error: `Question is too long. Keep it under ${MAX_QUESTION_CHARS} characters.`,
    });
    return;
  }

  if (file) {
    if (/hei[cf]/i.test(file.mimetype)) {
      res.status(415).json({
        error: "HEIC photos aren't supported. Please choose a JPEG, PNG, or WEBP image.",
      });
      return;
    }

    const matchesSignature = signatures[file.mimetype];
    if (!matchesSignature) {
      res.status(415).json({ error: "Please upload a JPEG, PNG, or WEBP image." });
      return;
    }

    if (!matchesSignature(file.buffer)) {
      res.status(415).json({
        error: "This file doesn't look like a valid image. Try a different one.",
      });
      return;
    }
  }

  const previousResponseId =
    typeof rawPrevious === "string" && /^resp_[A-Za-z0-9_-]+$/.test(rawPrevious)
      ? rawPrevious
      : undefined;

  const content: Content[] = [
    {
      type: "input_text",
      text: question || DEFAULT_IMAGE_QUESTION,
    },
  ];

  if (file) {
    content.push({
      type: "input_image",
      image_url: `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
      detail: "high",
    });
  }

  const ask = (previous?: string) =>
    openai.responses.create({
      model,
      instructions: `${INSTRUCTIONS}\n\nToday's date is ${new Date().toDateString()}.`,
      // Text-only questions may use web search for live information
      // (weather, news, prices). With an image attached, the answer must
      // come only from the image, so search is switched off.
      tools: file ? [] : [{ type: "web_search" }],
      input: [{ role: "user", content }],
      ...(previous ? { previous_response_id: previous } : {}),
    });

  try {
    let contextReset = false;
    let response;

    try {
      response = await ask(previousResponseId);
    } catch (error) {
      // An expired or unknown conversation id shouldn't block the user.
      // Retry once as a fresh conversation and tell the app.
      if (previousResponseId && error instanceof OpenAI.APIError && (error.status === 400 || error.status === 404)) {
        contextReset = true;
        response = await ask();
      } else {
        throw error;
      }
    }

    const answer = response.output_text.trim();

    res.json({
      answer: answer || "I couldn't produce an answer for that. Try rephrasing your question.",
      responseId: response.id,
      usedImage: Boolean(file),
      contextReset,
    });
  } catch (error) {
    console.error("Ask failed:", error);
    const { status, message } = describeError(error, Boolean(file));
    res.status(status).json({ error: message });
  }
});

function describeError(error: unknown, hasImage: boolean) {
  if (error instanceof OpenAI.APIConnectionTimeoutError) {
    return { status: 504, message: "The AI took too long to respond. Please try again." };
  }
  if (error instanceof OpenAI.APIConnectionError) {
    return { status: 502, message: "Couldn't reach the AI service. Check the server's internet connection." };
  }
  if (error instanceof OpenAI.APIError) {
    if (error.status === 401 || error.status === 403) {
      return { status: 502, message: "The server's AI key is invalid or lacks access. Check OPENAI_API_KEY." };
    }
    if (error.status === 429) {
      return { status: 503, message: "The AI is busy or the usage quota is reached. Try again in a moment." };
    }
    if (error.status === 400 && hasImage) {
      return { status: 422, message: "The AI couldn't process this image. Try a clearer or smaller photo." };
    }
  }
  return { status: 500, message: "Something went wrong. Please try again." };
}

// Multer rejects oversized or unexpected uploads before the route runs.
// Without this handler Express would answer with an HTML error page.
app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    const tooLarge = err.code === "LIMIT_FILE_SIZE";
    res.status(tooLarge ? 413 : 400).json({
      error: tooLarge ? "Image is too large. The limit is 8 MB." : `Upload error: ${err.message}`,
    });
    return;
  }
  next(err);
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Multimodal AI API running on port ${port} (model: ${model})`);
  console.log(`Health check: http://localhost:${port}/health`);
});
