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
    if (value.depositPaid > value.totalPrice) {
      ctx.addIssue({
        code: "custom",
        path: ["depositPaid"],
        message: "Deposit paid cannot exceed the total price"
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
