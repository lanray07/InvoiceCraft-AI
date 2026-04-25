# InvoiceCraft AI

InvoiceCraft AI is a simple ChatGPT app that generates clean, professional invoices for service businesses. It uses the current MCP Apps standard used by the OpenAI Apps SDK: an MCP server exposes tools, and a React widget is served as a `ui://` resource rendered inside ChatGPT.

## Features

- React invoice builder with client, service, pricing, due date, payment method, currency, and template controls.
- Tools: `generateInvoice`, `regenerateInvoice`, and `explainInvoice`.
- Deterministic financial calculations with no taxes, discounts, or hidden fees.
- Configurable templates for contractors, freelancers, and service businesses.
- Validation, error handling, and focused unit tests.
- Vercel-ready `/mcp` endpoint.

## Setup

```bash
npm install
npm run build
npm start
```

The local MCP endpoint runs at:

```text
http://localhost:3001/mcp
```

On Windows PowerShell, use `npm.cmd` if script execution policy blocks `npm.ps1`.

## Usage

In ChatGPT developer mode, connect the app to the MCP endpoint. The app exposes:

- `generateInvoice`: creates the invoice and opens the InvoiceCraft UI.
- `regenerateInvoice`: rebuilds the same invoice from the visible inputs.
- `explainInvoice`: explains the calculation, validation rules, template notes, and assumptions.

The generated output includes invoice summary, line items, total amount, amount paid, remaining balance, due date, payment instructions, late fee note, and a client-ready invoice message.

## Deployment

This repository is configured for Vercel:

```bash
npm run build
vercel deploy
```

`vercel.json` rewrites `/mcp` to `api/mcp.ts`, which creates a stateless Streamable HTTP MCP transport per request. After deployment, connect ChatGPT to:

```text
https://your-project.vercel.app/mcp
```

## Templates

Templates live in `src/shared/templates.ts`. To extend them:

1. Add a new template ID to `TemplateId` in `src/shared/types.ts`.
2. Add the ID to `templateSchema` in `src/shared/validation.ts`.
3. Add the template copy in `invoiceTemplates`.
4. Add an option in `src/ui/InvoiceCraftApp.tsx`.
5. Add or update tests for the expected invoice text.

## Architecture

```text
src/shared/
  invoiceEngine.ts   deterministic invoice calculations
  templates.ts       configurable invoice copy and payment text
  validation.ts      zod schemas used by server and UI
src/server/
  createServer.ts    MCP tools and UI resource registration
  main.ts            local HTTP and stdio entry point
src/ui/
  InvoiceCraftApp.tsx React widget
  appBridge.ts        MCP Apps bridge wrapper
api/mcp.ts            Vercel serverless MCP handler
tests/                calculation and validation coverage
```

## Tests

```bash
npm test
npm run typecheck
```
