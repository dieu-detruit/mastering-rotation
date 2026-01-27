import { useCallback, useState } from 'react';
import { useAxisSwap } from '../../hooks/useAxisSwap';
import { useUrlState } from '../../hooks/useUrlState';
import { ResultDisplay } from '../rotation/ResultDisplay';
import {
  AxisVisualizer,
  type CameraState,
} from '../visualization/AxisVisualizer';

const IDENTITY_QUATERNION = { x: 0, y: 0, z: 0, w: 1 };

const DEFAULT_CAMERA: CameraState = {
  position: [-2, -2, 1.5],
  target: [0, 0, 0],
};

export function AxisSwapCalculator() {
  const { mapping, quaternion, result, rotateX, rotateY, rotateZ, reset } =
    useAxisSwap();
  const { getShareUrl } = useUrlState();
  const [copied, setCopied] = useState(false);
  const [cameraState, setCameraState] = useState<CameraState>(DEFAULT_CAMERA);

  const handleCameraChange = useCallback((state: CameraState) => {
    setCameraState(state);
  }, []);

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
        <h2 className="text-xl font-semibold text-gray-900">Axis Swap</h2>
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

      <p className="text-sm text-gray-500 mb-6 text-center">
        Swap axes using 90° rotations. Click buttons to rotate around global
        axes.
      </p>

      {/* Visualization and Controls */}
      <div className="flex items-center justify-center gap-8 mb-8">
        {/* Original Axes */}
        <div className="flex flex-col items-center">
          <span className="text-sm text-gray-500 mb-2">Original</span>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2">
            <AxisVisualizer
              quaternion={IDENTITY_QUATERNION}
              size={200}
              showOverlay={false}
              cameraState={cameraState}
              onCameraChange={handleCameraChange}
            />
          </div>
        </div>

        {/* Rotation Controls */}
        <div className="flex flex-col gap-3">
          <RotationButton
            label="X"
            color="red"
            onPositive={() => rotateX(true)}
            onNegative={() => rotateX(false)}
          />
          <RotationButton
            label="Y"
            color="green"
            onPositive={() => rotateY(true)}
            onNegative={() => rotateY(false)}
          />
          <RotationButton
            label="Z"
            color="blue"
            onPositive={() => rotateZ(true)}
            onNegative={() => rotateZ(false)}
          />
        </div>

        {/* Swapped Axes */}
        <div className="flex flex-col items-center">
          <span className="text-sm text-gray-500 mb-2">Swapped</span>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2">
            <AxisVisualizer
              quaternion={quaternion}
              size={200}
              showOverlay={false}
              cameraState={cameraState}
              onCameraChange={handleCameraChange}
            />
          </div>
        </div>
      </div>

      {/* Mapping Display */}
      <div className="flex justify-center gap-6 mb-6">
        <MappingItem from="X" to={mapping.x} color="red" />
        <MappingItem from="Y" to={mapping.y} color="green" />
        <MappingItem from="Z" to={mapping.z} color="blue" />
      </div>

      {/* Result */}
      <ResultDisplay result={result} />
    </div>
  );
}

interface RotationButtonProps {
  label: string;
  color: 'red' | 'green' | 'blue';
  onPositive: () => void;
  onNegative: () => void;
}

function getButtonColorClass(color: 'red' | 'green' | 'blue'): string {
  switch (color) {
    case 'red':
      return 'bg-red-500 hover:bg-red-600';
    case 'green':
      return 'bg-green-500 hover:bg-green-600';
    case 'blue':
      return 'bg-blue-500 hover:bg-blue-600';
  }
}

function RotationButton({
  label,
  color,
  onPositive,
  onNegative,
}: RotationButtonProps) {
  const colorClass = getButtonColorClass(color);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onNegative}
        className={`w-10 h-10 rounded-lg text-white font-medium ${colorClass} transition-colors`}
        title={`-90° around ${label}`}
      >
        -
      </button>
      <span className="w-6 text-center font-semibold text-gray-700">
        {label}
      </span>
      <button
        type="button"
        onClick={onPositive}
        className={`w-10 h-10 rounded-lg text-white font-medium ${colorClass} transition-colors`}
        title={`+90° around ${label}`}
      >
        +
      </button>
    </div>
  );
}

interface MappingItemProps {
  from: string;
  to: string;
  color: 'red' | 'green' | 'blue';
}

function getTextColorClass(color: 'red' | 'green' | 'blue'): string {
  switch (color) {
    case 'red':
      return 'text-red-500';
    case 'green':
      return 'text-green-500';
    case 'blue':
      return 'text-blue-500';
  }
}

function MappingItem({ from, to, color }: MappingItemProps) {
  // Format the 'to' axis nicely (e.g., '-x' -> '-X')
  const formattedTo = to.toUpperCase();

  return (
    <div className="flex items-center gap-1 text-sm font-mono">
      <span className={`font-bold ${getTextColorClass(color)}`}>{from}</span>
      <span className="text-gray-400">→</span>
      <span className="text-gray-700">{formattedTo}</span>
    </div>
  );
}
