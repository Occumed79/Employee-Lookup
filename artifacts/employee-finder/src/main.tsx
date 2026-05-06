import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl } from "@workspace/api-client-react";

// In production, VITE_API_BASE_URL points to the deployed Express API
// In dev, the Vite proxy handles /api -> localhost:3000
const apiBase = import.meta.env.VITE_API_BASE_URL ?? "";
if (apiBase) {
  setBaseUrl(apiBase);
}

createRoot(document.getElementById("root")!).render(<App />);
