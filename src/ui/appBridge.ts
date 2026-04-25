import { App } from "@modelcontextprotocol/ext-apps";
import type { InvoiceInput, InvoiceOutput } from "../shared/types.js";

type ToolResult = {
  structuredContent?: unknown;
  content?: Array<{ type: string; text?: string }>;
  isError?: boolean;
};

const app = new App({ name: "InvoiceCraft AI", version: "1.0.0" });
let connected = false;
const listeners = new Set<(result: ToolResult) => void>();

app.ontoolresult = (result: ToolResult) => {
  listeners.forEach((listener) => listener(result));
};

export function connectBridge(): void {
  if (connected) {
    return;
  }

  connected = true;
  try {
    app.connect();
  } catch (error) {
    console.warn("InvoiceCraft AI is running outside an MCP Apps host.", error);
  }
}

export function onToolResult(listener: (result: ToolResult) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function callInvoiceTool(
  name: "generateInvoice" | "regenerateInvoice" | "explainInvoice",
  input: InvoiceInput
): Promise<ToolResult> {
  return app.callServerTool({
    name,
    arguments: input as unknown as Record<string, unknown>
  }) as Promise<ToolResult>;
}

export function asInvoiceOutput(value: unknown): InvoiceOutput | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<InvoiceOutput>;
  if (
    typeof candidate.invoiceId === "string" &&
    Array.isArray(candidate.lineItems) &&
    typeof candidate.clientReadyMessage === "string"
  ) {
    return candidate as InvoiceOutput;
  }

  return null;
}
