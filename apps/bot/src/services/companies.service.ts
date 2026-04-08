import { supabase } from "./supabase";

export interface Company {
  id: string;
  name: string;
  industry_id: string;
  location_text: string | null;
  business_phone: string | null;
}

export const companiesService = {
  async hasCompanyForContact(contactId: string): Promise<boolean> {
    const { count, error } = await supabase
      .from("company_contacts")
      .select("id", { count: "exact", head: true })
      .eq("contact_id", contactId);
    if (error) throw error;
    return (count ?? 0) > 0;
  },

  async createForContact(
    contactId: string,
    input: {
      name: string;
      industryId: string;
      locationText?: string | null;
      businessPhone?: string | null;
    }
  ): Promise<Company> {
    const { data: company, error: e1 } = await supabase
      .from("companies")
      .insert({
        name: input.name,
        industry_id: input.industryId,
        location_text: input.locationText ?? null,
        business_phone: input.businessPhone ?? null,
      })
      .select()
      .single();
    if (e1) throw e1;

    const { error: e2 } = await supabase
      .from("company_contacts")
      .insert({ contact_id: contactId, company_id: company.id, role: "OWNER" });
    if (e2) throw e2;

    return company as Company;
  },
};
