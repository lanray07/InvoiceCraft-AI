import { invoiceTemplates, formatMoney, getPaymentInstruction } from "./templates.js";
import type { InvoiceExplanation, InvoiceInput, InvoiceOutput } from "./types.js";
import { invoiceInputSchema } from "./validation.js";

function toCents(amount: number): number {
  return Math.round(amount * 100);
}

function fromCents(cents: number): number {
  return cents / 100;
}

function roundTaxCents(amountCents: number, taxRate: number): number {
  return Math.round(amountCents * (taxRate / 100));
}

function createInvoiceId(input: InvoiceInput): string {
  const seed = `${input.businessName ?? ""}|${input.clientName}|${input.serviceDescription}|${input.totalPrice}|${input.depositPaid}|${input.discountAmount ?? 0}|${input.taxRate ?? 0}|${input.dueDate}|${input.currency}|${input.template}`;
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return `INV-${hash.toString(36).toUpperCase().padStart(7, "0").slice(0, 7)}`;
}

export function generateInvoice(input: InvoiceInput): InvoiceOutput {
  const parsed = invoiceInputSchema.parse(input);
  const template = invoiceTemplates[parsed.template];
  const subtotalCents = toCents(parsed.totalPrice);
  const discountCents = toCents(parsed.discountAmount);
  const taxableCents = subtotalCents - discountCents;
  const taxCents = roundTaxCents(taxableCents, parsed.taxRate);
  const totalCents = taxableCents + taxCents;
  const paidCents = toCents(parsed.depositPaid);
  const balanceCents = totalCents - paidCents;
  const subtotalAmount = fromCents(subtotalCents);
  const discountAmount = fromCents(discountCents);
  const taxAmount = fromCents(taxCents);
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

  lineItems[0].unitPrice = subtotalAmount;
  lineItems[0].amount = subtotalAmount;

  if (discountCents > 0) {
    lineItems.push({
      description: "Discount",
      quantity: 1,
      unitPrice: -discountAmount,
      amount: -discountAmount
    });
  }

  if (taxCents > 0) {
    lineItems.push({
      description: `Tax (${parsed.taxRate}%)`,
      quantity: 1,
      unitPrice: taxAmount,
      amount: taxAmount
    });
  }

  const paymentInstructions = getPaymentInstruction(
    parsed.paymentMethod,
    parsed.currency
  );
  const totalFormatted = formatMoney(totalAmount, parsed.currency);
  const paidFormatted = formatMoney(amountPaid, parsed.currency);
  const balanceFormatted = formatMoney(remainingBalance, parsed.currency);
  const businessLines = [
    parsed.businessName ? `From: ${parsed.businessName}` : null,
    parsed.businessContact ? `Contact: ${parsed.businessContact}` : null
  ].filter(Boolean);

  return {
    invoiceId: createInvoiceId(parsed),
    template: parsed.template,
    invoiceSummary: `${template.summaryPrefix} for ${parsed.clientName}: ${parsed.serviceDescription}.`,
    lineItems,
    subtotalAmount,
    discountAmount,
    taxRate: parsed.taxRate,
    taxAmount,
    totalAmount,
    amountPaid,
    remainingBalance,
    dueDate: parsed.dueDate,
    paymentInstructions,
    lateFeeNote: template.lateFeeNote,
    clientReadyMessage: `${template.messageIntro}\n\nInvoice ${createInvoiceId(parsed)}\n${businessLines.join("\n")}${businessLines.length ? "\n" : ""}Client: ${parsed.clientName}\nService: ${parsed.serviceDescription}\nSubtotal: ${formatMoney(subtotalAmount, parsed.currency)}\n${discountCents > 0 ? `Discount: -${formatMoney(discountAmount, parsed.currency)}\n` : ""}${taxCents > 0 ? `Tax (${parsed.taxRate}%): ${formatMoney(taxAmount, parsed.currency)}\n` : ""}Total: ${totalFormatted}\nPaid: ${paidFormatted}\nBalance due: ${balanceFormatted}\nDue date: ${parsed.dueDate}\n\n${paymentInstructions}\n${template.lateFeeNote}`
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
  const subtotalCents = toCents(parsed.totalPrice);
  const discountCents = toCents(parsed.discountAmount);
  const taxableCents = subtotalCents - discountCents;
  const taxCents = roundTaxCents(taxableCents, parsed.taxRate);
  const totalCents = taxableCents + taxCents;
  const paidCents = toCents(parsed.depositPaid);
  const balanceCents = totalCents - paidCents;

  return {
    calculation: `Remaining balance is calculated as subtotal minus discount, plus tax, minus deposit paid: ${formatMoney(fromCents(subtotalCents), parsed.currency)} - ${formatMoney(fromCents(discountCents), parsed.currency)} + ${formatMoney(fromCents(taxCents), parsed.currency)} - ${formatMoney(fromCents(paidCents), parsed.currency)} = ${formatMoney(fromCents(balanceCents), parsed.currency)}.`,
    templateNotes: [
      `Template: ${template.label}`,
      `Line item label: ${template.lineItemLabel}`,
      `Late fee note: ${template.lateFeeNote}`
    ],
    validationRules: [
      "Client name and service description are required.",
      "Total price and deposit paid must be zero or greater.",
      "Discount cannot exceed the total price.",
      "Tax rate must be between 0 and 100.",
      "Deposit paid cannot exceed the final invoice total.",
      "Due date must be a valid YYYY-MM-DD date.",
      "Currency, payment method, and template must use supported values."
    ],
    assumptions: [
      "The invoice uses one clear service line item by default.",
      "Taxes and discounts are only added when explicitly provided.",
      "All calculations are rounded to cents before subtraction."
    ]
  };
}
