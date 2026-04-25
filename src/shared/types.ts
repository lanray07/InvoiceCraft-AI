export type TemplateId = "contractors" | "freelancers" | "service-businesses";

export type CurrencyCode = "USD" | "GBP" | "EUR" | "CAD" | "AUD";

export type PaymentMethod =
  | "bank-transfer"
  | "card"
  | "check"
  | "cash"
  | "paypal"
  | "stripe";

export interface InvoiceInput {
  clientName: string;
  serviceDescription: string;
  totalPrice: number;
  depositPaid: number;
  dueDate: string;
  paymentMethod: PaymentMethod;
  currency: CurrencyCode;
  template: TemplateId;
}

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface InvoiceOutput {
  invoiceId: string;
  template: TemplateId;
  invoiceSummary: string;
  lineItems: LineItem[];
  totalAmount: number;
  amountPaid: number;
  remainingBalance: number;
  dueDate: string;
  paymentInstructions: string;
  lateFeeNote: string;
  clientReadyMessage: string;
  currency: CurrencyCode;
}

export interface InvoiceExplanation {
  calculation: string;
  templateNotes: string[];
  validationRules: string[];
  assumptions: string[];
}
