import { useState, useEffect, useCallback } from "react";

export const API_KEY_FIELDS = [
  { key: "serper", label: "SERPER_API_KEY", placeholder: "sk-serper-..." },
  { key: "groq", label: "GROQ_API_KEY", placeholder: "gsk_..." },
  { key: "jina", label: "JINA_API_KEY", placeholder: "jina_..." },
  { key: "exa", label: "EXA_API_KEY", placeholder: "..." },
  { key: "tavily", label: "TAVILY_API_KEY", placeholder: "tvly-..." },
  { key: "firecrawl", label: "FIRECRAWL_API_KEY", placeholder: "fc-..." },
  { key: "prospeo", label: "PROSPEO_API_KEY", placeholder: "..." },
  { key: "skrapp", label: "SKRAPP_API_KEY", placeholder: "..." },
  { key: "scrapingdog", label: "SCRAPINGDOG_API_KEY", placeholder: "..." },
  { key: "openrouter", label: "OPENROUTER_API_KEY", placeholder: "sk-or-..." },
  { key: "minimax", label: "MINIMAX_API_KEY", placeholder: "..." },
  { key: "langsearch", label: "LANGSEARCH_API_KEY", placeholder: "..." },
  { key: "olostep", label: "OLOSTEP_API_KEY", placeholder: "..." },
  { key: "browse_ai", label: "BROWSE_AI_API_KEY", placeholder: "..." },
  { key: "browserbase", label: "BROWSERBASE_API_KEY", placeholder: "..." },
  { key: "brave", label: "BRAVE_API_KEY", placeholder: "BSA..." },
] as const;

export type ApiKeyMap = Record<string, string>;

const STORAGE_KEY = "nelf_api_keys";

function loadKeys(): ApiKeyMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveKeys(keys: ApiKeyMap) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

export function useApiKeys() {
  const [keys, setKeys] = useState<ApiKeyMap>(loadKeys);

  useEffect(() => {
    saveKeys(keys);
  }, [keys]);

  const setKey = useCallback((name: string, value: string) => {
    setKeys((prev) => ({ ...prev, [name]: value }));
  }, []);

  const filledCount = Object.values(keys).filter(Boolean).length;

  return { keys, setKey, filledCount };
}
