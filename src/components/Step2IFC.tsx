import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  listIngredients,
  listAdditives,
  predictCategory,
  type IngredientItem,
  type AdditiveItem,
  type PredictCategoryResult,
} from '../api';

interface Props {
  rawMaterialName: string;
  onRawMaterialNameChange: (v: string) => void;
  onCategorySelected: (categoryId: string) => void;
}

export interface CompositionItem {
  name: string;
  type: 'Ingredient' | 'Additive';
  proportion: number | null;
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
  const [activeTab, setActiveTab] = useState<'ingredients' | 'additives'>('ingredients');

  // Single unified composition list
  const [composition, setComposition] = useState<CompositionItem[]>([]);

  // Ingredients autocomplete state
  const [ingredientOptions, setIngredientOptions] = useState<string[]>([]);
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [loadingIngredients, setLoadingIngredients] = useState(false);

  // Additives autocomplete state
  const [additiveOptions, setAdditiveOptions] = useState<string[]>([]);
  const [additiveSearch, setAdditiveSearch] = useState('');
  const [loadingAdditives, setLoadingAdditives] = useState(false);

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PredictCategoryResult[]>([]);
  const [explanation, setExplanation] = useState('');
  const [feedback, setFeedback] = useState('');

  // Fetch ingredients autocomplete
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

  // Fetch additives autocomplete
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingAdditives(true);
      try {
        const items = await listAdditives(additiveSearch || undefined, 200);
        if (!cancelled) setAdditiveOptions(items);
      } catch {
        if (!cancelled) toast.error('Failed to load additives list');
      } finally {
        if (!cancelled) setLoadingAdditives(false);
      }
    };
    const t = setTimeout(load, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [additiveSearch]);

  const selectedNames = useMemo(
    () => composition.map((i) => i.name.toLowerCase()),
    [composition]
  );

  const filteredOptions = useMemo(
    () => ingredientOptions.filter((i) => !selectedNames.includes(i.toLowerCase())),
    [ingredientOptions, selectedNames]
  );

  const filteredAdditiveOptions = useMemo(
    () => additiveOptions.filter((a) => !selectedNames.includes(a.toLowerCase())),
    [additiveOptions, selectedNames]
  );

  const addItem = (name: string, type: 'Ingredient' | 'Additive') => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (selectedNames.includes(trimmed.toLowerCase())) {
      toast.error(`"${trimmed}" is already in the list`);
      return;
    }
    setComposition((prev) => [...prev, { name: trimmed, type, proportion: null }]);
    if (type === 'Ingredient') setIngredientSearch('');
    else setAdditiveSearch('');
  };

  const removeItem = (index: number) => {
    setComposition((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItemProportion = (index: number, value: string) => {
    setComposition((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
            ...item,
            proportion: value === '' ? null : Number(value),
          }
          : item
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

    // Auto-commit any custom text currently sitting in search inputs
    const currentComposition = [...composition];
    if (ingredientSearch.trim()) {
      const customName = ingredientSearch.trim();
      if (!currentComposition.some(c => c.name.toLowerCase() === customName.toLowerCase())) {
        currentComposition.push({ name: customName, type: 'Ingredient', proportion: null });
        setComposition(currentComposition);
      }
      setIngredientSearch('');
    }

    if (additiveSearch.trim()) {
      const customAdd = additiveSearch.trim();
      if (!currentComposition.some(c => c.name.toLowerCase() === customAdd.toLowerCase())) {
        currentComposition.push({ name: customAdd, type: 'Additive', proportion: null });
        setComposition(currentComposition);
      }
      setAdditiveSearch('');
    }

    if (currentComposition.length === 0) {
      toast.error('Select or enter at least one ingredient or additive');
      return;
    }

    const ingredientList: IngredientItem[] = currentComposition
      .filter((c) => c.type === 'Ingredient')
      .map((c) => ({ ingredient: c.name, proportion: c.proportion }));

    const additiveList: AdditiveItem[] = currentComposition
      .filter((c) => c.type === 'Additive')
      .map((c) => ({ additive: c.name, proportion: c.proportion }));

    setLoading(true);
    setResults([]);
    setExplanation('');
    try {
      const data = await predictCategory(
        ingredientList,
        rawMaterialName.trim(),
        productDescription.trim(),
        additiveList
      );

      // Prioritize Standard products (ingredient_verified === true) highest, even if score is less,
      // followed by Proprietary products (ingredient_verified === false), both ordered by final_score descending
      const sorted = [...(data.results || [])].sort((a, b) => {
        if (a.ingredient_verified !== b.ingredient_verified) {
          return a.ingredient_verified ? -1 : 1;
        }
        return b.final_score - a.final_score;
      });

      const top = sorted.slice(0, 5);
      setResults(top);

      if (top.length > 0) {
        const pref = top[0];
        const tag = pref.ingredient_verified ? 'Standard' : 'Proprietary';
        const parts: string[] = [];
        if (ingredientList.length > 0) parts.push(`${ingredientList.length} ingredient(s)`);
        if (additiveList.length > 0) parts.push(`${additiveList.length} additive(s)`);

        setExplanation(
          `Preference: "${pref.category_name ?? pref.category_id}" (${pref.category_id}) [Permissibility: ${tag}] — Final score ${pref.final_score.toFixed(1)}% = ` +
          `Name ${pref.name_confidence.toFixed(1)}%×40% + Description ${pref.description_confidence.toFixed(1)}%×30% + ` +
          `Permissibility (${parts.join(', ')}) ${pref.ingredient_verified ? 'verified (Standard)' : 'not verified (Proprietary)'}×30% (match source: ${data.match_source}).`
        );
      } else {
        setExplanation('No categories returned from the prediction API. Please select manually.');
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || e?.message || 'AI classification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCategory = (cat: PredictCategoryResult) => {
    const tag = cat.ingredient_verified ? 'Standard' : 'Proprietary';
    toast.success(`Category "${cat.category_name ?? cat.category_id}" (${tag}) selected`);
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
              Product Description *
            </label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 h-24"
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              placeholder="Describe the nature, purpose, functionality of the product..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Composition (Ingredients & Food Additives) *
            </label>

            {/* Tabs for Add Ingredients / Add Additives */}
            <div className="border rounded-xl p-4 bg-white shadow-sm space-y-4">
              <div className="flex border-b border-gray-200 gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('ingredients')}
                  className={`pb-2.5 px-4 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${activeTab === 'ingredients'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                  <span>Add Ingredients</span>
                  {composition.filter(c => c.type === 'Ingredient').length > 0 && (
                    <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-bold">
                      {composition.filter(c => c.type === 'Ingredient').length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('additives')}
                  className={`pb-2.5 px-4 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${activeTab === 'additives'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                  <span>Add Food Additives</span>
                  {composition.filter(c => c.type === 'Additive').length > 0 && (
                    <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-bold">
                      {composition.filter(c => c.type === 'Additive').length}
                    </span>
                  )}
                </button>
              </div>

              {/* Tab Panel: Ingredients Search */}
              {activeTab === 'ingredients' && (
                <div className="space-y-3">
                  <div className="relative">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        value={ingredientSearch}
                        onChange={(e) => setIngredientSearch(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (ingredientSearch.trim()) {
                              addItem(ingredientSearch.trim(), 'Ingredient');
                            }
                          }
                        }}
                        placeholder={loadingIngredients ? 'Loading ingredients...' : 'Type or search ingredient (e.g. Cow Milk, Custom item) & press Enter'}
                      />
                      <button
                        type="button"
                        disabled={!ingredientSearch.trim()}
                        onClick={() => {
                          if (ingredientSearch.trim()) {
                            addItem(ingredientSearch.trim(), 'Ingredient');
                          }
                        }}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shadow-sm"
                      >
                        + Add Ingredient
                      </button>
                    </div>

                    {ingredientSearch.trim() && (
                      <ul className="absolute z-20 left-0 right-0 max-h-52 overflow-y-auto border rounded-lg divide-y bg-white shadow-xl mt-1">
                        {/* Custom option prompt */}
                        {!filteredOptions.some(o => o.toLowerCase() === ingredientSearch.trim().toLowerCase()) && (
                          <li className="bg-indigo-50/70 border-b">
                            <button
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-indigo-100 text-sm font-semibold text-indigo-700 flex items-center justify-between"
                              onClick={() => addItem(ingredientSearch.trim(), 'Ingredient')}
                            >
                              <span>+ Add &ldquo;{ingredientSearch.trim()}&rdquo; (Custom Ingredient)</span>
                              <span className="text-xs text-indigo-500 font-normal">Press Enter</span>
                            </button>
                          </li>
                        )}
                        {/* Matching options from database */}
                        {filteredOptions.slice(0, 50).map((ing) => (
                          <li key={ing}>
                            <button
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-indigo-50 text-sm font-medium text-gray-800"
                              onClick={() => addItem(ing, 'Ingredient')}
                            >
                              + {ing}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {/* Tab Panel: Additives Search */}
              {activeTab === 'additives' && (
                <div className="space-y-3">
                  <div className="relative">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        value={additiveSearch}
                        onChange={(e) => setAdditiveSearch(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (additiveSearch.trim()) {
                              addItem(additiveSearch.trim(), 'Additive');
                            }
                          }
                        }}
                        placeholder={loadingAdditives ? 'Loading additives...' : 'Type or search additive (e.g. Curcumins, INS 100, Custom Item) & press Enter'}
                      />
                      <button
                        type="button"
                        disabled={!additiveSearch.trim()}
                        onClick={() => {
                          if (additiveSearch.trim()) {
                            addItem(additiveSearch.trim(), 'Additive');
                          }
                        }}
                        className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 transition disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shadow-sm"
                      >
                        + Add Additive
                      </button>
                    </div>

                    {additiveSearch.trim() && (
                      <ul className="absolute z-20 left-0 right-0 max-h-52 overflow-y-auto border rounded-lg divide-y bg-white shadow-xl mt-1">
                        {/* Custom option prompt */}
                        {!filteredAdditiveOptions.some(o => o.toLowerCase() === additiveSearch.trim().toLowerCase()) && (
                          <li className="bg-amber-50/70 border-b">
                            <button
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-amber-100 text-sm font-semibold text-amber-800 flex items-center justify-between"
                              onClick={() => addItem(additiveSearch.trim(), 'Additive')}
                            >
                              <span>+ Add &ldquo;{additiveSearch.trim()}&rdquo; (Custom Additive)</span>
                              <span className="text-xs text-amber-600 font-normal">Press Enter</span>
                            </button>
                          </li>
                        )}
                        {/* Matching options from database */}
                        {filteredAdditiveOptions.slice(0, 50).map((add) => (
                          <li key={add}>
                            <button
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-amber-50 text-sm font-medium text-gray-800"
                              onClick={() => addItem(add, 'Additive')}
                            >
                              + {add}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {/* Single Unified Composition Table with Type Column */}
              <div className="pt-2 border-t space-y-2">
                <div className="flex justify-between items-center text-xs font-semibold text-gray-700">
                  <span>Composition List ({composition.length})</span>
                  {composition.length > 0 && (
                    <span className="text-gray-500 font-normal">
                      {composition.filter(c => c.type === 'Ingredient').length} Ingredient(s), {composition.filter(c => c.type === 'Additive').length} Additive(s)
                    </span>
                  )}
                </div>

                {composition.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b text-xs font-semibold text-gray-600">
                        <tr>
                          <th className="px-3 py-2 text-left">Item Name</th>
                          <th className="px-3 py-2 text-center w-36">Type</th>
                          <th className="px-3 py-2 text-right w-44">Proportion</th>
                          <th className="px-3 py-2 text-center w-12"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {composition.map((item, idx) => (
                          <tr key={`${item.name}-${idx}`} className="hover:bg-gray-50/70 transition">
                            <td className="px-3 py-2.5 font-medium text-gray-800">
                              {item.name}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${item.type === 'Ingredient'
                                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                                  }`}
                              >
                                {item.type}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <div className="inline-flex items-center justify-end">
                                <input
                                  type="number"
                                  className="w-24 border rounded-l px-2 py-1 text-sm text-right focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 border-r-0"
                                  value={item.proportion ?? ''}
                                  onChange={(e) => updateItemProportion(idx, e.target.value)}
                                  placeholder="Value"
                                />
                                <span className="bg-gray-100 border border-gray-300 text-gray-600 text-xs px-2 py-1 rounded-r font-medium select-none min-w-[42px] text-center">
                                  {item.type === 'Ingredient' ? 'g' : 'mg/kg'}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <button
                                type="button"
                                className="text-red-500 hover:text-red-700 font-bold px-2 py-1 text-base hover:bg-red-50 rounded transition"
                                onClick={() => removeItem(idx)}
                                title="Remove item"
                              >
                                ×
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 italic py-3 text-center border border-dashed rounded-lg bg-gray-50/50">
                    No ingredients or additives added yet. Type or search above to add.
                  </div>
                )}
              </div>
            </div>
          </div>

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
                {composition.length > 0 && (
                  <div>
                    <span className="font-medium text-gray-700">Composition ({composition.length}): </span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {composition.map((item, idx) => (
                        <span
                          key={`${item.name}-${idx}`}
                          className={`inline-flex items-center text-xs font-medium px-2 py-1 rounded-full border ${item.type === 'Ingredient'
                            ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                            : 'bg-amber-100 text-amber-800 border-amber-200'
                            }`}
                        >
                          <span className="font-bold mr-1">[{item.type}]</span>
                          {item.name}
                          {item.proportion != null && ` — ${item.proportion} ${item.type === 'Ingredient' ? 'g' : 'mg/kg'}`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
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
                      <th className="border px-2 py-2 text-center">Permissibility</th>
                      <th className="border px-2 py-2 text-right">Name (40%)</th>
                      <th className="border px-2 py-2 text-right">Description (30%)</th>
                      <th className="border px-2 py-2 text-center">Ingredient (30%)</th>
                      <th className="border px-2 py-2 text-right">Score</th>
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
                        <td className="border px-2 py-2 text-center">
                          {r.ingredient_verified ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              Standard
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300">
                              Proprietary
                            </span>
                          )}
                        </td>
                        <td className="border px-2 py-2 text-right">{r.name_confidence.toFixed(1)}%</td>
                        <td className="border px-2 py-2 text-right">{r.description_confidence.toFixed(1)}%</td>
                        <td className="border px-2 py-2 text-center">
                          {r.ingredient_verified ? (
                            <span className="text-green-700 font-medium">Yes</span>
                          ) : (
                            <span className="text-red-600 font-medium">No</span>
                          )}
                        </td>
                        <td className="border px-2 py-2 text-right font-semibold text-gray-800">
                          {r.final_score.toFixed(1)}%
                        </td>
                        <td className="border px-2 py-2 text-center">
                          <button
                            onClick={() => handleSelectCategory(r)}
                            className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 font-medium transition"
                          >
                            Select
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

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
