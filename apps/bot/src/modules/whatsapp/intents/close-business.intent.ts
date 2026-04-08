import { IntentDetector, IntentMatch } from "./types";

const KEYWORDS: RegExp[] = [
  /\bcerrar\b/,
  /\bcerrado(s|a|as)?\b/,
  /\bcerramos\b/,
  /\bcerrando\b/,
  /\bcerre\b/,
  /\bcierro\b/,
  /\bcierre\b/,
];

const PHRASES: string[] = [
  "hora de cerrar",
  "ya cerre",
  "vamos a cerrar",
  "voy a cerrar",
  "terminamos por hoy",
  "negocio cerrado",
  "cerrar negocio",
];

export const closeBusinessIntent: IntentDetector = {
  name: "close_business",
  detect(t): IntentMatch | null {
    for (const re of KEYWORDS) {
      const m = t.match(re);
      if (m) return { name: "close_business", confidence: 1, matched: m[0] };
    }
    for (const p of PHRASES) {
      if (t.includes(p)) return { name: "close_business", confidence: 0.7, matched: p };
    }
    return null;
  },
};
