import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import cors from "cors";
import type { Request, Response } from "express";
import { createServer } from "./createServer.js";

export async function startStreamableHTTPServer(
  serverFactory: () => McpServer
): Promise<void> {
  const port = Number.parseInt(process.env.PORT ?? "3001", 10);
  const allowedHosts = (
    process.env.ALLOWED_HOSTS ?? "localhost,127.0.0.1,[::1]"
  )
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean);
  const app = createMcpExpressApp({ host: "0.0.0.0", allowedHosts });

  app.use(cors());
  app.all("/mcp", async (req: Request, res: Response) => {
    const server = serverFactory();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined
    });

    res.on("close", () => {
      transport.close().catch(() => undefined);
      server.close().catch(() => undefined);
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("MCP error:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null
        });
      }
    }
  });

  const httpServer = app.listen(port, "0.0.0.0", () => {
    console.log(`InvoiceCraft AI MCP server listening on http://localhost:${port}/mcp`);
  });

  const shutdown = () => {
    httpServer.close(() => process.exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

export async function startStdioServer(serverFactory: () => McpServer): Promise<void> {
  await serverFactory().connect(new StdioServerTransport());
}

async function main() {
  if (process.argv.includes("--stdio")) {
    await startStdioServer(createServer);
    return;
  }
  await startStreamableHTTPServer(createServer);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
