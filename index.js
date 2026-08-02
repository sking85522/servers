import express from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { Octokit } from "@octokit/rest";

const app = express();
const port = process.env.PORT || 3000;

app.get("/sse", async (req, res) => {
  console.log("New SSE Connection");
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
