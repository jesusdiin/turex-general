import { supabase } from "../../lib/supabase";

export interface Industry {
  id: string;
  slug: string;
  name: string;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Keywords ya normalizadas (sin acentos, lowercase)
const KEYWORDS: Record<string, string[]> = {
  hotel: [
    "hotel", "hostal", "posada", "alojamiento", "hospedaje",
    "cabana", "motel", "airbnb", "hospedar",
  ],
  restaurant: [
    "restaurante", "restauran", "cafe", "cafeteria", "bar",
    "pizza", "pizzeria", "parrilla", "cocina", "sushi",
    "panaderia", "pasteleria", "dulceria", "marisqueria",
    "comida", "comidas", "taco", "tacos", "taqueria",
    "quesadilla", "burrito", "tortas", "torta",
    "hamburguesa", "hamburguesas", "mariscos",
    "pollo", "pollos", "asados",
  ],
  street_food: [
    "fonda", "fondas", "puesto", "puestos", "antojitos",
    "loncheria", "loncherias", "garnachas", "tianguis",
    "kiosko", "ambulante",
  ],
  artesanias: [
    "artesania", "artesanias", "artesano", "artesana",
    "manualidades", "bordado", "tejido", "talavera",
    "barro", "ceramica", "hilo", "telar", "rebozo",
  ],
  abarrotes: [
    "abarrotes", "abarrote", "tiendita",
    "miscelanea", "miscelaneas", "deposito", "ultramarinos",
  ],
  belleza: [
    "estetica", "esteticas", "salon", "barberia", "barber",
    "peluqueria", "estilista", "unas", "spa",
    "manicure", "pedicure", "maquillaje",
  ],
  taller: [
    "taller", "talleres", "mecanico", "mecanica",
    "refaccion", "refacciones", "electronica", "reparacion",
    "reparaciones", "vulcanizadora", "hojalateria", "pintura",
    "soldadura",
  ],
  ropa: [
    "ropa", "boutique", "vestido", "vestidos", "calzado",
    "zapato", "zapatos", "tenis", "moda", "accesorios",
    "playera", "playeras",
  ],
  lavanderia: [
    "lavanderia", "lavanderias", "tintoreria", "tintorerias",
    "lavado", "planchado",
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

function matches(textNorm: string, keyword: string): boolean {
  if (keyword.length >= 4) {
    const re = new RegExp(`\\b${keyword}\\b`, "i");
    return re.test(textNorm);
  }
  return textNorm.includes(keyword);
}

async function inferFromText(
  text: string
): Promise<{ industry: Industry; matched: string } | null> {
  const t = normalize(text);
  const industries = await list();
  for (const ind of industries) {
    const kws = KEYWORDS[ind.slug] ?? [];
    const hit = kws.find((k) => matches(t, k));
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
