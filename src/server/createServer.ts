import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE
} from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import {
  explainInvoice,
  generateInvoice,
  regenerateInvoice
} from "../shared/invoiceEngine.js";
import type { InvoiceInput } from "../shared/types.js";
import { invoiceInputSchema, invoiceInputShape } from "../shared/validation.js";

const RESOURCE_URI = "ui://invoicecraft-ai/invoicecraft-v2.html";
const DIST_HTML = path.join(process.cwd(), "dist", "mcp-app.html");

const invoiceOutputShape = {
  invoiceId: z.string(),
  template: z.string(),
  invoiceSummary: z.string(),
  lineItems: z.array(
    z.object({
      description: z.string(),
      quantity: z.number(),
      unitPrice: z.number(),
      amount: z.number()
    })
  ),
  subtotalAmount: z.number(),
  discountAmount: z.number(),
  taxRate: z.number(),
  taxAmount: z.number(),
  totalAmount: z.number(),
  amountPaid: z.number(),
  remainingBalance: z.number(),
  dueDate: z.string(),
  paymentInstructions: z.string(),
  lateFeeNote: z.string(),
  clientReadyMessage: z.string(),
  currency: z.string()
};

function successContent(text: string) {
  return [{ type: "text" as const, text }];
}

function validationError(error: unknown) {
  if (error instanceof z.ZodError) {
    return {
      isError: true,
      content: successContent(
        `Invoice input validation failed: ${error.issues.map((issue) => issue.message).join("; ")}`
      )
    };
  }

  return {
    isError: true,
    content: successContent("Invoice generation failed unexpectedly.")
  };
}

function runInvoiceTool(
  input: InvoiceInput,
  operation: "generate" | "regenerate"
) {
  try {
    const parsedInput = invoiceInputSchema.parse(input);
    const invoice =
      operation === "generate"
        ? generateInvoice(parsedInput)
        : regenerateInvoice(parsedInput);
    return {
      structuredContent: invoice as unknown as Record<string, unknown>,
      content: successContent(
        `${operation === "generate" ? "Generated" : "Regenerated"} ${invoice.invoiceId} for ${invoice.clientReadyMessage.split("\n")[2]?.replace("Service: ", "") ?? "the requested service"}. Remaining balance: ${invoice.remainingBalance.toFixed(2)} ${invoice.currency}.`
      ),
      _meta: {
        generatedAt: new Date().toISOString(),
        input: parsedInput
      }
    };
  } catch (error) {
    return validationError(error);
  }
}

export function createServer(): McpServer {
  const server = new McpServer({
    name: "InvoiceCraft AI",
    version: "1.0.0"
  });

  registerAppTool(
    server,
    "generateInvoice",
    {
      title: "Generate Invoice",
      description:
        "Generate a clean professional invoice with deterministic calculations and a client-ready message.",
      inputSchema: invoiceInputShape,
      outputSchema: invoiceOutputShape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: true
      },
      _meta: {
        ui: { resourceUri: RESOURCE_URI },
        "openai/outputTemplate": RESOURCE_URI,
        "openai/widgetAccessible": true,
        "openai/toolInvocation/invoking": "Generating invoice",
        "openai/toolInvocation/invoked": "Invoice ready"
      }
    },
    async (input) => runInvoiceTool(input as InvoiceInput, "generate")
  );

  registerAppTool(
    server,
    "regenerateInvoice",
    {
      title: "Regenerate Invoice",
      description:
        "Regenerate the invoice from the same visible inputs. Calculations remain deterministic.",
      inputSchema: invoiceInputShape,
      outputSchema: invoiceOutputShape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: true
      },
      _meta: {
        ui: { resourceUri: RESOURCE_URI },
        "openai/outputTemplate": RESOURCE_URI,
        "openai/widgetAccessible": true,
        "openai/toolInvocation/invoking": "Regenerating invoice",
        "openai/toolInvocation/invoked": "Invoice refreshed"
      }
    },
    async (input) => runInvoiceTool(input as InvoiceInput, "regenerate")
  );

  registerAppTool(
    server,
    "explainInvoice",
    {
      title: "Explain Invoice",
      description:
        "Explain the invoice calculation, validation rules, template behavior, and assumptions.",
      inputSchema: invoiceInputShape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: true
      },
      _meta: {
        ui: { resourceUri: RESOURCE_URI },
        "openai/outputTemplate": RESOURCE_URI,
        "openai/widgetAccessible": true,
        "openai/toolInvocation/invoking": "Explaining invoice",
        "openai/toolInvocation/invoked": "Explanation ready"
      }
    },
    async (input) => {
      try {
        const explanation = explainInvoice(input as InvoiceInput);
        return {
          structuredContent: explanation as unknown as Record<string, unknown>,
          content: successContent(explanation.calculation)
        };
      } catch (error) {
        return validationError(error);
      }
    }
  );

  registerAppResource(
    server,
    RESOURCE_URI,
    RESOURCE_URI,
    {
      mimeType: RESOURCE_MIME_TYPE,
      _meta: {
        ui: {
          prefersBorder: true,
          csp: {
            connectDomains: [],
            resourceDomains: []
          }
        },
        "openai/widgetDescription":
          "InvoiceCraft AI helps service businesses generate structured invoices and client-ready invoice messages.",
        "openai/widgetPrefersBorder": true,
        "openai/widgetCSP": {
          connect_domains: [],
          resource_domains: []
        }
      }
    },
    async () => {
      const html = await fs.readFile(DIST_HTML, "utf-8");
      return {
        contents: [{ uri: RESOURCE_URI, mimeType: RESOURCE_MIME_TYPE, text: html }]
      };
    }
  );

  return server;
}
