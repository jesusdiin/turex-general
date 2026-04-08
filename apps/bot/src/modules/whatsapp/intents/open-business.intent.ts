import { IntentDetector, IntentMatch } from "./types";

const KEYWORDS: RegExp[] = [
  /\babrir\b/,
  /\babierto(s|a|as)?\b/,
  /\babrimos\b/,
  /\babriendo\b/,
  /\babri\b/,
  /\babro\b/,
];

const PHRASES: string[] = [
  "ya abri",
  "vamos a abrir",
  "voy a abrir",
  "recien abri",
  "estamos abiertos",
  "abrir negocio",
  "negocio abierto",
];

export const openBusinessIntent: IntentDetector = {
  name: "open_business",
  detect(t): IntentMatch | null {
    for (const re of KEYWORDS) {
      const m = t.match(re);
      if (m) return { name: "open_business", confidence: 1, matched: m[0] };
    }
    for (const p of PHRASES) {
      if (t.includes(p)) return { name: "open_business", confidence: 0.7, matched: p };
    }
    return null;
  },
};
