import axios from 'axios';

/** Vite inlines this at build time. Amplify env vars only work if this is referenced here. */
const apiBase = (
  import.meta.env.VITE_API_TARGET || 'https://ai.dev.foodlabelsolutions.com'
).replace(/\/$/, '');

const api = axios.create({
  baseURL: apiBase,
  headers: { 'X-API-Key': 'supersecretapikey123' },
});

export interface CategoryResult {
  category_id: string;
  category_name: string;
  score: number;
  confidence_score: number;
}

export interface IngredientItem {
  ingredient: string;
  proportion?: number | null;
  unit?: string | null;
}

export interface AdditiveItem {
  additive: string;
  proportion?: number | null;
  unit?: string | null;
}

export interface PermittedCategory {
  food_category_system: string;
  matched_ingredients?: string[];
  matched_additives?: string[];
}

export interface CategorizeSignalEvidence {
  [key: string]: unknown;
}

export interface CategorizeSignal {
  match_type: string | null;
  used: boolean;
  categories_considered: number;
  ingredient_count?: number;
  matched_ingredient_count?: number;
  evidence: CategorizeSignalEvidence[];
}

export interface CategorizeResultRow {
  category_id: string;
  category_name: string | null;
  score: number;
  confidence_score: number;
  signal_contributions: Record<string, number>;
  signal_shares: Record<string, number>;
}

export interface CategorizeResponse {
  query: {
    food_name: string | null;
    food_description: string | null;
    ingredients: string[] | null;
  };
  applied_weights: Record<string, number>;
  configured_weights: Record<string, number>;
  signals: Record<string, CategorizeSignal>;
  results: CategorizeResultRow[];
  error?: string;
}

export async function listIngredients(q?: string, limit = 200) {
  const { data } = await api.get<{ ingredients: string[] }>('/kyc/ingredients', {
    params: { q: q || undefined, limit },
  });
  return data.ingredients;
}

export async function listAdditives(q?: string, limit = 200) {
  const { data } = await api.get<{ additives: string[] }>('/kyc/additives', {
    params: { q: q || undefined, limit },
  });
  return data.additives;
}

export async function predictByDescription(food_description: string) {
  const { data } = await api.get<{
    query: string;
    match_type: string;
    results: CategoryResult[];
  }>('/kyc/predict_category_using_food_description', {
    params: { food_description },
  });
  return data;
}

export async function predictByName(food_name: string) {
  const { data } = await api.get<{
    query: string;
    match_type: string;
    results: CategoryResult[];
  }>('/kyc/predict_category_using_food_name', { params: { food_name } });
  return data;
}

export async function getCategoryById(category_id: string) {
  const { data } = await api.get<{
    category_id: string;
    category_name: string;
  }>(`/category_id/${category_id}`);
  return data;
}

export async function checkPermittedIngredients(ingredient_list: IngredientItem[]) {
  const { data } = await api.post<{
    ingredient_list: IngredientItem[];
    ingredient_names: string[];
    query_length: number;
    categories: PermittedCategory[];
  }>('/kyc/check_permitted_ingredients', { ingredient_list });
  return data;
}

export async function checkPermittedAdditives(additive_list: AdditiveItem[]) {
  const { data } = await api.post<{
    additive_list: AdditiveItem[];
    additive_names: string[];
    query_length: number;
    categories: PermittedCategory[];
  }>('/kyc/check_permitted_additives', { additive_list });
  return data;
}

export interface PredictCategoryResult {
  category_id: string;
  category_name: string | null;
  name_confidence: number;
  description_confidence: number;
  ingredient_verified: boolean;
  final_score: number;
}

export interface PredictCategoryResponse {
  food_name: string;
  food_description: string;
  ingredient_names: string[];
  additive_names?: string[];
  match_source: string;
  name_candidates: number;
  description_candidates: number;
  intersected_candidates: number;
  results: PredictCategoryResult[];
}

/** Single backend call that blends food-name, food-description, and
 * ingredient/additive permissibility signals into one ranked list (name 40% +
 * description 30% + permissibility 30%). */
export async function predictCategory(
  ingredient_list: IngredientItem[],
  food_name: string,
  food_description: string,
  additive_list: AdditiveItem[] = []
) {
  const { data } = await api.post<PredictCategoryResponse>(
    '/kyc/predict_category',
    { ingredient_list, additive_list },
    { params: { food_name, food_description } }
  );
  return data;
}
