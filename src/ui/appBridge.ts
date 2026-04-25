import { App } from "@modelcontextprotocol/ext-apps";
import type { InvoiceInput, InvoiceOutput } from "../shared/types.js";

type ToolResult = {
  structuredContent?: unknown;
  content?: Array<{ type: string; text?: string }>;
  isError?: boolean;
};

type ToolInput = {
  arguments?: Record<string, unknown>;
};

const app = new App({ name: "InvoiceCraft AI", version: "1.0.0" });
let connected = false;
let latestToolInput: ToolInput | null = null;
let latestToolResult: ToolResult | null = null;
const resultListeners = new Set<(result: ToolResult) => void>();
const inputListeners = new Set<(input: ToolInput) => void>();

app.ontoolinput = (input: ToolInput) => {
  latestToolInput = input;
  inputListeners.forEach((listener) => listener(input));
};

app.ontoolresult = (result: ToolResult) => {
  latestToolResult = result;
  resultListeners.forEach((listener) => listener(result));
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
  resultListeners.add(listener);
  if (latestToolResult) {
    listener(latestToolResult);
  }
  return () => {
    resultListeners.delete(listener);
  };
}

export function onToolInput(listener: (input: ToolInput) => void): () => void {
  inputListeners.add(listener);
  if (latestToolInput) {
    listener(latestToolInput);
  }
  return () => {
    inputListeners.delete(listener);
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
