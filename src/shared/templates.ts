import type { CurrencyCode, PaymentMethod, TemplateId } from "./types.js";

export interface InvoiceTemplate {
  id: TemplateId;
  label: string;
  summaryPrefix: string;
  lineItemLabel: string;
  lateFeeNote: string;
  messageIntro: string;
}

export const invoiceTemplates: Record<TemplateId, InvoiceTemplate> = {
  contractors: {
    id: "contractors",
    label: "Contractor",
    summaryPrefix: "Invoice for contracted project work",
    lineItemLabel: "Contracted services",
    lateFeeNote:
      "Late payments may be subject to a 1.5% monthly finance charge unless a different agreement is in place.",
    messageIntro: "Please find the invoice for the completed contracted work below."
  },
  freelancers: {
    id: "freelancers",
    label: "Freelancer",
    summaryPrefix: "Invoice for freelance services",
    lineItemLabel: "Freelance services",
    lateFeeNote:
      "Late payments may incur a 1.5% monthly late fee after the due date, where permitted by the service agreement.",
    messageIntro: "Thanks again for the opportunity to work together."
  },
  "service-businesses": {
    id: "service-businesses",
    label: "Service Business",
    summaryPrefix: "Invoice for professional service delivery",
    lineItemLabel: "Professional services",
    lateFeeNote:
      "A late fee may apply to overdue balances according to the agreed service terms.",
    messageIntro: "Your invoice for the requested service is ready for payment."
  }
};

const paymentMethodLabels: Record<PaymentMethod, string> = {
  "bank-transfer": "bank transfer",
  card: "card payment",
  check: "check",
  cash: "cash",
  paypal: "PayPal",
  stripe: "Stripe"
};

const currencySymbols: Record<CurrencyCode, string> = {
  USD: "$",
  GBP: "£",
  EUR: "€",
  CAD: "CA$",
  AUD: "A$"
};

export function formatMoney(amount: number, currency: CurrencyCode): string {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

export function getPaymentInstruction(
  paymentMethod: PaymentMethod,
  currency: CurrencyCode
): string {
  const label = paymentMethodLabels[paymentMethod];
  const symbol = currencySymbols[currency];
  return `Please pay the remaining balance by ${label}. Amounts are shown in ${currency} (${symbol}).`;
}
