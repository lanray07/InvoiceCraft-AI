import { App } from "@modelcontextprotocol/ext-apps";
import { jsPDF } from "jspdf";
import type { InvoiceInput, InvoiceOutput } from "../shared/types.js";
import { formatMoney } from "../shared/templates.js";
import { invoiceInputSchema } from "../shared/validation.js";

type ToolResult = {
  structuredContent?: unknown;
  content?: Array<{ type: string; text?: string }>;
  isError?: boolean;
  _meta?: {
    input?: unknown;
    [key: string]: unknown;
  };
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

export async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

export async function downloadInvoicePdf(
  invoice: InvoiceOutput,
  input: InvoiceInput
): Promise<void> {
  const doc = new jsPDF();
  const left = 18;
  let y = 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(input.businessName || "Invoice", left, y);

  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  if (input.businessContact) {
    doc.text(input.businessContact, left, y);
    y += 8;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(invoice.invoiceId, left, y);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const summary = doc.splitTextToSize(invoice.invoiceSummary, 172);
  doc.text(summary, left, y);
  y += summary.length * 6 + 6;

  doc.text(`Client: ${input.clientName}`, left, y);
  y += 7;
  doc.text(`Due date: ${invoice.dueDate}`, left, y);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.text("Line items", left, y);
  y += 7;
  doc.setFont("helvetica", "normal");

  invoice.lineItems.forEach((item) => {
    const amount = formatMoney(item.amount, invoice.currency);
    const lines = doc.splitTextToSize(item.description, 130);
    doc.text(lines, left, y);
    doc.text(amount, 178, y, { align: "right" });
    y += Math.max(7, lines.length * 6);
  });

  y += 6;
  doc.line(left, y, 190, y);
  y += 8;
  doc.text(`Subtotal: ${formatMoney(invoice.subtotalAmount, invoice.currency)}`, left, y);
  y += 7;
  if (invoice.discountAmount > 0) {
    doc.text(`Discount: -${formatMoney(invoice.discountAmount, invoice.currency)}`, left, y);
    y += 7;
  }
  if (invoice.taxAmount > 0) {
    doc.text(`Tax (${invoice.taxRate}%): ${formatMoney(invoice.taxAmount, invoice.currency)}`, left, y);
    y += 7;
  }
  doc.text(`Paid: ${formatMoney(invoice.amountPaid, invoice.currency)}`, left, y);
  y += 7;
  doc.setFont("helvetica", "bold");
  doc.text(`Balance due: ${formatMoney(invoice.remainingBalance, invoice.currency)}`, left, y);
  y += 10;

  doc.setFont("helvetica", "normal");
  const payment = doc.splitTextToSize(invoice.paymentInstructions, 172);
  doc.text(payment, left, y);
  y += payment.length * 6 + 4;
  const lateFee = doc.splitTextToSize(invoice.lateFeeNote, 172);
  doc.text(lateFee, left, y);

  const dataUri = doc.output("datauristring");
  const base64 = dataUri.split(",")[1] ?? "";
  await app.downloadFile({
    contents: [
      {
        type: "resource",
        resource: {
          uri: `file:///${invoice.invoiceId}.pdf`,
          mimeType: "application/pdf",
          blob: base64
        }
      }
    ]
  });
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

export function asInvoiceInput(value: unknown): InvoiceInput | null {
  const parsed = invoiceInputSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
