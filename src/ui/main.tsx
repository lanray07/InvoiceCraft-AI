import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { InvoiceCraftApp } from "./InvoiceCraftApp.js";
import "./styles.css";

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <InvoiceCraftApp />
  </StrictMode>
);
