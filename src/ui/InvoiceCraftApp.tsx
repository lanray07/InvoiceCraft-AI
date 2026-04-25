import { useEffect, useMemo, useState } from "react";
import {
  asInvoiceInput,
  asInvoiceOutput,
  callInvoiceTool,
  connectBridge,
  onToolInput,
  onToolResult
} from "./appBridge.js";
import { generateInvoice } from "../shared/invoiceEngine.js";
import { formatMoney } from "../shared/templates.js";
import type {
  CurrencyCode,
  InvoiceInput,
  InvoiceOutput,
  PaymentMethod,
  TemplateId
} from "../shared/types.js";
import { invoiceInputSchema } from "../shared/validation.js";

const defaultInput: InvoiceInput = {
  clientName: "",
  serviceDescription: "",
  totalPrice: 0,
  depositPaid: 0,
  dueDate: "",
  paymentMethod: "bank-transfer",
  currency: "USD",
  template: "service-businesses"
};

const paymentMethods: Array<{ value: PaymentMethod; label: string }> = [
  { value: "bank-transfer", label: "Bank transfer" },
  { value: "card", label: "Card" },
  { value: "stripe", label: "Stripe" },
  { value: "paypal", label: "PayPal" },
  { value: "check", label: "Check" },
  { value: "cash", label: "Cash" }
];

const currencies: CurrencyCode[] = ["USD", "GBP", "EUR", "CAD", "AUD"];

const templates: Array<{ value: TemplateId; label: string }> = [
  { value: "service-businesses", label: "Service business" },
  { value: "contractors", label: "Contractor" },
  { value: "freelancers", label: "Freelancer" }
];

function toNumber(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function InvoiceCraftApp() {
  const [input, setInput] = useState<InvoiceInput>(defaultInput);
  const [invoice, setInvoice] = useState<InvoiceOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const cleanupInput = onToolInput((toolInput) => {
      const parsed = invoiceInputSchema.safeParse(toolInput.arguments ?? {});
      if (parsed.success) {
        setInput(parsed.data);
        setError(null);
      }
    });

    const cleanupResult = onToolResult((result) => {
      const nextInvoice = asInvoiceOutput(result.structuredContent);
      if (nextInvoice) {
        setInvoice(nextInvoice);
        const nextInput = asInvoiceInput(result._meta?.input);
        if (nextInput) {
          setInput(nextInput);
        }
        setError(null);
      }
    });

    connectBridge();

    return () => {
      cleanupInput();
      cleanupResult();
    };
  }, []);

  const previewBalance = useMemo(() => {
    if (
      invoice &&
      input.totalPrice === 0 &&
      input.depositPaid === 0 &&
      !input.dueDate
    ) {
      return invoice.remainingBalance;
    }

    const total = Number.isFinite(input.totalPrice) ? input.totalPrice : 0;
    const paid = Number.isFinite(input.depositPaid) ? input.depositPaid : 0;
    return Math.max(0, Math.round((total - paid) * 100) / 100);
  }, [input.depositPaid, input.totalPrice]);

  const update = <K extends keyof InvoiceInput>(key: K, value: InvoiceInput[K]) => {
    setInput((current) => ({ ...current, [key]: value }));
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    const parsed = invoiceInputSchema.safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.issues.map((issue) => issue.message).join("; "));
      setIsGenerating(false);
      return;
    }

    try {
      const result = await callInvoiceTool("generateInvoice", parsed.data);
      const output = asInvoiceOutput(result.structuredContent);
      setInvoice(output ?? generateInvoice(parsed.data));
    } catch {
      setInvoice(generateInvoice(parsed.data));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    if (!invoice) {
      await handleGenerate();
      return;
    }

    setIsGenerating(true);
    try {
      const result = await callInvoiceTool("regenerateInvoice", input);
      const output = asInvoiceOutput(result.structuredContent);
      setInvoice(output ?? generateInvoice(input));
    } catch {
      setInvoice(generateInvoice(input));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main className="shell">
      <section className="workspace" aria-label="Invoice builder">
        <form className="panel form-panel" onSubmit={(event) => event.preventDefault()}>
          <div className="title-row">
            <div>
              <p className="eyebrow">InvoiceCraft AI</p>
              <h1>Invoice builder</h1>
            </div>
            <select
              aria-label="Template"
              value={input.template}
              onChange={(event) => update("template", event.target.value as TemplateId)}
            >
              {templates.map((template) => (
                <option key={template.value} value={template.value}>
                  {template.label}
                </option>
              ))}
            </select>
          </div>

          <label>
            <span>Client name</span>
            <input
              value={input.clientName}
              onChange={(event) => update("clientName", event.target.value)}
              placeholder="Acme Studio"
            />
          </label>

          <label>
            <span>Service description</span>
            <textarea
              value={input.serviceDescription}
              onChange={(event) => update("serviceDescription", event.target.value)}
              placeholder="Website redesign and launch support"
              rows={4}
            />
          </label>

          <div className="field-grid">
            <label>
              <span>Total price</span>
              <input
                inputMode="decimal"
                value={input.totalPrice || ""}
                onChange={(event) => update("totalPrice", toNumber(event.target.value))}
                placeholder="2500"
              />
            </label>
            <label>
              <span>Deposit paid</span>
              <input
                inputMode="decimal"
                value={input.depositPaid || ""}
                onChange={(event) => update("depositPaid", toNumber(event.target.value))}
                placeholder="500"
              />
            </label>
          </div>

          <div className="field-grid">
            <label>
              <span>Due date</span>
              <input
                type="date"
                value={input.dueDate}
                onChange={(event) => update("dueDate", event.target.value)}
              />
            </label>
            <label>
              <span>Currency</span>
              <select
                value={input.currency}
                onChange={(event) => update("currency", event.target.value as CurrencyCode)}
              >
                {currencies.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label>
            <span>Payment method</span>
            <select
              value={input.paymentMethod}
              onChange={(event) =>
                update("paymentMethod", event.target.value as PaymentMethod)
              }
            >
              {paymentMethods.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </label>

          <div className="total-strip">
            <span>Balance preview</span>
            <strong>{formatMoney(previewBalance, input.currency)}</strong>
          </div>

          {error ? <p className="error">{error}</p> : null}

          <div className="actions">
            <button type="button" onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? "Generating" : "Generate"}
            </button>
            <button type="button" className="secondary" onClick={handleRegenerate}>
              Regenerate
            </button>
          </div>
        </form>

        <section className="panel result-panel" aria-label="Invoice result">
          {invoice ? (
            <>
              <div className="result-header">
                <div>
                  <p className="eyebrow">{invoice.invoiceId}</p>
                  <h2>{invoice.invoiceSummary}</h2>
                </div>
                <strong>{formatMoney(invoice.remainingBalance, invoice.currency)}</strong>
              </div>

              <div className="breakdown">
                <div>
                  <span>Total</span>
                  <strong>{formatMoney(invoice.totalAmount, invoice.currency)}</strong>
                </div>
                <div>
                  <span>Paid</span>
                  <strong>{formatMoney(invoice.amountPaid, invoice.currency)}</strong>
                </div>
                <div>
                  <span>Due</span>
                  <strong>{invoice.dueDate}</strong>
                </div>
              </div>

              <div className="line-items">
                {invoice.lineItems.map((item) => (
                  <div key={item.description} className="line-item">
                    <span>{item.description}</span>
                    <strong>{formatMoney(item.amount, invoice.currency)}</strong>
                  </div>
                ))}
              </div>

              <div className="note">
                <strong>Payment instructions</strong>
                <p>{invoice.paymentInstructions}</p>
              </div>
              <div className="note">
                <strong>Late fee note</strong>
                <p>{invoice.lateFeeNote}</p>
              </div>

              <label className="message-box">
                <span>Client-ready invoice message</span>
                <textarea readOnly value={invoice.clientReadyMessage} rows={10} />
              </label>
            </>
          ) : (
            <div className="empty-state">
              <p className="eyebrow">Result card</p>
              <h2>Ready when the invoice details are.</h2>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
