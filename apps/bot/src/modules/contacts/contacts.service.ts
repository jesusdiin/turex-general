import { supabase } from "../../lib/supabase";

export interface WaContact {
  id: string;
  whatsapp_from: string;
  display_name: string | null;
  phone: string | null;
}

export const phoneFromWaFrom = (waFrom: string): string =>
  waFrom.replace(/^whatsapp:/, "");

export const contactsService = {
  async upsert(input: {
    waFrom: string;
    displayName?: string;
    phone?: string;
  }): Promise<WaContact> {
    const { data, error } = await supabase
      .from("wa_contacts")
      .upsert(
        {
          whatsapp_from: input.waFrom,
          display_name: input.displayName ?? null,
          phone: input.phone ?? phoneFromWaFrom(input.waFrom),
        },
        { onConflict: "whatsapp_from", ignoreDuplicates: false }
      )
      .select()
      .single();
    if (error) throw error;
    return data as WaContact;
  },

  async updateName(waFrom: string, displayName: string): Promise<void> {
    const { error } = await supabase
      .from("wa_contacts")
      .update({ display_name: displayName })
      .eq("whatsapp_from", waFrom);
    if (error) throw error;
  },
};
