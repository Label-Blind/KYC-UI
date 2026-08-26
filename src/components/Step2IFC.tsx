import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
<<<<<<< Updated upstream
  categorize,
  listIngredients,
  type WeightedRecommendation,
=======
  listIngredients,
  predictCategory,
  type IngredientItem,
  type PredictCategoryResult,
>>>>>>> Stashed changes
} from '../api';

interface Props {
  rawMaterialName: string;
  onRawMaterialNameChange: (v: string) => void;
  onCategorySelected: (categoryId: string) => void;
}

export default function Step2IFC({ rawMaterialName, onRawMaterialNameChange, onCategorySelected }: Props) {
  const [knowCategory, setKnowCategory] = useState<'YES' | 'NO'>('YES');

  // YES flow
  const [level1, setLevel1] = useState('');
  const [level2, setLevel2] = useState('');
  const [level3, setLevel3] = useState('');
  const [level4, setLevel4] = useState('');
  const [level5, setLevel5] = useState('');
  const [level6, setLevel6] = useState('');
  const [proprietaryStatus, setProprietaryStatus] = useState('Not Applicable');
  const [proprietaryStatement, setProprietaryStatement] = useState('');

  // NO flow
  const [productDescription, setProductDescription] = useState('');
  const [selectedIngredients, setSelectedIngredients] = useState<IngredientItem[]>([]);
  const [ingredientOptions, setIngredientOptions] = useState<string[]>([]);
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [loadingIngredients, setLoadingIngredients] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PredictCategoryResult[]>([]);
  const [explanation, setExplanation] = useState('');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingIngredients(true);
      try {
        const items = await listIngredients(ingredientSearch || undefined, 200);
        if (!cancelled) setIngredientOptions(items);
      } catch {
        if (!cancelled) toast.error('Failed to load ingredients list');
      } finally {
        if (!cancelled) setLoadingIngredients(false);
      }
    };
    const t = setTimeout(load, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [ingredientSearch]);

  const selectedNames = useMemo(
    () => selectedIngredients.map((i) => i.ingredient),
    [selectedIngredients]
  );

  const filteredOptions = useMemo(
    () => ingredientOptions.filter((i) => !selectedNames.includes(i)),
    [ingredientOptions, selectedNames]
  );

  const addIngredient = (name: string) => {
    if (!name || selectedNames.includes(name)) return;
    setSelectedIngredients((prev) => [...prev, { ingredient: name, proportion: null, unit: null }]);
    setIngredientSearch('');
  };

  const removeIngredient = (name: string) => {
    setSelectedIngredients((prev) => prev.filter((i) => i.ingredient !== name));
  };

  const updateIngredientComposition = (
    name: string,
    field: 'proportion' | 'unit',
    value: string
  ) => {
    setSelectedIngredients((prev) =>
      prev.map((i) =>
        i.ingredient === name
          ? {
              ...i,
              [field]: field === 'proportion' ? (value === '' ? null : Number(value)) : value || null,
            }
          : i
      )
    );
  };

  const handleSubmitAI = async () => {
    if (!rawMaterialName.trim()) {
      toast.error('Product Name is required');
      return;
    }
    if (!productDescription.trim()) {
      toast.error('Product Description is required');
      return;
    }
    if (selectedIngredients.length === 0) {
      toast.error('Select at least one ingredient');
      return;
    }
    // Typing a name into the search box doesn't add it — only clicking the
    // suggestion does. Catch the case where text is sitting there unselected
    // so it isn't silently dropped from the ingredients sent to /categorize.
    if (ingredientSearch.trim()) {
      toast.error(
        `"${ingredientSearch.trim()}" wasn't added — click it in the suggestion list below the search box first`
      );
      return;
    }

    setLoading(true);
    setResults([]);
    setExplanation('');
    try {
<<<<<<< Updated upstream
      const data = await categorize({
        food_name: rawMaterialName.trim(),
        food_description: productDescription.trim(),
        ingredients: selectedIngredients,
        limit: 5,
      });

      if (data.error) {
        setExplanation(data.error);
        return;
      }

      // signal_contributions are already fractions of confidence_score, so the
      // three columns below sum exactly to Total — no separate formula to trust.
      const weighted: WeightedRecommendation[] = data.results.map((r, i) => ({
        category_id: r.category_id,
        category_name: r.category_name || r.category_id,
        food_name_confidence: Number(((r.signal_contributions.name ?? 0) * 100).toFixed(2)),
        food_description_confidence: Number(
          ((r.signal_contributions.description ?? 0) * 100).toFixed(2)
        ),
        ingredient_confidence: Number(((r.signal_contributions.ingredients ?? 0) * 100).toFixed(2)),
        total_confidence: r.confidence_score,
        is_preference: i === 0,
      }));

      setRecommendations(weighted);

      if (weighted.length > 0) {
        const pref = weighted[0];
        const w = data.applied_weights;
        const pct = (key: string) => Math.round((w[key] ?? 0) * 100);
        setExplanation(
          `Preference: "${pref.category_name}" (${pref.category_id}) — Total ${pref.total_confidence}% = ` +
            `Name ${pref.food_name_confidence}% (of ${pct('name')}% weight) + ` +
            `Description ${pref.food_description_confidence}% (of ${pct('description')}% weight) + ` +
            `Ingredients ${pref.ingredient_confidence}% (of ${pct('ingredients')}% weight).`
        );
      } else {
        setExplanation('No categories returned. Please select manually.');
=======
      const data = await predictCategory(
        selectedIngredients,
        rawMaterialName.trim(),
        productDescription.trim()
      );

      const top = data.results.slice(0, 5);
      setResults(top);

      if (top.length > 0) {
        const pref = top[0];
        setExplanation(
          `Preference: "${pref.category_name ?? pref.category_id}" (${pref.category_id}) — Final score ${pref.final_score}% = ` +
            `Name ${pref.name_confidence}%×40% + Description ${pref.description_confidence}%×30% + ` +
            `Ingredients ${pref.ingredient_verified ? 'verified' : 'not verified'}×30% (match source: ${data.match_source}).`
        );
      } else {
        setExplanation('No categories returned from the prediction API. Please select manually.');
>>>>>>> Stashed changes
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || e?.message || 'AI classification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCategory = (cat: PredictCategoryResult) => {
    toast.success(`Category "${cat.category_name ?? cat.category_id}" selected`);
    onCategorySelected(cat.category_id);
  };

  const handleReject = () => {
    if (!feedback.trim()) {
      toast.error('Justification is mandatory when rejecting AI recommendations');
      return;
    }
    setKnowCategory('YES');
    toast('Redirecting to manual category selection', { icon: '↩️' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Indian Food Category (IFC)</h2>
        <p className="text-sm text-gray-500 mt-1">
          Select your IFC category or describe your product to determine Permissibility of Ingredients.
        </p>
        <div className="mt-2 bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800">
          Add or check sub ingredients and additives to the table before proceeding.
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Do you know your Indian Food Category (IFC)?
        </label>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={knowCategory === 'YES'}
              onChange={() => setKnowCategory('YES')}
              className="w-4 h-4 text-indigo-600"
            />
            <span className="font-medium">YES</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={knowCategory === 'NO'}
              onChange={() => setKnowCategory('NO')}
              className="w-4 h-4 text-indigo-600"
            />
            <span className="font-medium">NO</span>
          </label>
        </div>
      </div>

      {knowCategory === 'YES' && (
        <div className="space-y-4 border-t pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <DropdownField label="Select Level 1 - Food Category" value={level1} onChange={setLevel1} placeholder="Level 1" />
            <DropdownField label="Select Level 2 - Sub Category" value={level2} onChange={setLevel2} placeholder="Level 2" />
            <DropdownField label="Select Level 3" value={level3} onChange={setLevel3} placeholder="Level 3" />
            <DropdownField label="Select Level 4" value={level4} onChange={setLevel4} placeholder="Level 4" />
            <DropdownField label="Select Level 5 - Food Name (Ingredient)" value={level5} onChange={setLevel5} placeholder="Level 5" />
            <DropdownField label="Select Level 6 - Food Name (Additive)" value={level6} onChange={setLevel6} placeholder="Level 6" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Proprietary or Novel Status</label>
              <select
                className="w-full border rounded-lg px-3 py-2"
                value={proprietaryStatus}
                onChange={(e) => setProprietaryStatus(e.target.value)}
              >
                <option>Not Applicable</option>
                <option>PROPRIETARY</option>
                <option>NOVEL</option>
              </select>
            </div>
            {proprietaryStatus === 'PROPRIETARY' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Proprietary Label Statement
                </label>
                <input
                  type="text"
                  maxLength={200}
                  className="w-full border rounded-lg px-3 py-2"
                  value={proprietaryStatement}
                  onChange={(e) => setProprietaryStatement(e.target.value)}
                  placeholder="e.g. Proprietary Food - Biscuits"
                />
                <span className="text-xs text-gray-400">{proprietaryStatement.length}/200</span>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              const cat = level4 || level3 || level2 || level1;
              if (!cat) {
                toast.error('Please select at least Level 1 category');
                return;
              }
              onCategorySelected(cat);
            }}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition"
          >
            Confirm Category & Proceed to Step 3
          </button>
        </div>
      )}

      {knowCategory === 'NO' && (
        <div className="space-y-4 border-t pt-4">
          <h3 className="font-semibold text-gray-700">Product Information Input</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
            <input
              type="text"
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={rawMaterialName}
              onChange={(e) => onRawMaterialNameChange(e.target.value)}
              placeholder="Enter product name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Description / Product Function *
            </label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 h-24"
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              placeholder="Describe the nature, purpose, functionality of the product..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ingredient List *
            </label>
            <div className="border rounded-lg p-3 space-y-2">
              <input
                type="text"
                className="w-full border rounded-lg px-3 py-2"
                value={ingredientSearch}
                onChange={(e) => setIngredientSearch(e.target.value)}
                placeholder={loadingIngredients ? 'Loading ingredients...' : 'Search and select ingredients from database'}
              />
              {filteredOptions.length > 0 && ingredientSearch.trim() && (
                <ul className="max-h-40 overflow-y-auto border rounded-lg divide-y bg-white">
                  {filteredOptions.slice(0, 50).map((ing) => (
                    <li key={ing}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-indigo-50 text-sm"
                        onClick={() => addIngredient(ing)}
                      >
                        {ing}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {selectedIngredients.length > 0 && (
                <div className="divide-y border rounded-lg bg-white mt-1">
                  {selectedIngredients.map((ing) => (
                    <div key={ing.ingredient} className="flex items-center gap-2 px-3 py-2">
                      <span className="flex-1 text-sm font-medium text-gray-800">{ing.ingredient}</span>
                      <input
                        type="number"
                        className="w-24 border rounded px-2 py-1 text-sm"
                        value={ing.proportion ?? ''}
                        onChange={(e) => updateIngredientComposition(ing.ingredient, 'proportion', e.target.value)}
                        placeholder="Proportion"
                      />
                      <select
                        className="border rounded px-2 py-1 text-sm"
                        value={ing.unit ?? ''}
                        onChange={(e) => updateIngredientComposition(ing.ingredient, 'unit', e.target.value)}
                      >
                        <option value="">unit</option>
                        <option value="mg">mg</option>
                        <option value="g">g</option>
                        <option value="%">%</option>
                        <option value="ml">ml</option>
                      </select>
                      <button
                        type="button"
                        className="text-red-500 hover:text-red-700 font-bold px-1"
                        onClick={() => removeIngredient(ing.ingredient)}
                        title="Remove ingredient"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

<<<<<<< Updated upstream
          <div className="bg-gray-50 border rounded-lg p-3 text-xs text-gray-600">
            <strong>Confidence weightage:</strong> Food Name 40% + Food Description 30% + Ingredients 30% = Total 100%
          </div>

=======
>>>>>>> Stashed changes
          <button
            onClick={handleSubmitAI}
            disabled={loading}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {loading ? 'Classifying...' : 'Submit for AI Classification'}
          </button>

          {results.length > 0 && (
            <div className="mt-6 space-y-4">
              <h3 className="font-semibold text-gray-800">Submitted Details</h3>
              <div className="bg-gray-50 border rounded-lg p-3 text-sm space-y-2">
                <div>
                  <span className="font-medium text-gray-700">Food Name: </span>
                  {rawMaterialName}
                </div>
                <div>
                  <span className="font-medium text-gray-700">Description: </span>
                  {productDescription}
                </div>
                <div>
                  <span className="font-medium text-gray-700">Ingredients (composition): </span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedIngredients.map((ing) => (
                      <span
                        key={ing.ingredient}
                        className="inline-flex items-center bg-indigo-100 text-indigo-800 text-xs font-medium px-2 py-1 rounded-full"
                      >
                        {ing.ingredient}
                        {ing.proportion != null && ` — ${ing.proportion}${ing.unit ?? ''}`}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <h3 className="font-semibold text-gray-800">AI Category Recommendations</h3>

              {explanation && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                  {explanation}
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm border">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border px-2 py-2 text-left">Category</th>
                      <th className="border px-2 py-2 text-right">Name (40%)</th>
                      <th className="border px-2 py-2 text-right">Description (30%)</th>
<<<<<<< Updated upstream
                      <th className="border px-2 py-2 text-right">Ingredient Match (30%)</th>
                      <th className="border px-2 py-2 text-right">Total</th>
=======
                      <th className="border px-2 py-2 text-right">Ingredients Verified (30%)</th>
                      <th className="border px-2 py-2 text-right">Score</th>
>>>>>>> Stashed changes
                      <th className="border px-2 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => (
                      <tr key={r.category_id} className={i === 0 ? 'bg-green-50' : ''}>
                        <td className="border px-2 py-2">
                          <div className="font-medium">{r.category_name ?? r.category_id}</div>
                          <div className="text-xs text-gray-500">{r.category_id}</div>
                          {i === 0 && (
                            <span className="text-xs font-semibold text-green-700">Preference</span>
                          )}
                        </td>
<<<<<<< Updated upstream
                        <td className="border px-2 py-2 text-right">{r.food_name_confidence.toFixed(1)}%</td>
                        <td className="border px-2 py-2 text-right">{r.food_description_confidence.toFixed(1)}%</td>
                        <td className="border px-2 py-2 text-right">{r.ingredient_confidence.toFixed(1)}%</td>
=======
                        <td className="border px-2 py-2 text-right">{r.name_confidence.toFixed(1)}%</td>
                        <td className="border px-2 py-2 text-right">{r.description_confidence.toFixed(1)}%</td>
                        <td className="border px-2 py-2 text-right">
                          {r.ingredient_verified ? (
                            <span className="text-green-700 font-medium">Yes</span>
                          ) : (
                            <span className="text-red-600 font-medium">No</span>
                          )}
                        </td>
>>>>>>> Stashed changes
                        <td className="border px-2 py-2 text-right font-semibold">
                          <ConfidenceBadge score={r.final_score} />
                        </td>
                        <td className="border px-2 py-2 text-center">
                          <button
                            onClick={() => handleSelectCategory(r)}
                            className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                          >
                            Select
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

<<<<<<< Updated upstream
              <div className="text-xs text-gray-500">
                Total = Name (40%) + Description (30%) + Ingredient Match (30%). Columns already show each
                signal's contribution to Total, so they add up.
              </div>

=======
>>>>>>> Stashed changes
              <div className="border-t pt-4 space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Feedback <span className="text-gray-400">(optional if accepting; mandatory if rejecting)</span>
                </label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 h-16"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Optional: why did you choose/reject this recommendation?"
                />
                <button
                  onClick={handleReject}
                  className="text-red-600 border border-red-300 px-4 py-2 rounded-lg font-medium hover:bg-red-50 transition"
                >
                  Reject All & Choose Manually
                </button>
              </div>

              <div className="bg-gray-100 rounded-lg p-3 text-xs text-gray-600 italic">
                The AI recommendation is advisory and intended to assist users in identifying the most likely IFC
                category and associated product standard. The final category selection shall always require user
                confirmation or manual selection where necessary.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DropdownField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="text"
        className="w-full border rounded-lg px-3 py-2"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function ConfidenceBadge({ score }: { score: number }) {
  let color = 'bg-red-100 text-red-800';
  let label = 'Low';
  if (score >= 90) {
    color = 'bg-green-100 text-green-800';
    label = 'High';
  } else if (score >= 75) {
    color = 'bg-yellow-100 text-yellow-800';
    label = 'Medium';
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {score.toFixed(1)}% - {label}
    </span>
  );
}
