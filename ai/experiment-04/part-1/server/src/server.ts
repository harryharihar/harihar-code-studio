import "dotenv/config";

import http from "http";

import {
  buildIndex,
  searchDocuments,
} from "./search";

const PORT = 3001;

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS",
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type",
  );

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, {
      "Content-Type": "application/json",
    });

    res.end(
      JSON.stringify({
        status: "ok",
        service: "semantic-search",
      }),
    );

    return;
  }

  // Semantic search
  if (req.method === "POST" && req.url === "/api/search") {
    try {
      let body = "";

      req.on("data", (chunk) => {
        body += chunk.toString();
      });

      req.on("end", async () => {
        const { query } = JSON.parse(body);

        if (!query || typeof query !== "string") {
          res.writeHead(400, {
            "Content-Type": "application/json",
          });

          res.end(
            JSON.stringify({
              error: "query is required",
            }),
          );

          return;
        }

        const results = await searchDocuments(query);

        res.writeHead(200, {
          "Content-Type": "application/json",
        });

        res.end(
          JSON.stringify({
            query,
            results,
          }),
        );
      });
    } catch (error) {
      console.error(error);

      res.writeHead(500, {
        "Content-Type": "application/json",
      });

      res.end(
        JSON.stringify({
          error: "Internal server error",
        }),
      );
    }

    return;
  }

  res.writeHead(404, {
    "Content-Type": "application/json",
  });

  res.end(
    JSON.stringify({
      error: "Route not found",
    }),
  );
});

async function startServer() {
  await buildIndex();

  server.listen(PORT, () => {
    console.log(
      `Semantic search API running on http://localhost:${PORT}`,
    );

    console.log(
      `Health: http://localhost:${PORT}/health`,
    );
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});

