import { supabase } from "./supabase";

export interface WaSession {
  wa_from: string;
  step: string;
  data: Record<string, any>;
}

export const sessionsService = {
  async get(waFrom: string): Promise<WaSession | null> {
    const { data, error } = await supabase
      .from("wa_sessions")
      .select("wa_from, step, data")
      .eq("wa_from", waFrom)
      .maybeSingle();
    if (error) throw error;
    return (data as WaSession) ?? null;
  },

  async set(waFrom: string, step: string, data: Record<string, any>): Promise<void> {
    const { error } = await supabase
      .from("wa_sessions")
      .upsert({ wa_from: waFrom, step, data }, { onConflict: "wa_from" });
    if (error) throw error;
  },

  async reset(waFrom: string): Promise<void> {
    const { error } = await supabase.from("wa_sessions").delete().eq("wa_from", waFrom);
    if (error) throw error;
  },
};
