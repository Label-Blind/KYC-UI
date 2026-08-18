import { Toaster } from 'react-hot-toast';
import Step2IFC from './components/Step2IFC';
import Step3Permissibility from './components/Step3Permissibility';
import { useState } from 'react';

export default function App() {
  const [step, setStep] = useState<2 | 3>(2);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [rawMaterialName, setRawMaterialName] = useState('');

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      <header className="bg-indigo-700 text-white px-6 py-4 shadow-md">
        <h1 className="text-xl font-bold">KYC - Know Your Category</h1>
      </header>

      <nav className="flex gap-1 px-6 pt-4">
        <button
          onClick={() => setStep(2)}
          className={`px-4 py-2 rounded-t font-medium ${
            step === 2
              ? 'bg-white text-indigo-700 border border-b-0'
              : 'bg-gray-200 text-gray-600'
          }`}
        >
          Step 2 - Indian Food Category (IFC)
        </button>
        <button
          onClick={() => setStep(3)}
          className={`px-4 py-2 rounded-t font-medium ${
            step === 3
              ? 'bg-white text-indigo-700 border border-b-0'
              : 'bg-gray-200 text-gray-600'
          }`}
        >
          Step 3 - Raw Material Permissibility
        </button>
      </nav>

      <main className="bg-white mx-6 p-6 border rounded-b shadow-sm">
        {step === 2 && (
          <Step2IFC
            rawMaterialName={rawMaterialName}
            onRawMaterialNameChange={setRawMaterialName}
            onCategorySelected={(cat) => {
              setSelectedCategory(cat);
              setStep(3);
            }}
          />
        )}
        {step === 3 && (
          <Step3Permissibility
            selectedCategory={selectedCategory}
            rawMaterialName={rawMaterialName}
          />
        )}
      </main>
    </div>
  );
}
