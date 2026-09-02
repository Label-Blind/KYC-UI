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

export type IngredientMatchStatus =
  | 'matched'
  | 'proportion_mismatch'
  | 'not_in_description';

export interface ExtractedIngredient {
  ingredient: string;
  proportion?: number;
  unit?: string;
  parent?: string;
  source_text?: string;
}

export interface IngredientMatchRow {
  submitted_ingredient: string;
  status: IngredientMatchStatus;
  /** How the pairing was decided: by the model, or by exact/normalised name. */
  match_type?: 'llm' | 'exact' | 'normalised' | 'partial_name';
  description_ingredient?: string;
  submitted_proportion?: number;
  submitted_unit?: string;
  description_proportion?: number;
  description_unit?: string;
  description_parent?: string;
  note?: string;
}

export interface MissingIngredient {
  description_ingredient: string;
  description_proportion?: number;
  description_unit?: string;
  parent?: string;
}

export interface VerifyIngredientsResponse {
  food_description: string;
  ingredient_statement_found: boolean;
  extracted_ingredients: ExtractedIngredient[];
  extracted_count: number;
  verdict: 'match' | 'partial_match' | 'mismatch';
  match_score: number;
  submitted_count: number;
  counts: Record<IngredientMatchStatus, number>;
  missing_in_submission_count: number;
  summary: string;
  submitted: IngredientMatchRow[];
  missing_in_submission: MissingIngredient[];
  metadata?: Record<string, unknown>;
}

/** Reads the ingredient statement out of the product description, then checks
 * the submitted ingredients against it — one row per submitted ingredient.
 * Additives are out of scope; send ingredients only. */
export async function verifyIngredientsWithDescription(
  food_description: string,
  ingredient_list: IngredientItem[]
) {
  const { data } = await api.post<VerifyIngredientsResponse>(
    '/kyc/verify_ingredients_with_description',
    { food_description, ingredient_list }
  );
  return data;
}
