import { describe, expect, it } from "vitest";
import { generateInvoice } from "../src/shared/invoiceEngine.js";
import type { InvoiceInput } from "../src/shared/types.js";

const input: InvoiceInput = {
  clientName: "Northwind Co.",
  serviceDescription: "Monthly property maintenance",
  totalPrice: 1200,
  depositPaid: 200,
  dueDate: "2026-06-01",
  paymentMethod: "card",
  currency: "GBP",
  template: "service-businesses"
};

describe("invoice validation", () => {
  it("rejects deposits greater than the total", () => {
    expect(() =>
      generateInvoice({ ...input, totalPrice: 100, depositPaid: 101 })
    ).toThrow("Deposit paid cannot exceed the final invoice total");
  });

  it("rejects discounts greater than the total", () => {
    expect(() =>
      generateInvoice({ ...input, totalPrice: 100, discountAmount: 101 })
    ).toThrow("Discount cannot exceed the total price");
  });

  it("rejects tax rates greater than 100", () => {
    expect(() => generateInvoice({ ...input, taxRate: 101 })).toThrow(
      "Tax rate cannot exceed 100"
    );
  });

  it("rejects invalid calendar dates", () => {
    expect(() => generateInvoice({ ...input, dueDate: "2026-02-31" })).toThrow(
      "Due date must be a valid calendar date"
    );
  });

  it("rejects missing required text fields", () => {
    expect(() => generateInvoice({ ...input, clientName: "" })).toThrow(
      "Client name is required"
    );
  });
});
