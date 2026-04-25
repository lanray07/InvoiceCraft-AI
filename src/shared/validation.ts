import { z } from "zod";

export const currencySchema = z.enum(["USD", "GBP", "EUR", "CAD", "AUD"]);
export const paymentMethodSchema = z.enum([
  "bank-transfer",
  "card",
  "check",
  "cash",
  "paypal",
  "stripe"
]);
export const templateSchema = z.enum([
  "contractors",
  "freelancers",
  "service-businesses"
]);

export const invoiceInputShape = {
  businessName: z.string().trim().max(120).optional().default(""),
  businessContact: z.string().trim().max(240).optional().default(""),
  clientName: z.string().trim().min(1, "Client name is required").max(120),
  serviceDescription: z
    .string()
    .trim()
    .min(1, "Service description is required")
    .max(600),
  totalPrice: z.coerce
    .number()
    .finite()
    .nonnegative("Total price cannot be negative"),
  depositPaid: z.coerce
    .number()
    .finite()
    .nonnegative("Deposit paid cannot be negative"),
  discountAmount: z.coerce
    .number()
    .finite()
    .nonnegative("Discount cannot be negative")
    .optional()
    .default(0),
  taxRate: z.coerce
    .number()
    .finite()
    .min(0, "Tax rate cannot be negative")
    .max(100, "Tax rate cannot exceed 100")
    .optional()
    .default(0),
  dueDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Due date must be YYYY-MM-DD"),
  paymentMethod: paymentMethodSchema,
  currency: currencySchema,
  template: templateSchema.default("service-businesses")
};

export const invoiceInputSchema = z
  .object(invoiceInputShape)
  .superRefine((value, ctx) => {
    if (value.discountAmount > value.totalPrice) {
      ctx.addIssue({
        code: "custom",
        path: ["discountAmount"],
        message: "Discount cannot exceed the total price"
      });
    }

    const taxableCents =
      Math.round(value.totalPrice * 100) - Math.round(value.discountAmount * 100);
    const taxCents = Math.round(taxableCents * (value.taxRate / 100));
    const totalWithTax = (taxableCents + taxCents) / 100;

    if (value.depositPaid > totalWithTax) {
      ctx.addIssue({
        code: "custom",
        path: ["depositPaid"],
        message: "Deposit paid cannot exceed the final invoice total"
      });
    }

    const date = new Date(`${value.dueDate}T00:00:00Z`);
    const normalizedDate = Number.isNaN(date.getTime())
      ? null
      : date.toISOString().slice(0, 10);
    if (normalizedDate !== value.dueDate) {
      ctx.addIssue({
        code: "custom",
        path: ["dueDate"],
        message: "Due date must be a valid calendar date"
      });
    }
  });

export type InvoiceInputSchema = z.infer<typeof invoiceInputSchema>;
