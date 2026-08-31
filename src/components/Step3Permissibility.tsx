import { useState } from 'react';
import toast from 'react-hot-toast';
import { checkPermittedIngredients, type IngredientItem, type PermittedCategory } from '../api';

interface Props {
  selectedCategory: string;
  rawMaterialName: string;
}

interface IngredientRow {
  id: number;
  type: 'Ingredient' | 'Flavour';
  class: string;
  name: string;
  foodGroup: string;
  permissibility: string;
  proportion: number | null;
  unit: string;
}

interface AdditiveRow {
  id: number;
  type: 'Additive';
  class: string;
  name: string;
  foodGroup: string;
  permissibility: string;
}

interface ComplianceChange {
  timestamp: string;
  field: string;
  oldValue: string;
  newValue: string;
  reason: string;
}

export default function Step3Permissibility({ selectedCategory, rawMaterialName }: Props) {
  const [ingredients, setIngredients] = useState<IngredientRow[]>([
    { id: 1, type: 'Ingredient', class: '', name: '', foodGroup: '', permissibility: '', proportion: null, unit: 'mg' },
  ]);
  const [additives, setAdditives] = useState<AdditiveRow[]>([
    { id: 1, type: 'Additive', class: '', name: '', foodGroup: '', permissibility: '' },
  ]);
  const [complianceLog, setComplianceLog] = useState<ComplianceChange[]>([]);
  const [showComplianceLog, setShowComplianceLog] = useState(false);
  const [permittedCategories, setPermittedCategories] = useState<PermittedCategory[]>([]);
  const [loading, setLoading] = useState(false);

  const [overrideModal, setOverrideModal] = useState<{
    table: 'ingredient' | 'additive';
    rowId: number;
    newValue: string;
  } | null>(null);
  const [overrideReason, setOverrideReason] = useState('');

  if (!selectedCategory) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-gray-500">
          Please complete IFC category selection in Step 2 before proceeding.
        </p>
        <p className="text-sm text-gray-400 mt-2">
          Select a full category path or clear all levels.
        </p>
      </div>
    );
  }

  const handleCheckPermissibility = async () => {
    const items: IngredientItem[] = ingredients
      .filter((r) => r.name.trim())
      .map((r) => ({
        ingredient: r.name,
        proportion: r.proportion,
        unit: r.unit || null,
      }));

    if (items.length === 0) {
      toast.error('Add at least one ingredient');
      return;
    }

    setLoading(true);
    try {
      const data = await checkPermittedIngredients(items);
      setPermittedCategories(data.categories);

      setIngredients((prev) =>
        prev.map((row) => {
          if (!row.name.trim()) return row;
          const matchedCat = data.categories.find(
            (c) =>
              c.food_category_system === selectedCategory &&
              c.matched_ingredients?.some((m) => m.toLowerCase() === row.name.toLowerCase())
          );
          return {
            ...row,
            permissibility: matchedCat ? 'Permissible' : row.permissibility || 'Not Permissible',
          };
        })
      );
      toast.success('Permissibility checked');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to check permissibility');
    } finally {
      setLoading(false);
    }
  };

  const addIngredientRow = () => {
    setIngredients((prev) => [
      ...prev,
      { id: Date.now(), type: 'Ingredient', class: '', name: '', foodGroup: '', permissibility: '', proportion: null, unit: 'mg' },
    ]);
  };

  const removeIngredientRow = (id: number) => {
    setIngredients((prev) => prev.filter((r) => r.id !== id));
  };

  const addAdditiveRow = () => {
    setAdditives((prev) => [
      ...prev,
      { id: Date.now(), type: 'Additive', class: '', name: '', foodGroup: '', permissibility: '' },
    ]);
  };

  const removeAdditiveRow = (id: number) => {
    setAdditives((prev) => prev.filter((r) => r.id !== id));
  };

  const handlePermissibilityOverride = (
    table: 'ingredient' | 'additive',
    rowId: number,
    newValue: string
  ) => {
    setOverrideModal({ table, rowId, newValue });
    setOverrideReason('');
  };

  const confirmOverride = () => {
    if (!overrideModal) return;
    if (!overrideReason.trim()) {
      toast.error('Reason is required');
      return;
    }

    const { table, rowId, newValue } = overrideModal;

    if (table === 'ingredient') {
      setIngredients((prev) =>
        prev.map((r) => {
          if (r.id !== rowId) return r;
          setComplianceLog((log) => [
            ...log,
            {
              timestamp: new Date().toISOString(),
              field: `Ingredient "${r.name}" Permissibility`,
              oldValue: r.permissibility,
              newValue,
              reason: overrideReason,
            },
          ]);
          return { ...r, permissibility: newValue };
        })
      );
    } else {
      setAdditives((prev) =>
        prev.map((r) => {
          if (r.id !== rowId) return r;
          setComplianceLog((log) => [
            ...log,
            {
              timestamp: new Date().toISOString(),
              field: `Additive "${r.name}" Permissibility`,
              oldValue: r.permissibility,
              newValue,
              reason: overrideReason,
            },
          ]);
          return { ...r, permissibility: newValue };
        })
      );
    }

    toast.success('Permissibility overridden');
    setOverrideModal(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Raw Material Permissibility</h2>
        <p className="text-sm text-gray-500 mt-1">
          Selected Category: <span className="font-mono font-medium text-indigo-700">{selectedCategory}</span>
          {rawMaterialName && (
            <> | Product Name: <span className="font-medium">{rawMaterialName}</span></>
          )}
        </p>
      </div>

      <div>
        <h3 className="font-semibold text-gray-700 mb-2">Ingredients Table</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-3 py-2 text-left">Type</th>
                <th className="border px-3 py-2 text-left">Class</th>
                <th className="border px-3 py-2 text-left">Raw Material Composition</th>
                <th className="border px-3 py-2 text-left">Proportion</th>
                <th className="border px-3 py-2 text-left">Unit</th>
                <th className="border px-3 py-2 text-left">Food Group / Permissible</th>
                <th className="border px-3 py-2 text-left">Permissibility</th>
                <th className="border px-3 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {ingredients.map((row) => (
                <tr key={row.id}>
                  <td className="border px-3 py-1">
                    <select
                      className="border rounded px-2 py-1 w-full"
                      value={row.type}
                      onChange={(e) =>
                        setIngredients((prev) =>
                          prev.map((r) => (r.id === row.id ? { ...r, type: e.target.value as any } : r))
                        )
                      }
                    >
                      <option>Ingredient</option>
                      <option>Flavour</option>
                    </select>
                  </td>
                  <td className="border px-3 py-1">
                    <input
                      className="border rounded px-2 py-1 w-full bg-gray-50"
                      disabled={row.type === 'Ingredient'}
                      value={row.class}
                      onChange={(e) =>
                        setIngredients((prev) =>
                          prev.map((r) => (r.id === row.id ? { ...r, class: e.target.value } : r))
                        )
                      }
                      placeholder={row.type === 'Ingredient' ? '—' : 'e.g. FLAVOURS'}
                    />
                  </td>
                  <td className="border px-3 py-1">
                    <input
                      className="border rounded px-2 py-1 w-full"
                      value={row.name}
                      onChange={(e) =>
                        setIngredients((prev) =>
                          prev.map((r) => (r.id === row.id ? { ...r, name: e.target.value } : r))
                        )
                      }
                      placeholder="Ingredient name"
                      maxLength={200}
                    />
                  </td>
                  <td className="border px-3 py-1">
                    <input
                      type="number"
                      className="border rounded px-2 py-1 w-20"
                      value={row.proportion ?? ''}
                      onChange={(e) =>
                        setIngredients((prev) =>
                          prev.map((r) =>
                            r.id === row.id ? { ...r, proportion: e.target.value ? Number(e.target.value) : null } : r
                          )
                        )
                      }
                      placeholder="%"
                    />
                  </td>
                  <td className="border px-3 py-1">
                    <select
                      className="border rounded px-2 py-1"
                      value={row.unit}
                      onChange={(e) =>
                        setIngredients((prev) =>
                          prev.map((r) => (r.id === row.id ? { ...r, unit: e.target.value } : r))
                        )
                      }
                    >
                      <option>mg</option>
                      <option>g</option>
                      <option>%</option>
                      <option>ml</option>
                    </select>
                  </td>
                  <td className="border px-3 py-1">
                    <input
                      className="border rounded px-2 py-1 w-full"
                      value={row.foodGroup}
                      onChange={(e) =>
                        setIngredients((prev) =>
                          prev.map((r) => (r.id === row.id ? { ...r, foodGroup: e.target.value } : r))
                        )
                      }
                      placeholder="Auto / select"
                    />
                  </td>
                  <td className="border px-3 py-1">
                    <select
                      className={`border rounded px-2 py-1 w-full font-medium ${
                        row.permissibility === 'Permissible'
                          ? 'text-green-700'
                          : row.permissibility === 'Banned' || row.permissibility === 'Not Permissible'
                          ? 'text-red-700'
                          : ''
                      }`}
                      value={row.permissibility}
                      onChange={(e) => handlePermissibilityOverride('ingredient', row.id, e.target.value)}
                    >
                      <option value="">—</option>
                      <option value="Permissible">Permissible</option>
                      <option value="Not Permissible">Not Permissible</option>
                      <option value="Banned">Banned</option>
                      <option value="Proprietary">Proprietary</option>
                      <option value="Novel">Novel</option>
                    </select>
                  </td>
                  <td className="border px-3 py-1 text-center">
                    <button
                      onClick={() => removeIngredientRow(row.id)}
                      className="text-red-500 hover:text-red-700 font-bold"
                      title="Delete row"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex gap-3 mt-2">
          <button
            onClick={addIngredientRow}
            className="text-indigo-600 border border-indigo-300 px-3 py-1.5 rounded text-sm font-medium hover:bg-indigo-50"
          >
            + Add New Sub Ingredient
          </button>
          <button
            onClick={handleCheckPermissibility}
            disabled={loading}
            className="bg-indigo-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Checking...' : 'Check Permissibility'}
          </button>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-gray-700 mb-2">Additives Table</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-3 py-2 text-left">Type</th>
                <th className="border px-3 py-2 text-left">Class</th>
                <th className="border px-3 py-2 text-left">Raw Material Composition</th>
                <th className="border px-3 py-2 text-left">Food Group / Permissible</th>
                <th className="border px-3 py-2 text-left">Permissibility</th>
                <th className="border px-3 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {additives.map((row) => (
                <tr key={row.id}>
                  <td className="border px-3 py-1">
                    <span className="text-gray-600 font-medium">Additive</span>
                  </td>
                  <td className="border px-3 py-1">
                    <input
                      className="border rounded px-2 py-1 w-full"
                      value={row.class}
                      onChange={(e) =>
                        setAdditives((prev) =>
                          prev.map((r) => (r.id === row.id ? { ...r, class: e.target.value } : r))
                        )
                      }
                      placeholder="e.g. Colour, Preservative"
                    />
                  </td>
                  <td className="border px-3 py-1">
                    <input
                      className="border rounded px-2 py-1 w-full"
                      value={row.name}
                      onChange={(e) =>
                        setAdditives((prev) =>
                          prev.map((r) => (r.id === row.id ? { ...r, name: e.target.value } : r))
                        )
                      }
                      placeholder="Additive name / INS number"
                      maxLength={200}
                    />
                  </td>
                  <td className="border px-3 py-1">
                    <input
                      className="border rounded px-2 py-1 w-full"
                      value={row.foodGroup}
                      onChange={(e) =>
                        setAdditives((prev) =>
                          prev.map((r) => (r.id === row.id ? { ...r, foodGroup: e.target.value } : r))
                        )
                      }
                      placeholder="Auto / select"
                    />
                  </td>
                  <td className="border px-3 py-1">
                    <select
                      className={`border rounded px-2 py-1 w-full font-medium ${
                        row.permissibility === 'Permissible' ? 'text-green-700' : 'text-red-600'
                      }`}
                      value={row.permissibility}
                      onChange={(e) => handlePermissibilityOverride('additive', row.id, e.target.value)}
                    >
                      <option value="">—</option>
                      <option value="Permissible">Permissible</option>
                      <option value="Not Permissible">Not Permissible</option>
                    </select>
                  </td>
                  <td className="border px-3 py-1 text-center">
                    <button
                      onClick={() => removeAdditiveRow(row.id)}
                      className="text-red-500 hover:text-red-700 font-bold"
                      title="Delete row"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          onClick={addAdditiveRow}
          className="mt-2 text-indigo-600 border border-indigo-300 px-3 py-1.5 rounded text-sm font-medium hover:bg-indigo-50"
        >
          + Add New Sub Additive
        </button>
      </div>

      {permittedCategories.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-800 mb-2">Categories where ingredients are permitted:</h4>
          <div className="flex flex-wrap gap-2">
            {permittedCategories.map((c, i) => (
              <span
                key={i}
                className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                  c.food_category_system === selectedCategory
                    ? 'bg-green-200 text-green-900 ring-2 ring-green-500'
                    : 'bg-white text-gray-700 border'
                }`}
              >
                {c.food_category_system} {c.matched_ingredients ? `(${c.matched_ingredients.join(', ')})` : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="border-t pt-4">
        <button
          onClick={() => setShowComplianceLog(!showComplianceLog)}
          className="text-sm text-indigo-600 font-medium hover:underline"
        >
          {showComplianceLog ? 'Hide' : 'View'} Compliance Changes ({complianceLog.length})
        </button>

        {showComplianceLog && complianceLog.length > 0 && (
          <table className="w-full text-sm border mt-2">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-3 py-2 text-left">Timestamp</th>
                <th className="border px-3 py-2 text-left">Field</th>
                <th className="border px-3 py-2 text-left">Old Value</th>
                <th className="border px-3 py-2 text-left">New Value</th>
                <th className="border px-3 py-2 text-left">Reason</th>
              </tr>
            </thead>
            <tbody>
              {complianceLog.map((entry, i) => (
                <tr key={i}>
                  <td className="border px-3 py-1 text-xs">{new Date(entry.timestamp).toLocaleString()}</td>
                  <td className="border px-3 py-1">{entry.field}</td>
                  <td className="border px-3 py-1 text-red-600">{entry.oldValue || '—'}</td>
                  <td className="border px-3 py-1 text-green-600">{entry.newValue}</td>
                  <td className="border px-3 py-1">{entry.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {overrideModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-bold text-lg text-gray-800 mb-2">Are you sure you want to change?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Changing permissibility to <strong>{overrideModal.newValue}</strong>. This will be logged.
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason for change *</label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 h-20"
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              maxLength={250}
              placeholder="Add reason for change..."
            />
            <div className="flex gap-3 mt-4 justify-end">
              <button
                onClick={() => setOverrideModal(null)}
                className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmOverride}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
              >
                Confirm Change
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
