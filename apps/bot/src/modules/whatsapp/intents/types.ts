export type IntentName =
  | "close_business"
  | "open_business"
  | "new_business"
  | "add_product"
  | "list_products"
  | "delete_product"
  | "edit_product"
  | "menu";

export interface IntentMatch {
  name: IntentName;
  confidence: number;
  matched: string;
}

export interface IntentDetector {
  name: IntentName;
  detect(textNorm: string): IntentMatch | null;
}
