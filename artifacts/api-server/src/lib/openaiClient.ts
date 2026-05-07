import OpenAI from "openai";

// Support both Base44 internal vars and standard OpenAI env vars
const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ?? "https://api.openai.com/v1";
const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY;

if (!apiKey) {
  throw new Error("OPENAI_API_KEY (or AI_INTEGRATIONS_OPENAI_API_KEY) is not set");
}

export const openai = new OpenAI({ baseURL, apiKey });
