import "dotenv/config";
import http from "http";
import { initializeDatabase, pool } from "./database";
import { ingestDocuments } from "./ingest";
import { searchDocuments } from "./search";
import { answerWithRag } from "./rag";

const PORT = Number(process.env.PORT || 3003);

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS",
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type",
  );

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  res.setHeader("Content-Type", "application/json");

  try {
    if (req.method === "GET" && req.url === "/health") {
      await pool.query("SELECT 1");

      res.writeHead(200);
      res.end(
        JSON.stringify({
          status: "ok",
          service: "rag-api",
          database: "connected",
        }),
      );
      return;
    }

    if (req.method === "POST") {
      const body = await new Promise<string>((resolve, reject) => {
        const chunks: Buffer[] = [];
        let size = 0;
        let rejected = false;

        req.on("data", (chunk: Buffer | string) => {
          const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          size += buf.length;

          if (size > 1_000_000) {
            rejected = true;
            req.destroy();
            reject(new Error("PAYLOAD_TOO_LARGE"));
            return;
          }

          chunks.push(buf);
        });

        req.on("end", () => {
          if (!rejected) {
            resolve(Buffer.concat(chunks).toString());
          }
        });

        req.on("error", reject);
      }).catch((error) => {
        if (error instanceof Error && error.message === "PAYLOAD_TOO_LARGE") {
          res.writeHead(413);
          res.end(JSON.stringify({ error: "Request too large" }));
          return null;
        }

        throw error;
      });

      if (body === null) {
        return;
      }

      const data = JSON.parse(body || "{}");

      if (req.url === "/api/ingest") {
        const result = await ingestDocuments();

        res.writeHead(200);
        res.end(JSON.stringify({
          message: "Document ingestion completed",
          ...result,
        }));
        return;
      }

      if (
        req.url === "/api/search" ||
        req.url === "/api/rag"
      ) {
        const query = data.query ?? data.question;

        if (typeof query !== "string" || !query.trim()) {
          res.writeHead(400);
          res.end(JSON.stringify({
            error: "Provide a non-empty query or question",
          }));
          return;
        }

        if (req.url === "/api/search") {
          const results = await searchDocuments(query.trim());

          res.writeHead(200);
          res.end(JSON.stringify({ query, results }));
          return;
        }

        const result = await answerWithRag(query.trim());

        res.writeHead(200);
        res.end(JSON.stringify({
          question: query,
          ...result,
        }));
        return;
      }
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: "Route not found" }));
  } catch (error) {
    console.error("Request failed:", error);

    if (!res.headersSent) {
      res.writeHead(500);
      res.end(JSON.stringify({
        error: "Internal server error",
      }));
    } else {
      res.end();
    }
  }
});

async function startServer() {
  await initializeDatabase();

  server.listen(PORT, () => {
    console.log(`RAG API running at http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
