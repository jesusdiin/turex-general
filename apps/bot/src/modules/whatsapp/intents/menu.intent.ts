import { IntentDetector, IntentMatch } from "./types";
import { normalize } from "./normalize";

const PHRASES = ["menu", "menú", "inicio", "volver", "principal", "home"];

export const menuIntent: IntentDetector = {
  name: "menu",
  detect(t: string): IntentMatch | null {
    for (const p of PHRASES) {
      const n = normalize(p);
      if (t === n || t.startsWith(n + " ") || t.endsWith(" " + n)) {
        return { name: "menu", confidence: 1.0, matched: p };
      }
    }
    return null;
  },
};
