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

export interface WeightedRecommendation {
  category_id: string;
  category_name: string;
  food_name_confidence: number;
  food_description_confidence: number;
  ingredient_confidence: number;
  total_confidence: number;
  is_preference: boolean;
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

<<<<<<< Updated upstream
/**
 * Single call replacing the old client-side name/description/ingredient
 * fusion: the backend does the weighting (default name 40% / description
 * 30% / ingredients 30%) and returns a per-category breakdown that already
 * sums to `confidence_score`.
 */
export async function categorize(params: {
  food_name?: string;
  food_description?: string;
  ingredients?: string[];
  limit?: number;
}) {
  const { data } = await api.post<CategorizeResponse>('/kyc/categorize', params);
  return data;
}

/**
 * The prediction APIs return zero-padded category ids (`01.1.1.1`, and
 * occasionally a bare number like 12.1), while the ingredient collection stores
 * them unpadded (`1.1.1.1`). Normalise before crossing between the two.
 */
export function normalizeCategoryCode(code: string | number): string {
  return String(code)
    .split('.')
    .map((seg) => seg.replace(/^0+(?=\d)/, ''))
    .join('.');
}

export async function verifyIngredients(
  ingredient_list: IngredientItem[],
  food_category_system: string | number
) {
  const { data } = await api.post<{
    food_category_system: string;
    verified: boolean;
  }>('/kyc/verify_ingredients', {
    ingredient_list,
    food_category_system: normalizeCategoryCode(food_category_system),
  });
  return data;
=======
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
  match_source: string;
  name_candidates: number;
  description_candidates: number;
  intersected_candidates: number;
  results: PredictCategoryResult[];
}

/** Single backend call that blends food-name, food-description, and
 * ingredient-permissibility signals into one ranked list (name 40% +
 * description 30% + ingredient-verified 30%). */
export async function predictCategory(
  ingredient_list: IngredientItem[],
  food_name: string,
  food_description: string
) {
  const { data } = await api.post<PredictCategoryResponse>(
    '/kyc/predict_category',
    { ingredient_list },
    { params: { food_name, food_description } }
  );
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
>>>>>>> Stashed changes
}
