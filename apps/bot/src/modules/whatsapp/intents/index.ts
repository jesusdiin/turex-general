import { closeBusinessIntent } from "./close-business.intent";
import { openBusinessIntent } from "./open-business.intent";
import { newBusinessIntent } from "./new-business.intent";
import { normalize } from "./normalize";
import { IntentDetector, IntentMatch } from "./types";

const DETECTORS: IntentDetector[] = [
  closeBusinessIntent,
  openBusinessIntent,
  newBusinessIntent,
];

export function detectIntent(text: string): IntentMatch | null {
  const t = normalize(text);
  if (!t) return null;
  for (const d of DETECTORS) {
    const m = d.detect(t);
    if (m) return m;
  }
  return null;
}

export type { IntentMatch, IntentName, IntentDetector } from "./types";
