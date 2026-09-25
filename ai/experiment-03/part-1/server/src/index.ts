import "dotenv/config";
import express from "express";

import { openai } from "./ai/openai";
import {
    getOrderDetails,
    getOrderStatus,
  } from "./services/orderService";
import { orderTools } from "./tools/orderTools";
import { runToolCalling } from "./ai/runToolCalling";

const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    experiment: "03",
    topic: "tool-calling",
  });
});

app.get("/api/orders/:orderId/status", (req, res) => {
  const result = getOrderStatus(req.params.orderId);

  return res.json(result);
});

function executeTool(name: string, argumentsJson: string) {
    const args = JSON.parse(argumentsJson);
  
    switch (name) {
      case "getOrderStatus":
        return getOrderStatus(args.orderId);
  
      case "getOrderDetails":
        return getOrderDetails(args.orderId);
  
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  app.post("/api/chat", async (req, res) => {
    try {
      const { prompt } = req.body;
  
      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({
          error: "prompt is required",
        });
      }
  
      const response = await runToolCalling(prompt);
  
      return res.json({
        response,
      });
    } catch (error) {
      console.error(error);
  
      return res.status(500).json({
        error: "Something went wrong",
      });
    }
  });

app.listen(3000, () => {
  console.log(
    "Experiment 03 server running on http://localhost:3000",
  );
});