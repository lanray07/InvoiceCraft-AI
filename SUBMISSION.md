# InvoiceCraft AI Submission Notes

## App Info

- Name: InvoiceCraft AI
- Subtitle: Create service invoices
- Category: Productivity
- Website URL: https://invoicecraft-ai.vercel.app
- Privacy Policy URL: https://invoicecraft-ai.vercel.app/privacy.html
- Terms of Service URL: https://invoicecraft-ai.vercel.app/terms.html
- Support email: banksmi@mail.com
- MCP Server URL: https://invoicecraft-ai.vercel.app/mcp-v2
- Authentication: No authentication

## Description

InvoiceCraft AI helps service businesses create professional invoices from job details. Users enter client, business, service, pricing, deposit, discount, tax, due date, payment method, currency, and template inputs, then generate a structured invoice with line items, totals, payment instructions, a late-fee note, client-ready message, copy action, and PDF export.

## Test Cases

### Test Case 1

Scenario: Generate a standard service-business invoice.

User prompt:

```text
Use InvoiceCraft AI to generate an invoice for Acme Studio for website redesign, total $2500, $500 deposit paid, due 2026-05-15, paid by bank transfer in USD.
```

Tool triggered: `generateInvoice`

Expected output:

A structured invoice for Acme Studio with one website redesign line item, total amount `$2,500.00`, amount paid `$500.00`, remaining balance `$2,000.00`, due date `2026-05-15`, bank transfer payment instructions, late-fee note, client-ready invoice message, and InvoiceCraft UI result card.

### Test Case 2

Scenario: Generate an invoice with business details, discount, and tax.

User prompt:

```text
Use InvoiceCraft AI to generate an invoice. Business: Lanre Studio, billing@example.com. Client: Northwind Co. Service: monthly maintenance. Total: 1200. Discount: 100. Tax rate: 10%. Deposit paid: 300. Due date: 2026-06-01. Payment method: card. Currency: GBP.
```

Tool triggered: `generateInvoice`

Expected output:

An invoice showing business details, subtotal `GBP 1,200.00`, discount `GBP 100.00`, tax `GBP 110.00`, final total `GBP 1,210.00`, amount paid `GBP 300.00`, remaining balance `GBP 910.00`, due date `2026-06-01`, card payment instructions, and client-ready invoice message.

### Test Case 3

Scenario: Regenerate the same invoice after changing template/tone.

User prompt:

```text
Regenerate this invoice using the freelancer template, keeping the client, service, due date, total, deposit, payment method, and currency unchanged.
```

Tool triggered: `regenerateInvoice`

Expected output:

The invoice is regenerated with freelancer template language while preserving the original facts and deterministic financial breakdown. Totals, paid amount, remaining balance, and due date remain unchanged.

### Test Case 4

Scenario: Explain invoice calculations.

User prompt:

```text
Explain how InvoiceCraft AI calculated the total and remaining balance for this invoice.
```

Tool triggered: `explainInvoice`

Expected output:

An explanation describing subtotal, discount, tax, deposit subtraction, remaining balance, template notes, validation rules, and assumptions. The explanation should state that taxes and discounts are only included when explicitly provided.

### Test Case 5

Scenario: Validation failure for impossible deposit.

User prompt:

```text
Use InvoiceCraft AI to generate an invoice for Acme Studio. Service: logo design. Total: 500. Deposit paid: 600. Due date: 2026-05-20. Payment method: bank transfer. Currency: USD.
```

Tool triggered: `generateInvoice`

Expected output:

The app rejects the request with a validation error because deposit paid exceeds the final invoice total. It should not generate an invoice or silently change the amount.

### Test Case 6

Scenario: Missing required details.

User prompt:

```text
Use InvoiceCraft AI to create an invoice for a service business. Total is $900 and payment is by bank transfer.
```

Tool triggered: `generateInvoice`

Expected output:

The app asks for missing required information such as client name, service description, and due date, or returns a validation error. It should not invent missing client or service details.
