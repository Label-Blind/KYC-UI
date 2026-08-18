import axios from 'axios';

const api = axios.create({
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
  proportion: number | null;
  unit: string | null;
}

export interface PermittedCategory {
  food_category_system: string;
  matched_ingredients: string[];
}

/** Weightages from KYC classification sheet */
export const CONFIDENCE_WEIGHTS = {
  food_name: 0.4,
  food_description: 0.3,
  intended_use: 0.2,
  known_specifications: 0.1,
} as const;

export interface WeightedRecommendation {
  category_id: string;
  category_name: string;
  food_name_confidence: number;
  food_description_confidence: number;
  intended_use_confidence: number;
  known_specifications_confidence: number;
  total_confidence: number;
  matched_ingredients: string[];
  ingredient_match_count: number;
  is_preference: boolean;
}

export async function listIngredients(q?: string, limit = 200) {
  const { data } = await api.get<{ ingredients: string[] }>('/kyc/ingredients', {
    params: { q: q || undefined, limit },
  });
  return data.ingredients;
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

export function computeWeightedConfidence(parts: {
  food_name: number;
  food_description: number;
  intended_use: number;
  known_specifications: number;
}): number {
  return (
    parts.food_name * CONFIDENCE_WEIGHTS.food_name +
    parts.food_description * CONFIDENCE_WEIGHTS.food_description +
    parts.intended_use * CONFIDENCE_WEIGHTS.intended_use +
    parts.known_specifications * CONFIDENCE_WEIGHTS.known_specifications
  );
}
