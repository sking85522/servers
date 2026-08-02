import express from "express";

const app = express();
const PORT = process.env.PORT || 10000;

app.get("/", (req, res) => {
  res.send("GitHub MCP Server is Live and Running!");
});

app.get("/sse", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  console.log("Client connected via SSE");

  // Keep-alive ping
  const timer = setInterval(() => {
    res.write(`: keepalive\n\n`);
  }, 15000);

  req.on("close", () => {
    clearInterval(timer);
    console.log("Client disconnected");
  });
});

app.listen(PORT, () => {
  console.log(`MCP Server running on port ${PORT}`);
});
