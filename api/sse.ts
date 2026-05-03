import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createServer } from "../src/server/createServer.js";

type SseSession = {
  server: ReturnType<typeof createServer>;
  transport: SSEServerTransport;
};

declare global {
  var invoiceCraftSseSessions: Map<string, SseSession> | undefined;
}

const sessions = globalThis.invoiceCraftSseSessions ?? new Map<string, SseSession>();
globalThis.invoiceCraftSseSessions = sessions;

function setCorsHeaders(res: ServerResponse): void {
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
  res.setHeader(
    "access-control-allow-headers",
    [
      "authorization",
      "content-type",
      "mcp-protocol-version",
      "mcp-session-id",
      "x-requested-with"
    ].join(", ")
  );
  res.setHeader("access-control-expose-headers", "mcp-session-id");
  res.setHeader("cache-control", "no-store");
}

function getSessionId(req: IncomingMessage): string | null {
  const host = req.headers.host ?? "invoicecraft-ai.vercel.app";
  const url = new URL(req.url ?? "/", `https://${host}`);
  return url.searchParams.get("sessionId");
}

export default async function handler(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse
) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method === "GET") {
    const server = createServer();
    const transport = new SSEServerTransport("/messages", res);

    sessions.set(transport.sessionId, { server, transport });
    transport.onclose = () => {
      sessions.delete(transport.sessionId);
      server.close().catch(() => undefined);
    };

    try {
      await server.connect(transport);
    } catch (error) {
      sessions.delete(transport.sessionId);
      console.error("SSE connect error:", error);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end("SSE connection failed");
      }
    }
    return;
  }

  if (req.method === "POST") {
    const sessionId = getSessionId(req);
    const session = sessionId ? sessions.get(sessionId) : undefined;

    if (!session) {
      res.statusCode = 404;
      res.end("Unknown SSE session");
      return;
    }

    try {
      await session.transport.handlePostMessage(req, res, req.body);
    } catch (error) {
      console.error("SSE message error:", error);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end("SSE message failed");
      }
    }
    return;
  }

  res.statusCode = 405;
  res.end("Method not allowed");
}
