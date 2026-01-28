import { memo, useCallback, useMemo, useState } from 'react';
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
  onUpdate: (id: string, axis: Axis, angleDeg: number) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

const AXIS_OPTIONS: { value: Axis; label: string }[] = [
  { value: 'x', label: 'X axis' },
  { value: 'y', label: 'Y axis' },
  { value: 'z', label: 'Z axis' },
];

export const RotationStep = memo(function RotationStep({
  step,
  onUpdate,
  onRemove,
  canRemove,
}: RotationStepProps) {
  const { angleUnit } = useSettings();
  const [cameraState, setCameraState] = useState<CameraState>(DEFAULT_CAMERA);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  const handleCameraChange = useCallback((state: CameraState) => {
    setCameraState(state);
  }, []);

  const displayValue = useMemo(() => {
    const value =
      angleUnit === 'deg' ? step.angleDeg : (step.angleDeg * Math.PI) / 180;
    return formatNumber(value);
  }, [step.angleDeg, angleUnit]);

  const quaternion = useMemo(() => {
    return axisAngleToQuaternion(step.axis, step.angleDeg);
  }, [step.axis, step.angleDeg]);

  const handleInputFocus = () => {
    setIsEditing(true);
    setEditValue(displayValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value);
  };

  const handleInputBlur = () => {
    setIsEditing(false);
    const parsed = parseFloat(editValue);
    if (!Number.isNaN(parsed)) {
      // Convert to degrees if input is in radians
      const degValue = angleUnit === 'deg' ? parsed : (parsed * 180) / Math.PI;
      onUpdate(step.id, step.axis, degValue);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const degValue = parseFloat(e.target.value);
    onUpdate(step.id, step.axis, degValue);
  };

  const handleAxisChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate(step.id, e.target.value as Axis, step.angleDeg);
  };

  const handleRemove = () => {
    onRemove(step.id);
  };

  return (
    <div className="flex flex-col items-center bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
      <div className="flex justify-between items-start mb-2 w-full">
        <select
          value={step.axis}
          onChange={handleAxisChange}
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
            onClick={handleRemove}
            className="text-gray-400 hover:text-red-500 text-sm ml-2"
            title="Remove"
          >
            x
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 mb-1 w-full">
        <input
          type="text"
          inputMode="numeric"
          value={isEditing ? editValue : displayValue}
          onFocus={handleInputFocus}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          className="flex-1 bg-gray-50 border border-gray-300 rounded px-2 py-1 text-sm text-gray-900 text-right focus:outline-none focus:border-blue-500"
        />
        <span className="text-gray-500 text-sm">{angleUnit}</span>
      </div>

      <input
        type="range"
        min={-180}
        max={180}
        step={1}
        value={step.angleDeg}
        onChange={handleSliderChange}
        className="w-full mb-2 accent-blue-500"
      />

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
});
