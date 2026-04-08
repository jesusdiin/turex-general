export type IntentName = "close_business" | "open_business" | "new_business";

export interface IntentMatch {
  name: IntentName;
  confidence: number;
  matched: string;
}

export interface IntentDetector {
  name: IntentName;
  detect(textNorm: string): IntentMatch | null;
}
