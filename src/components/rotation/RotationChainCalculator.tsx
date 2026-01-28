import { useState } from 'react';
import { useRotation } from '../../hooks/useRotation';
import { useUrlState } from '../../hooks/useUrlState';
import { ResultDisplay } from './ResultDisplay';
import { RotationStep } from './RotationStep';

export function RotationChainCalculator() {
  const { steps, result, addStep, removeStep, updateStep, reset } =
    useRotation();
  const { getShareUrl } = useUrlState();
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = getShareUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select and copy
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Rotation Chain</h2>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleShare}
            className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1"
          >
            {copied ? 'Copied!' : 'Share'}
          </button>
          <button
            type="button"
            onClick={reset}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Reset
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-4 text-center">
        Chain rotations around global axes. Each rotation is applied in order
        from left to right.
      </p>

      {/* Rotation Steps */}
      <div className="flex items-center justify-center gap-3 flex-wrap">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center gap-3">
            <RotationStep
              step={step}
              onUpdate={updateStep}
              onRemove={removeStep}
              canRemove={steps.length > 1}
            />
            {index < steps.length - 1 && (
              <span className="text-gray-400 text-2xl">→</span>
            )}
          </div>
        ))}

        <span className="text-gray-400 text-2xl">→</span>

        <button
          type="button"
          onClick={addStep}
          className="flex items-center justify-center w-10 h-10 bg-white border border-gray-300 border-dashed rounded-lg text-gray-400 hover:text-blue-500 hover:border-blue-500 transition-colors"
          title="Add rotation step"
        >
          +
        </button>
      </div>

      {/* Result */}
      <ResultDisplay result={result} />
    </div>
  );
}
