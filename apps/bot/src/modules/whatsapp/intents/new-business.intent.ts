import { IntentDetector, IntentMatch } from "./types";

const PHRASES: string[] = [
  "nuevo negocio",
  "registrar negocio",
  "agregar negocio",
  "otro negocio",
];

export const newBusinessIntent: IntentDetector = {
  name: "new_business",
  detect(t): IntentMatch | null {
    for (const p of PHRASES) {
      if (t.includes(p)) return { name: "new_business", confidence: 1, matched: p };
    }
    return null;
  },
};
