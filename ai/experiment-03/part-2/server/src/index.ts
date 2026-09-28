import "dotenv/config";

import express from "express";

import { runToolCalling } from "./ai/runToolCalling";

const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    experiment: "03",
    part: "2",
    topic: "advanced-tool-calling",
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (
      !prompt ||
      typeof prompt !== "string"
    ) {
      return res.status(400).json({
        error:
          "prompt is required",
      });
    }

    const response =
      await runToolCalling(
        prompt.trim(),
      );

    return res.json({
      response,
    });
  } catch (error) {
    console.error(
      "Chat error:",
      error,
    );

    return res.status(500).json({
      error:
        "Something went wrong",
    });
  }
});

app.listen(3000, () => {
  console.log(
    "Experiment 03 Part 2 server running on http://localhost:3000",
  );
});