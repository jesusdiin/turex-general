import { supabase } from "./supabase";

export interface Industry {
  id: string;
  slug: string;
  name: string;
}

const KEYWORDS: Record<string, string[]> = {
  hotel: ["hotel", "hostal", "posada", "alojamiento", "hospedaje", "cabaña", "cabana"],
  restaurant: [
    "taco", "tacos", "restauran", "comida", "comidas", "bar", "café", "cafe",
    "cafeteria", "cafetería", "pizzer", "parrilla", "puesto", "cocina",
    "quesadilla", "burrito", "hamburgues", "sushi", "panaderia", "panadería",
  ],
};

let cache: { at: number; data: Industry[] } | null = null;
const TTL_MS = 60_000;

async function list(): Promise<Industry[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.data;
  const { data, error } = await supabase
    .from("industries")
    .select("id, slug, name")
    .order("name");
  if (error) throw error;
  cache = { at: Date.now(), data: (data ?? []) as Industry[] };
  return cache.data;
}

async function inferFromText(
  text: string
): Promise<{ industry: Industry; matched: string } | null> {
  const t = text.toLowerCase();
  const industries = await list();
  for (const ind of industries) {
    const kws = KEYWORDS[ind.slug] ?? [];
    const hit = kws.find((k) => t.includes(k));
    if (hit) return { industry: ind, matched: hit };
  }
  return null;
}

async function getBySlug(slug: string): Promise<Industry | null> {
  const all = await list();
  return all.find((i) => i.slug === slug) ?? null;
}

async function getById(id: string): Promise<Industry | null> {
  const all = await list();
  return all.find((i) => i.id === id) ?? null;
}

export const industriesService = { list, inferFromText, getBySlug, getById };
