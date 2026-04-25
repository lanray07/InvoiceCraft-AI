import { describe, expect, it } from "vitest";
import {
  explainInvoice,
  generateInvoice,
  regenerateInvoice
} from "../src/shared/invoiceEngine.js";
import type { InvoiceInput } from "../src/shared/types.js";

const baseInput: InvoiceInput = {
  clientName: "Acme Studio",
  serviceDescription: "Brand identity design",
  totalPrice: 2500,
  depositPaid: 750,
  dueDate: "2026-05-15",
  paymentMethod: "bank-transfer",
  currency: "USD",
  template: "freelancers"
};

describe("invoice engine", () => {
  it("calculates a deterministic invoice breakdown", () => {
    const invoice = generateInvoice(baseInput);

    expect(invoice.invoiceId).toMatch(/^INV-/);
    expect(invoice.totalAmount).toBe(2500);
    expect(invoice.amountPaid).toBe(750);
    expect(invoice.remainingBalance).toBe(1750);
    expect(invoice.lineItems).toEqual([
      {
        description: "Freelance services: Brand identity design",
        quantity: 1,
        unitPrice: 2500,
        amount: 2500
      }
    ]);
    expect(invoice.clientReadyMessage).toContain("Balance due: $1,750.00");
  });

  it("regenerates the same output for the same visible inputs", () => {
    expect(regenerateInvoice(baseInput)).toEqual(generateInvoice(baseInput));
  });

  it("rounds to cents before subtracting paid amounts", () => {
    const invoice = generateInvoice({
      ...baseInput,
      totalPrice: 100.005,
      depositPaid: 0.015
    });

    expect(invoice.totalAmount).toBe(100.01);
    expect(invoice.amountPaid).toBe(0.02);
    expect(invoice.remainingBalance).toBe(99.99);
  });

  it("explains calculations and assumptions without hidden logic", () => {
    const explanation = explainInvoice(baseInput);

    expect(explanation.calculation).toContain("$2,500.00 - $750.00 = $1,750.00");
    expect(explanation.assumptions).toContain("No taxes, discounts, or hidden fees are added.");
  });
});
