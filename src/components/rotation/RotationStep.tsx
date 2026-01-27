import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import type { Axis, RotationStep as RotationStepType } from '../../types';
import { axisAngleToQuaternion, formatNumber } from '../../utils/rotation';
import {
  AxisVisualizer,
  type CameraState,
} from '../visualization/AxisVisualizer';

const IDENTITY_QUATERNION = { x: 0, y: 0, z: 0, w: 1 };

const DEFAULT_CAMERA: CameraState = {
  position: [-2, -2, 1.5],
  target: [0, 0, 0],
};

interface RotationStepProps {
  step: RotationStepType;
  onUpdate: (axis: Axis, angleDeg: number) => void;
  onRemove: () => void;
  canRemove: boolean;
}

const AXIS_OPTIONS: { value: Axis; label: string }[] = [
  { value: 'x', label: 'X axis' },
  { value: 'y', label: 'Y axis' },
  { value: 'z', label: 'Z axis' },
];

export function RotationStep({
  step,
  onUpdate,
  onRemove,
  canRemove,
}: RotationStepProps) {
  const { angleUnit } = useSettings();
  const [cameraState, setCameraState] = useState<CameraState>(DEFAULT_CAMERA);

  const handleCameraChange = useCallback((state: CameraState) => {
    setCameraState(state);
  }, []);

  const displayValue =
    angleUnit === 'deg' ? step.angleDeg : (step.angleDeg * Math.PI) / 180;
  const [inputValue, setInputValue] = useState(formatNumber(displayValue));

  useEffect(() => {
    const value =
      angleUnit === 'deg' ? step.angleDeg : (step.angleDeg * Math.PI) / 180;
    setInputValue(formatNumber(value));
  }, [step.angleDeg, angleUnit]);

  const quaternion = useMemo(() => {
    return axisAngleToQuaternion(step.axis, step.angleDeg);
  }, [step.axis, step.angleDeg]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    const parsed = parseFloat(value);
    if (!Number.isNaN(parsed)) {
      // Convert to degrees if input is in radians
      const degValue = angleUnit === 'deg' ? parsed : (parsed * 180) / Math.PI;
      onUpdate(step.axis, degValue);
    }
  };

  const handleBlur = () => {
    const parsed = parseFloat(inputValue);
    if (Number.isNaN(parsed)) {
      setInputValue('0');
      onUpdate(step.axis, 0);
    } else {
      setInputValue(formatNumber(parsed));
    }
  };

  return (
    <div className="flex flex-col items-center bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
      <div className="flex justify-between items-start mb-2 w-full">
        <select
          value={step.axis}
          onChange={(e) => onUpdate(e.target.value as Axis, step.angleDeg)}
          className="flex-1 bg-gray-50 border border-gray-300 rounded px-2 py-1 text-sm text-gray-900 focus:outline-none focus:border-blue-500"
        >
          {AXIS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-gray-400 hover:text-red-500 text-sm ml-2"
            title="Remove"
          >
            x
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 mb-2 w-full">
        <input
          type="text"
          inputMode="numeric"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          className="flex-1 bg-gray-50 border border-gray-300 rounded px-2 py-1 text-sm text-gray-900 text-right focus:outline-none focus:border-blue-500"
        />
        <span className="text-gray-500 text-sm">{angleUnit}</span>
      </div>

      {/* Before/After Visualization */}
      <div className="flex items-center gap-2">
        {/* Before: Identity axes with rotation indicator */}
        <div className="flex flex-col items-center">
          <span className="text-xs text-gray-400 mb-1">Before</span>
          <AxisVisualizer
            quaternion={IDENTITY_QUATERNION}
            size={100}
            showOverlay={false}
            indicatorQuaternion={quaternion}
            cameraState={cameraState}
            onCameraChange={handleCameraChange}
          />
        </div>
        {/* After: Rotated axes without indicator */}
        <div className="flex flex-col items-center">
          <span className="text-xs text-gray-400 mb-1">After</span>
          <AxisVisualizer
            quaternion={quaternion}
            size={100}
            showOverlay={false}
            cameraState={cameraState}
            onCameraChange={handleCameraChange}
          />
        </div>
      </div>
    </div>
  );
}
