import { invoiceTemplates, formatMoney, getPaymentInstruction } from "./templates.js";
import type { InvoiceExplanation, InvoiceInput, InvoiceOutput } from "./types.js";
import { invoiceInputSchema } from "./validation.js";

function toCents(amount: number): number {
  return Math.round(amount * 100);
}

function fromCents(cents: number): number {
  return cents / 100;
}

function createInvoiceId(input: InvoiceInput): string {
  const seed = `${input.clientName}|${input.serviceDescription}|${input.totalPrice}|${input.depositPaid}|${input.dueDate}|${input.currency}|${input.template}`;
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return `INV-${hash.toString(36).toUpperCase().padStart(7, "0").slice(0, 7)}`;
}

export function generateInvoice(input: InvoiceInput): InvoiceOutput {
  const parsed = invoiceInputSchema.parse(input);
  const template = invoiceTemplates[parsed.template];
  const totalCents = toCents(parsed.totalPrice);
  const paidCents = toCents(parsed.depositPaid);
  const balanceCents = totalCents - paidCents;
  const totalAmount = fromCents(totalCents);
  const amountPaid = fromCents(paidCents);
  const remainingBalance = fromCents(balanceCents);

  const lineItems = [
    {
      description: `${template.lineItemLabel}: ${parsed.serviceDescription}`,
      quantity: 1,
      unitPrice: totalAmount,
      amount: totalAmount
    }
  ];

  const paymentInstructions = getPaymentInstruction(
    parsed.paymentMethod,
    parsed.currency
  );
  const totalFormatted = formatMoney(totalAmount, parsed.currency);
  const paidFormatted = formatMoney(amountPaid, parsed.currency);
  const balanceFormatted = formatMoney(remainingBalance, parsed.currency);

  return {
    invoiceId: createInvoiceId(parsed),
    template: parsed.template,
    invoiceSummary: `${template.summaryPrefix} for ${parsed.clientName}: ${parsed.serviceDescription}.`,
    lineItems,
    totalAmount,
    amountPaid,
    remainingBalance,
    dueDate: parsed.dueDate,
    paymentInstructions,
    lateFeeNote: template.lateFeeNote,
    clientReadyMessage: `${template.messageIntro}\n\nInvoice ${createInvoiceId(parsed)}\nClient: ${parsed.clientName}\nService: ${parsed.serviceDescription}\nTotal: ${totalFormatted}\nPaid: ${paidFormatted}\nBalance due: ${balanceFormatted}\nDue date: ${parsed.dueDate}\n\n${paymentInstructions}\n${template.lateFeeNote}`
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
    currency: parsed.currency
  };
}

export function regenerateInvoice(input: InvoiceInput): InvoiceOutput {
  return generateInvoice(input);
}

export function explainInvoice(input: InvoiceInput): InvoiceExplanation {
  const parsed = invoiceInputSchema.parse(input);
  const template = invoiceTemplates[parsed.template];
  const totalCents = toCents(parsed.totalPrice);
  const paidCents = toCents(parsed.depositPaid);
  const balanceCents = totalCents - paidCents;

  return {
    calculation: `Remaining balance is calculated as total price minus deposit paid: ${formatMoney(fromCents(totalCents), parsed.currency)} - ${formatMoney(fromCents(paidCents), parsed.currency)} = ${formatMoney(fromCents(balanceCents), parsed.currency)}.`,
    templateNotes: [
      `Template: ${template.label}`,
      `Line item label: ${template.lineItemLabel}`,
      `Late fee note: ${template.lateFeeNote}`
    ],
    validationRules: [
      "Client name and service description are required.",
      "Total price and deposit paid must be zero or greater.",
      "Deposit paid cannot exceed the total price.",
      "Due date must be a valid YYYY-MM-DD date.",
      "Currency, payment method, and template must use supported values."
    ],
    assumptions: [
      "The invoice uses one clear service line item by default.",
      "No taxes, discounts, or hidden fees are added.",
      "All calculations are rounded to cents before subtraction."
    ]
  };
}
