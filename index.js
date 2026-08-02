import express from "express";
import cors from "cors";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Octokit } from "@octokit/rest";

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

const octokit = new Octokit({
  auth: process.env.GITHUB_PERSONAL_ACCESS_TOKEN || process.env.GITHUB_TOKEN,
});

const transports = new Map();

function createMcpServer() {
  const server = new Server(
    {
      name: "github-mcp-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "list_repositories",
          description: "List repositories for the authenticated user",
          inputSchema: {
            type: "object",
            properties: {
              per_page: { type: "number", default: 10 },
            },
          },
        },
        {
          name: "get_user",
          description: "Get authenticated GitHub user details",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "list_issues",
          description: "List issues for a repository",
          inputSchema: {
            type: "object",
            properties: {
              owner: { type: "string" },
              repo: { type: "string" },
            },
            required: ["owner", "repo"],
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      if (name === "list_repositories") {
        const res = await octokit.rest.repos.listForAuthenticatedUser({
          per_page: args?.per_page || 10,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }],
        };
      } else if (name === "get_user") {
        const res = await octokit.rest.users.getAuthenticated();
        return {
          content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }],
        };
      } else if (name === "list_issues") {
        const res = await octokit.rest.issues.listForRepo({
          owner: args.owner,
          repo: args.repo,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }],
        };
      } else {
        throw new Error(`Tool not found: ${name}`);
      }
    } catch (err) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error: ${err.message}` }],
      };
    }
  });

  return server;
}

app.get("/sse", async (req, res) => {
  console.log("Got SSE connection request");
  
  // Create Absolute URL for SSE endpoint
  const protocol = req.headers["x-forwarded-proto"] || "https";
  const host = req.get("host");
  const absoluteMessagesUrl = `${protocol}://${host}/messages`;

  const transport = new SSEServerTransport(absoluteMessagesUrl, res);
  const sessionId = transport.sessionId;
  transports.set(sessionId, transport);

  const mcpServer = createMcpServer();
  await mcpServer.connect(transport);

  req.on("close", () => {
    transports.delete(sessionId);
  });
});

app.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId;
  const transport = transports.get(sessionId);
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(400).send("Session not found");
  }
});

app.get("/", (req, res) => {
  res.send("GitHub MCP SSE Server is active!");
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
